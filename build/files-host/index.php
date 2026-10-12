<?php
/**
 * files.yallapp.com.tr: serves build files to clients through signed, expiring links.
 *
 * The platform signs each link when it shows it in the dashboard:
 *   sig = hex HMAC-SHA256(FILES_SIGNING_SECRET, "<path>?expires=<unix seconds>")
 * Files live outside the web root, in the folder the pipeline's FTP account writes to.
 * Settings come from config.php next to this file (see config.sample.php); it is not in git.
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

function yallapp_fail(int $status, string $message): void {
	http_response_code($status);
	header('Content-Type: text/plain; charset=utf-8');
	header('Cache-Control: no-store');
	echo $message;
	exit;
}

$path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!preg_match('#^/builds/([0-9a-f-]{36})/([A-Za-z0-9][A-Za-z0-9._-]{0,127})$#', $path, $parts)) {
	yallapp_fail(404, 'Not found.');
}

$expires = $_GET['expires'] ?? '';
$sig     = $_GET['sig'] ?? '';
if (!is_string($expires) || !is_string($sig) || !ctype_digit($expires) || !preg_match('/^[0-9a-f]{64}$/', $sig)) {
	yallapp_fail(403, 'This download link is not valid. Open it again from your Yallapp dashboard.');
}
$expected = hash_hmac('sha256', $path . '?expires=' . $expires, (string) $config['signing_secret']);
if (!hash_equals($expected, $sig)) {
	yallapp_fail(403, 'This download link is not valid. Open it again from your Yallapp dashboard.');
}
if ((int) $expires < time()) {
	yallapp_fail(410, 'This download link has expired. Open it again from your Yallapp dashboard.');
}

$root = realpath((string) $config['storage_dir']);
$file = realpath($root . '/builds/' . $parts[1] . '/' . $parts[2]);
if ($root === false || $file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) {
	yallapp_fail(404, 'This file is no longer available.');
}

$types = [
	'apk' => 'application/vnd.android.package-archive',
	'aab' => 'application/octet-stream',
	'ipa' => 'application/octet-stream',
	'zip' => 'application/zip',
];
$extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
header('Content-Type: ' . ($types[$extension] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($file));
header('Content-Disposition: attachment; filename="' . basename($file) . '"');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
readfile($file);
