<?php
/**
 * The media gate's settings. Copy to config.php next to index.php and fill in.
 * Never commit config.php.
 */
return array(
	// The same value as MEDIA_SIGNING_SECRET in Netlify. openssl rand -hex 32
	'signing_secret'  => '',
	// Absolute path of the folder that keeps the media files. Outside public_html,
	// writable by the account PHP runs as, on a disk with room for every plan's storage.
	'storage_dir'     => '/home/CPANEL_USER/yallapp-media',
	// The path the gate answers under: https://yallapp.com.tr/media/...
	'prefix'          => '/media',
	// Apache takes up to 7 MB a request on this host; the uploader sends 5 MB chunks.
	'max_chunk_bytes' => 6291456,
	// true once mod_xsendfile is installed (XSendFile On, XSendFilePath the storage_dir):
	// Apache then sends the files and answers range requests itself.
	'x_sendfile'      => false,
	// Only when the gate is on another address than the dashboard (a subdomain):
	// the dashboard's origin, e.g. https://yallapp.com.tr (www.yallapp.com.tr is then
	// allowed too; several may be listed, separated by commas). Empty: same address, no CORS.
	'allowed_origin'  => '',
);
