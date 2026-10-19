<?php
/**
 * Screenshots and screen recording in the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

/**
 * 53 What the app protects from screenshots and screen recording (`Config.app.screen_protection`):
 * `off`, `content` (course content only: lessons, quizzes, their attachments and videos) or
 * `app` (every screen). The owner's choice on the Yallapp dashboard (`LicenseStatus.screen_protection`)
 * wins; without one, the plugin's "Block screenshots & screen recording" and, for academies,
 * what it protects. Pure.
 */
class Screen_Protection {

	/**
	 * The modes the app knows.
	 */
	const MODES = array( 'off', 'content', 'app' );

	/**
	 * The dashboard's choice as the license status carries it, or null (none, or not understood).
	 *
	 * @param mixed $value `LicenseStatus.screen_protection`.
	 * @return string|null
	 */
	public static function from_status( $value ) {
		return is_string( $value ) && in_array( $value, self::MODES, true ) ? $value : null;
	}

	/**
	 * The mode the app gets.
	 *
	 * @param string|null $platform The dashboard's choice, or null.
	 * @param bool        $enabled  The plugin's "Block screenshots & screen recording".
	 * @param string      $scope    The plugin's choice of what it protects: `content` or `app`.
	 * @param bool        $academy  Whether the app is an academy (others have no course content of their own).
	 * @return string off|content|app
	 */
	public static function mode( $platform, $enabled, $scope, $academy ) {
		$platform = self::from_status( $platform );
		if ( null !== $platform ) {
			return $platform;
		}
		if ( ! $enabled ) {
			return 'off';
		}
		return $academy && 'app' !== $scope ? 'content' : 'app';
	}
}
