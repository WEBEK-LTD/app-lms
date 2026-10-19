<?php
/**
 * The media gate (roadmap 51): owners' videos, pictures and PDFs on Yallapp's own
 * server. Apache answers https://yallapp.com.tr/media/* with this script (the
 * reverse proxy passes everything else to the platform, deploy/apache-proxy.conf),
 * so uploads and playback never go through the platform's functions.
 *
 * Every request carries a link the platform signed (src/lib/media/signing.ts):
 *   /media/<op>/<app id>/<media id>.<ext>?expires=<unix seconds>[&size=<bytes>][&dl=1]&sig=<hex>
 *   sig = hex HMAC-SHA256(secret, "/<op>/<app id>/<file>?<the other parameters sorted, key=value joined by &>")
 * - v  GET or HEAD: the file, with range requests (video players seek with them).
 * - u  HEAD: how much has arrived (Upload-Offset). PUT: the next chunk at Upload-Offset;
 *      never past `size` in all, at most max_chunk_bytes a request. The last one completes it.
 * - s  GET: what's on disk, as JSON (the platform's check after an upload).
 * - d  DELETE: removes the file and an unfinished upload.
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
);

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
		header('Access-Control-Allow-Methods: GET, HEAD, PUT, DELETE');
		header('Access-Control-Allow-Headers: Upload-Offset, Content-Type, Range');
		header('Access-Control-Expose-Headers: Upload-Offset, Upload-Length, Content-Range, Content-Length');
		header('Access-Control-Max-Age: 3600');
		header('Vary: Origin');
	}
}

media_cors($config);
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') {
	http_response_code(204);
	exit;
}

$prefix = rtrim((string) ($config['prefix'] ?? '/media'), '/');
$uri    = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
if ($prefix !== '' && strpos($uri, $prefix . '/') !== 0) {
	media_fail(404, 'Not found.');
}
$path = substr($uri, strlen($prefix));
$uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
if (!preg_match('#^/(v|u|s|d)/(' . $uuid . ')/(' . $uuid . ')\.(mp4|mov|webm|jpg|png|webp|gif|pdf)$#', $path, $m)) {
	media_fail(404, 'Not found.');
}
list(, $op, $app_id, $media_id, $ext) = $m;

// The signature: every parameter but sig, sorted, digits only.
$params = array();
parse_str((string) ($_SERVER['QUERY_STRING'] ?? ''), $params);
$sig = $params['sig'] ?? '';
unset($params['sig']);
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

$root = realpath((string) $config['storage_dir']);
if ($root === false || !is_dir($root)) {
	media_fail(503, 'Media storage is not available.');
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
	if (($params['dl'] ?? '') === '1') {
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

if ($op === 'u' && in_array($method, array('HEAD', 'GET', 'PUT'), true)) {
	$total = isset($params['size']) ? (int) $params['size'] : 0;
	if ($total < 1) {
		media_fail(403, 'This link is not valid.');
	}
	header('Cache-Control: no-store');
	header('Upload-Length: ' . $total);
	$done = media_size($file);
	$have = $done ?? (media_size($part) ?? 0);
	if ($method !== 'PUT') {
		header('Upload-Offset: ' . $have);
		http_response_code(200);
		exit;
	}
	$offset = (string) ($_SERVER['HTTP_UPLOAD_OFFSET'] ?? '');
	$length = (string) ($_SERVER['CONTENT_LENGTH'] ?? '');
	if ($done !== null || !ctype_digit($offset) || (int) $offset !== $have) {
		header('Upload-Offset: ' . $have);
		media_fail(409, 'The upload is elsewhere.', array('Upload-Offset' => (string) $have));
	}
	if (!ctype_digit($length) || (int) $length < 1) {
		media_fail(400, 'Send the chunk with its length.', array('Upload-Offset' => (string) $have));
	}
	$max = (int) ($config['max_chunk_bytes'] ?? 6291456);
	if ((int) $length > $max || $have + (int) $length > $total) {
		media_fail(413, 'This chunk is too big.', array('Upload-Offset' => (string) $have));
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
		media_fail(409, 'The upload is elsewhere.', array('Upload-Offset' => (string) filesize($part)));
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
		media_fail(400, 'The chunk didn\'t arrive whole.', array('Upload-Offset' => (string) $have));
	}
	flock($out, LOCK_UN);
	fclose($out);
	$now_at = $have + $written;
	if ($now_at === $total) {
		rename($part, $file);
	}
	header('Upload-Offset: ' . $now_at);
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
