<?php
/**
 * Copy to config.php on the server and fill in. Never commit config.php.
 */
return [
	// The same value as FILES_SIGNING_SECRET in Netlify. openssl rand -hex 32
	'signing_secret' => '',
	// Absolute path of the folder the pipeline's FTP account writes to. Outside public_html.
	'storage_dir'    => '/home/CPANEL_USER/yallapp-files',
];
