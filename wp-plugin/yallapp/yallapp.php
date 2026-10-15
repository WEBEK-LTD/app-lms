<?php
/**
 * Plugin Name:       Yallapp
 * Plugin URI:        https://yallapp.com.tr
 * Description:       Connects your WordPress academy to your Yallapp mobile apps.
 * Version:           0.4.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Yallapp
 * Author URI:        https://yallapp.com.tr
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       yallapp
 *
 * @package Yallapp
 */

defined( 'ABSPATH' ) || exit;

define( 'YALLAPP_VERSION', '0.4.0' );
define( 'YALLAPP_FILE', __FILE__ );
define( 'YALLAPP_DIR', plugin_dir_path( __FILE__ ) );

require_once YALLAPP_DIR . 'includes/class-autoloader.php';
Yallapp\Autoloader::register();

register_activation_hook( __FILE__, array( 'Yallapp\Installer', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Yallapp\Installer', 'deactivate' ) );

add_action(
	'plugins_loaded',
	static function () {
		Yallapp\Plugin::instance()->boot();
	},
	20
);
