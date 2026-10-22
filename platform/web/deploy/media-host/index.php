<?php
/**
 * The media gate (roadmap 51): owners' videos, pictures and PDFs on Yallapp's own
 * server. Apache answers https://yallapp.com.tr/media/* with this script (the
 * reverse proxy passes everything else to the platform, deploy/apache-proxy.conf),
 * so uploads and playback never go through the platform's functions.
 *
 * Every request carries a link the platform signed (src/lib/media/signing.ts):
 *   /media/<op>/<app id>/<media id>/<ext>?expires=<unix seconds>[&size=<bytes>][&dl=1]&sig=<hex>
 *   sig = hex HMAC-SHA256(secret, "/<op>/<app id>/<media id>/<ext>?<the other parameters sorted, key=value joined by &>")
 * 64b The extension is a path segment of its own: LiteSpeed or nginx in front of PHP answer
 * paths ending in .mp4, .jpg… as static files (404) and never pass them here. Links signed
 * before, /<op>/<app id>/<media id>.<ext>, still work (the signature covers the path as sent).
 * - v  GET or HEAD: the file, with range requests (video players seek with them).
 * - u  HEAD: how much has arrived (Upload-Offset). PUT: the next chunk at Upload-Offset;
 *      never past `size` in all, at most max_chunk_bytes a request. The last one completes it.
 *      64b POST does the same as PUT, with any Content-Type, and answers 200 with
 *      {"offset":N} as well as the header (server firewalls often refuse PUT and unusual
 *      content types). GET answers {"offset":N,"length":size} too. The offset may come as
 *      `&offset=N` in the query instead of the header (some proxies drop unknown headers);
 *      it isn't part of the signature. A refused chunk answers {"offset":N,"message":…}.
 * - s  GET: what's on disk, as JSON (the platform's check after an upload).
 * - d  DELETE: removes the file and an unfinished upload.
 * 62 On an app's whole folder:
 *   /media/a/<app id>?expires=…&sig=…  DELETE: removes the folder and every file in it (an app
 *                                      that no longer exists, src/lib/media/sweep.ts).
 *   /media/l/apps?expires=…&sig=…      GET: the app folders on disk, as JSON {"apps": [...]}.
 * 62 A `v` link for one student carries `t`: the first 52 bits of SHA-256 of their access token,
 * as digits. It plays only to a request with `Authorization: Bearer <that token>` (the app sends
 * it; Apache passes the header to PHP with `CGIPassAuth On`, or 64b on LiteSpeed with
 * `SetEnvIf Authorization "(.+)" HTTP_AUTHORIZATION=$1`, docs/LAUNCH-CHECKLIST.md 7j).
 * Files live outside the web root, in storage_dir/<app id>/<media id>.<ext> (an upload
 * in progress as .part). Settings come from config.php (config.sample.php); it is not in git.
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

const MEDIA_TYPES = array(
	'mp4'  => 'video/mp4',
	'mov'  => 'video/quicktime',
	'webm' => 'video/webm',
	'jpg'  => 'image/jpeg',
	'png'  => 'image/png',
	'webp' => 'image/webp',
	'gif'  => 'image/gif',
	'pdf'  => 'application/pdf',
	// 77 Voice messages and documents sent in the chat.
	'm4a'  => 'audio/mp4',
	'mp3'  => 'audio/mpeg',
	'aac'  => 'audio/aac',
	'doc'  => 'application/msword',
	'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'xls'  => 'application/vnd.ms-excel',
	'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'ppt'  => 'application/vnd.ms-powerpoint',
	'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'txt'  => 'text/plain',
);

/** 77 Documents are always saved, never opened in the browser. */
const MEDIA_DOWNLOAD_ONLY = array('doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt');

function media_fail(int $status, string $message, array $headers = array()): void {
	http_response_code($status);
	header('Content-Type: text/plain; charset=utf-8');
	header('Cache-Control: no-store');
	foreach ($headers as $name => $value) {
		header($name . ': ' . $value);
	}
	echo $message;
	exit;
}

function media_cors(array $config): void {
	$origin = (string) ($config['allowed_origin'] ?? '');
	if ($origin !== '' && ($_SERVER['HTTP_ORIGIN'] ?? '') === $origin) {
		header('Access-Control-Allow-Origin: ' . $origin);
		header('Access-Control-Allow-Methods: GET, HEAD, PUT, POST, DELETE');
		header('Access-Control-Allow-Headers: Upload-Offset, Content-Type, Range');
		header('Access-Control-Expose-Headers: Upload-Offset, Upload-Length, Content-Range, Content-Length');
		header('Access-Control-Max-Age: 3600');
		header('Vary: Origin');
	}
}

// 64b Which gate answered: an old index.php left on the server is told apart from this one.
header('X-Yallapp-Media-Gate: 2');
media_cors($config);
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') {
	http_response_code(204);
	exit;
}

$prefix = rtrim((string) ($config['prefix'] ?? '/media'), '/');
// 64b The address the visitor asked for. Some servers hand PHP the rewritten one
// (…/index.php) in REQUEST_URI and keep the original elsewhere: the first that is
// under the prefix and isn't this script wins.
$uri = '';
foreach (array('REQUEST_URI', 'REDIRECT_URL', 'UNENCODED_URL', 'HTTP_X_ORIGINAL_URL', 'HTTP_X_REWRITE_URL') as $source) {
	$candidate = (string) parse_url((string) ($_SERVER[$source] ?? ''), PHP_URL_PATH);
	if ($candidate !== '' && ($prefix === '' || strpos($candidate, $prefix . '/') === 0) && $candidate !== $prefix . '/index.php') {
		$uri = $candidate;
		break;
	}
}
if ($uri === '') {
	media_fail(404, 'Not found.');
}
$path = substr($uri, strlen($prefix));
// 64b A check anyone may open: this gate is installed and sees the path as sent.
if ($path === '/ping' && ($method === 'GET' || $method === 'HEAD')) {
	header('Content-Type: text/plain; charset=utf-8');
	header('Cache-Control: no-store');
	echo "Yallapp media gate 3\n";
	exit;
}
$uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
$media_id = '';
$ext      = '';
if (preg_match('#^/(v|u|s|d)/(' . $uuid . ')/(' . $uuid . ')[./](mp4|mov|webm|jpg|png|webp|gif|pdf|m4a|mp3|aac|doc|docx|xls|xlsx|ppt|pptx|txt)$#', $path, $m)) {
	list(, $op, $app_id, $media_id, $ext) = $m;
} elseif (preg_match('#^/a/(' . $uuid . ')$#', $path, $m)) {
	$op     = 'a';
	$app_id = $m[1];
} elseif ($path === '/l/apps') {
	$op     = 'l';
	$app_id = '';
} else {
	media_fail(404, 'Not found.');
}

// The signature: every parameter but sig, sorted, digits only.
$params = array();
parse_str((string) ($_SERVER['QUERY_STRING'] ?? ''), $params);
$sig = $params['sig'] ?? '';
unset($params['sig']);
// 64b Where a chunk goes, when a proxy drops the Upload-Offset header: not signed.
$query_offset = isset($params['offset']) && is_string($params['offset']) ? $params['offset'] : '';
unset($params['offset']);
if (!is_string($sig) || !preg_match('/^[0-9a-f]{64}$/', $sig) || !isset($params['expires'])) {
	media_fail(403, 'This link is not valid.');
}
foreach ($params as $key => $value) {
	if (!is_string($key) || !is_string($value) || !preg_match('/^[a-z]{1,16}$/', $key) || !ctype_digit($value)) {
		media_fail(403, 'This link is not valid.');
	}
}
ksort($params, SORT_STRING);
$pairs = array();
foreach ($params as $key => $value) {
	$pairs[] = rawurlencode($key) . '=' . rawurlencode($value);
}
$expected = hash_hmac('sha256', $path . '?' . implode('&', $pairs), (string) $config['signing_secret']);
if (!hash_equals($expected, $sig)) {
	media_fail(403, 'This link is not valid.');
}
if ((int) $params['expires'] < time()) {
	media_fail(410, 'This link has expired.');
}
// 62 A link for one student: the request must carry their access token.
if (isset($params['t'])) {
	$auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
	if ($auth === '' && function_exists('getallheaders')) {
		foreach (getallheaders() as $name => $value) {
			if (strtolower((string) $name) === 'authorization') {
				$auth = (string) $value;
			}
		}
	}
	$digest = preg_match('/^Bearer\s+(\S+)$/i', trim($auth), $b) ? (string) hexdec(substr(hash('sha256', $b[1]), 0, 13)) : '';
	if ($digest === '' || !hash_equals($digest, (string) $params['t'])) {
		media_fail(403, 'This link is for another student.');
	}
}

$root = realpath((string) $config['storage_dir']);
if ($root === false || !is_dir($root)) {
	media_fail(503, 'Media storage is not available.');
}
// 62 An app's folder: removed with everything in it, or the list of folders.
if ($op === 'l' && $method === 'GET') {
	$apps = array();
	foreach ((array) scandir($root) as $name) {
		if (is_string($name) && preg_match('#^' . $uuid . '$#', $name) && is_dir($root . DIRECTORY_SEPARATOR . $name)) {
			$apps[] = $name;
		}
	}
	header('Content-Type: application/json');
	header('Cache-Control: no-store');
	echo json_encode(array('apps' => $apps));
	exit;
}
if ($op === 'a' && $method === 'DELETE') {
	$folder = $root . DIRECTORY_SEPARATOR . $app_id;
	if (is_dir($folder)) {
		foreach ((array) scandir($folder) as $name) {
			$entry = $folder . DIRECTORY_SEPARATOR . $name;
			if (is_string($name) && $name !== '.' && $name !== '..' && is_file($entry)) {
				unlink($entry);
			}
		}
		rmdir($folder);
	}
	http_response_code(204);
	header('Cache-Control: no-store');
	exit;
}
if ($op === 'a' || $op === 'l') {
	media_fail(405, 'Method not allowed.');
}

$dir  = $root . DIRECTORY_SEPARATOR . $app_id;
$file = $dir . DIRECTORY_SEPARATOR . $media_id . '.' . $ext;
$part = $file . '.part';

function media_size(string $file): ?int {
	clearstatcache(true, $file);
	return is_file($file) ? (int) filesize($file) : null;
}

if ($op === 'v' && ($method === 'GET' || $method === 'HEAD')) {
	$size = media_size($file);
	if ($size === null) {
		media_fail(404, 'This file is no longer available.');
	}
	$start = 0;
	$end   = $size - 1;
	$range = (string) ($_SERVER['HTTP_RANGE'] ?? '');
	$partial = false;
	if ($range !== '') {
		if (!preg_match('/^bytes=(\d*)-(\d*)$/', trim($range), $r) || ($r[1] === '' && $r[2] === '')) {
			media_fail(416, 'Range not satisfiable.', array('Content-Range' => 'bytes */' . $size));
		}
		if ($r[1] === '') {
			$suffix = (int) $r[2];
			if ($suffix === 0) {
				media_fail(416, 'Range not satisfiable.', array('Content-Range' => 'bytes */' . $size));
			}
			$start = max(0, $size - $suffix);
		} else {
			$start = (int) $r[1];
			$end   = $r[2] === '' ? $size - 1 : min((int) $r[2], $size - 1);
		}
		if ($start >= $size || $start > $end) {
			media_fail(416, 'Range not satisfiable.', array('Content-Range' => 'bytes */' . $size));
		}
		$partial = true;
	}
	header('Content-Type: ' . MEDIA_TYPES[$ext]);
	header('Accept-Ranges: bytes');
	header('Cache-Control: private, max-age=3600');
	header('X-Content-Type-Options: nosniff');
	header('Referrer-Policy: no-referrer');
	header("Content-Security-Policy: default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox");
	if (($params['dl'] ?? '') === '1' || in_array($ext, MEDIA_DOWNLOAD_ONLY, true)) {
		header('Content-Disposition: attachment; filename="' . $media_id . '.' . $ext . '"');
	}
	// With mod_xsendfile, Apache sends the file (and answers ranges) itself.
	if (!empty($config['x_sendfile'])) {
		header('X-Sendfile: ' . $file);
		exit;
	}
	if ($partial) {
		http_response_code(206);
		header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
	}
	header('Content-Length: ' . ($size === 0 ? 0 : $end - $start + 1));
	if ($method === 'HEAD' || $size === 0) {
		exit;
	}
	set_time_limit(0);
	while (ob_get_level() > 0) {
		ob_end_clean();
	}
	$in = fopen($file, 'rb');
	if ($in === false) {
		exit;
	}
	fseek($in, $start);
	$left = $end - $start + 1;
	while ($left > 0 && !feof($in) && connection_status() === CONNECTION_NORMAL) {
		$chunk = fread($in, (int) min(262144, $left));
		if ($chunk === false || $chunk === '') {
			break;
		}
		echo $chunk;
		flush();
		$left -= strlen($chunk);
	}
	fclose($in);
	exit;
}

/** 64b A chunk refused, with where the upload stands: in the header and in a small JSON body. */
function media_refuse(int $status, int $offset, string $message): void {
	http_response_code($status);
	header('Content-Type: application/json');
	header('Cache-Control: no-store');
	header('Upload-Offset: ' . $offset);
	echo json_encode(array('offset' => $offset, 'message' => $message));
	exit;
}

if ($op === 'u' && in_array($method, array('HEAD', 'GET', 'PUT', 'POST'), true)) {
	$total = isset($params['size']) ? (int) $params['size'] : 0;
	if ($total < 1) {
		media_fail(403, 'This link is not valid.');
	}
	header('Cache-Control: no-store');
	header('Upload-Length: ' . $total);
	$done = media_size($file);
	$have = $done ?? (media_size($part) ?? 0);
	if ($method === 'HEAD' || $method === 'GET') {
		header('Upload-Offset: ' . $have);
		http_response_code(200);
		if ($method === 'GET') {
			header('Content-Type: application/json');
			echo json_encode(array('offset' => $have, 'length' => $total));
		}
		exit;
	}
	// 64b The header, else the query's `offset` (a proxy may drop the header).
	$offset = (string) ($_SERVER['HTTP_UPLOAD_OFFSET'] ?? '');
	if (!ctype_digit($offset)) {
		$offset = $query_offset;
	}
	$length = (string) ($_SERVER['CONTENT_LENGTH'] ?? '');
	if ($done !== null || !ctype_digit($offset) || (int) $offset !== $have) {
		media_refuse(409, $have, 'The upload is elsewhere.');
	}
	if (!ctype_digit($length) || (int) $length < 1) {
		media_refuse(400, $have, 'Send the chunk with its length.');
	}
	$max = (int) ($config['max_chunk_bytes'] ?? 6291456);
	if ((int) $length > $max || $have + (int) $length > $total) {
		media_refuse(413, $have, 'This chunk is too big.');
	}
	if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
		media_fail(503, 'Media storage is not available.');
	}
	// The chunk goes straight from the request to the file, 256 KB at a time.
	$in  = fopen('php://input', 'rb');
	$out = fopen($part, 'ab');
	if ($in === false || $out === false || !flock($out, LOCK_EX)) {
		media_fail(503, 'Media storage is not available.');
	}
	clearstatcache(true, $part);
	if ((int) filesize($part) !== $have) {
		flock($out, LOCK_UN);
		fclose($out);
		media_refuse(409, (int) filesize($part), 'The upload is elsewhere.');
	}
	set_time_limit(0);
	$written = 0;
	$limit   = (int) $length;
	while (!feof($in)) {
		$chunk = fread($in, 262144);
		if ($chunk === false || $chunk === '') {
			break;
		}
		$written += strlen($chunk);
		if ($written > $limit) {
			break;
		}
		fwrite($out, $chunk);
	}
	fflush($out);
	if ($written !== $limit) {
		// A broken chunk is cut off, so the next try starts where this one did.
		ftruncate($out, $have);
		flock($out, LOCK_UN);
		fclose($out);
		media_refuse(400, $have, 'The chunk didn\'t arrive whole.');
	}
	flock($out, LOCK_UN);
	fclose($out);
	$now_at = $have + $written;
	if ($now_at === $total) {
		rename($part, $file);
	}
	header('Upload-Offset: ' . $now_at);
	// PUT as before (older uploaders wait for 204); 64b POST answers with the offset in JSON too.
	if ($method === 'POST') {
		http_response_code(200);
		header('Content-Type: application/json');
		echo json_encode(array('offset' => $now_at));
		exit;
	}
	http_response_code(204);
	exit;
}

if ($op === 's' && $method === 'GET') {
	$done = media_size($file);
	$have = media_size($part);
	header('Content-Type: application/json');
	header('Cache-Control: no-store');
	echo json_encode(
		array(
			'exists'   => $done !== null || $have !== null,
			'complete' => $done !== null,
			'size'     => $done ?? ($have ?? 0),
		)
	);
	exit;
}

if ($op === 'd' && $method === 'DELETE') {
	foreach (array($file, $part) as $target) {
		if (is_file($target)) {
			unlink($target);
		}
	}
	http_response_code(204);
	header('Cache-Control: no-store');
	exit;
}

media_fail(405, 'Method not allowed.');
