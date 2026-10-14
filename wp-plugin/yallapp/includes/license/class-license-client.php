<?php
/**
 * License checks and plugin updates from yallapp.com.tr.
 *
 * @package Yallapp
 */

namespace Yallapp\License;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use Yallapp\Detector;
use Yallapp\Settings;

/**
 * Talks to the platform API in docs/api/platform.yaml.
 *
 * Only the site URL, plugin version, WordPress version and LMS are sent, plus, for sign-in codes
 * sent by Yallapp, the phone number and the code to deliver (the platform keeps neither).
 * Enforcement is off until the platform is live: define YALLAPP_ENFORCE_LICENSE as true to turn it on.
 */
class License_Client {

	/**
	 * Plan features the platform may report (docs/api/platform.yaml, LicenseStatus).
	 */
	const FEATURES = array( 'push', 'offline_downloads', 'auto_publish', 'ios', 'page_editor', 'card_payments', 'auto_rebuild' );

	/**
	 * App types (`LicenseStatus.app_type`) and kinds of business (`LicenseStatus.vertical`) the platform may send.
	 */
	const APP_TYPES = array( 'lms', 'store', 'booking', 'real_estate', 'news' );
	const VERTICALS = array( 'restaurant', 'clinic', 'fitness', 'charity' );

	const STATUS_OPTION = 'yallapp_license';
	const CHECK_HOOK    = 'yallapp_license_check';
	const GRACE         = 259200;
	const DEFAULT_URL   = 'https://yallapp.com.tr/api/v1';

	/**
	 * Settings.
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Detector.
	 *
	 * @var Detector
	 */
	private $detector;

	/**
	 * Constructor.
	 *
	 * @param Settings $settings Settings.
	 * @param Detector $detector Detector.
	 */
	public function __construct( Settings $settings, Detector $detector ) {
		$this->settings = $settings;
		$this->detector = $detector;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( self::CHECK_HOOK, array( $this, 'check' ) );
		add_action( 'init', array( $this, 'schedule' ) );
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'inject_update' ) );
		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 10, 3 );
	}

	/**
	 * Schedules the 12-hour check.
	 *
	 * @return void
	 */
	public function schedule() {
		if ( ! wp_next_scheduled( self::CHECK_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'twicedaily', self::CHECK_HOOK );
		}
	}

	/**
	 * Whether a license key is saved.
	 *
	 * @return bool
	 */
	public function has_key() {
		return '' !== (string) $this->settings->get( 'license_key' );
	}

	/**
	 * Asks the platform to deliver a sign-in code on WhatsApp (docs/api/platform.yaml, sendSignInCode).
	 *
	 * @param string $phone Phone number (E.164).
	 * @param string $code  The code this site made.
	 * @return true|WP_Error Error codes from the platform: `rate_limited` (with `retry_after_seconds`),
	 *                       `license_inactive`, `license_not_found`, `invalid_phone`, `provider_error`, …
	 */
	public function send_code( $phone, $code ) {
		return $this->send_sign_in_code( array( 'phone' => (string) $phone ), $code );
	}

	/**
	 * Asks the platform to email a sign-in code (sendSignInCode with `channel: email`): from the
	 * app owner's own email server when they set one in the Yallapp dashboard, else Yallapp's.
	 *
	 * @param string $email Email address.
	 * @param string $code  The code this site made.
	 * @return true|WP_Error The platform's error codes, as for send_code() (`invalid_email` instead of `invalid_phone`).
	 */
	public function send_email_code( $email, $code ) {
		return $this->send_sign_in_code(
			array(
				'channel' => 'email',
				'email'   => (string) $email,
			),
			$code
		);
	}

	/**
	 * POST /sign-in-codes/send.
	 *
	 * @param array  $to   `phone`, or `channel` and `email`.
	 * @param string $code The code this site made.
	 * @return true|WP_Error
	 */
	private function send_sign_in_code( array $to, $code ) {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return new WP_Error( 'license_missing', __( 'Activate your Yallapp license to send sign-in codes.', 'yallapp' ) );
		}
		// The platform names the app the license belongs to; this name is used only until that app has one.
		$name = trim( (string) $this->settings->get( 'app_name' ) );
		if ( '' === $name ) {
			$name = wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES );
		}
		$result = $this->call(
			'POST',
			'/sign-in-codes/send',
			array_merge(
				$this->site_info( $key ),
				$to,
				array(
					'code'     => (string) $code,
					'app_name' => mb_substr( $name, 0, 60 ),
				)
			)
		);
		return is_wp_error( $result ) ? $result : true;
	}

	/**
	 * Whether license checks block the app API.
	 *
	 * @return bool
	 */
	public static function enforced() {
		return defined( 'YALLAPP_ENFORCE_LICENSE' ) && YALLAPP_ENFORCE_LICENSE;
	}

	/**
	 * Whether the app API may serve requests.
	 *
	 * @return bool
	 */
	public function allows_api() {
		return ! self::enforced() || $this->is_active();
	}

	/**
	 * Whether the app's plan includes a feature (`push`, `offline_downloads`, …). Without
	 * license enforcement every feature is on; with it, only an active license's features.
	 *
	 * @param string $feature Feature.
	 * @return bool
	 */
	public function has_feature( $feature ) {
		if ( ! self::enforced() ) {
			return true;
		}
		return $this->is_active() && in_array( $feature, (array) $this->status()['features'], true );
	}

	/**
	 * Whether the license is active, allowing the grace period after the last successful check.
	 *
	 * @return bool
	 */
	public function is_active() {
		$status = $this->status();
		return 'active' === $status['status'] && time() - (int) $status['contacted_at'] <= self::GRACE;
	}

	/**
	 * The last known status.
	 *
	 * @return array{status: string, plan: string|null, features: string[], sign_in_methods: string[]|null, email_sign_in: string|null, app_type: string|null, vertical: string|null, expires_at: string|null, checked_at: string|null, message: string|null, contacted_at: int}
	 */
	public function status() {
		$stored = get_option( self::STATUS_OPTION, array() );
		return array_merge(
			array(
				'status'          => '' === (string) $this->settings->get( 'license_key' ) ? 'none' : 'invalid',
				'plan'            => null,
				'features'        => array(),
				'sign_in_methods' => null,
				'email_sign_in'   => null,
				'app_type'        => null,
				'vertical'        => null,
				'expires_at'      => null,
				'checked_at'      => null,
				'message'         => null,
				'contacted_at'    => 0,
			),
			is_array( $stored ) ? $stored : array()
		);
	}

	/**
	 * Activates a key on this site.
	 *
	 * @param string $key License key.
	 * @return array|WP_Error Status.
	 */
	public function activate( $key ) {
		$key = strtoupper( sanitize_text_field( $key ) );
		if ( '' === $key ) {
			return new WP_Error( 'invalid_request', __( 'Enter your license key.', 'yallapp' ) );
		}
		$result = $this->call( 'POST', '/licenses/activate', $this->site_info( $key ) );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$this->settings->update( array( 'license_key' => $key ) );
		$status = $this->save_status( $result );
		/**
		 * Fires after a license key is activated on this site.
		 *
		 * @param array $status The saved status.
		 */
		do_action( 'yallapp_license_activated', $status );
		return $status;
	}

	/**
	 * Re-checks the saved key. Runs in cron.
	 *
	 * @return array|WP_Error Status.
	 */
	public function check() {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return $this->status();
		}
		$result = $this->call( 'POST', '/licenses/check', $this->site_info( $key ) );
		if ( is_wp_error( $result ) ) {
			// 404 means the key is gone. Network failures keep the last status for the grace period.
			if ( 'license_not_found' === $result->get_error_code() ) {
				$this->save_status(
					array(
						'status'  => 'invalid',
						'message' => $result->get_error_message(),
					)
				);
			}
			return $result;
		}
		return $this->save_status( $result );
	}

	/**
	 * Releases the key from this site.
	 *
	 * @return void
	 */
	public function deactivate() {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' !== $key ) {
			$this->call(
				'POST',
				'/licenses/deactivate',
				array(
					'license_key' => $key,
					'site_url'    => home_url( '/' ),
				)
			);
		}
		$this->settings->update( array( 'license_key' => '' ) );
		delete_option( self::STATUS_OPTION );
		/**
		 * Fires after the license key is released from this site.
		 */
		do_action( 'yallapp_license_deactivated' );
	}

	/**
	 * Adds a newer Yallapp version to the WordPress update list.
	 *
	 * @param object $transient Update transient.
	 * @return object
	 */
	public function inject_update( $transient ) {
		if ( ! is_object( $transient ) || empty( $transient->checked ) ) {
			return $transient;
		}
		$release = $this->release();
		if ( $release && version_compare( $release['version'], YALLAPP_VERSION, '>' ) ) {
			$basename                         = plugin_basename( YALLAPP_FILE );
			$transient->response[ $basename ] = (object) array(
				'slug'         => 'yallapp',
				'plugin'       => $basename,
				'new_version'  => $release['version'],
				'package'      => $release['download_url'],
				'url'          => 'https://yallapp.com.tr',
				'requires'     => $release['requires'],
				'requires_php' => $release['requires_php'],
				'tested'       => $release['tested'],
			);
		}
		return $transient;
	}

	/**
	 * Details for the "View version details" screen.
	 *
	 * @param false|object|array $result Result so far.
	 * @param string             $action API action.
	 * @param object             $args   Arguments.
	 * @return false|object|array
	 */
	public function plugin_info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || 'yallapp' !== ( $args->slug ?? '' ) ) {
			return $result;
		}
		$release = $this->release();
		if ( ! $release ) {
			return $result;
		}
		return (object) array(
			'name'          => 'Yallapp',
			'slug'          => 'yallapp',
			'version'       => $release['version'],
			'author'        => '<a href="https://yallapp.com.tr">WEBEK LTD</a>',
			'homepage'      => 'https://yallapp.com.tr',
			'requires'      => $release['requires'],
			'requires_php'  => $release['requires_php'],
			'tested'        => $release['tested'],
			'download_link' => $release['download_url'],
			'sections'      => array( 'changelog' => wp_kses_post( (string) ( $release['changelog_html'] ?? '' ) ) ),
		);
	}

	/**
	 * The latest release, cached for 12 hours.
	 *
	 * @return array|null
	 */
	private function release() {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key || ! $this->is_active() ) {
			return null;
		}
		$cached = get_transient( 'yallapp_release' );
		if ( is_array( $cached ) ) {
			return $cached ? $cached : null;
		}
		$result  = $this->call(
			'GET',
			'/plugin/update?' . http_build_query(
				array(
					'license_key' => $key,
					'site_url'    => home_url( '/' ),
					'version'     => YALLAPP_VERSION,
				)
			)
		);
		$release = is_array( $result ) && ! empty( $result['version'] ) && ! empty( $result['download_url'] ) ? $result : array();
		set_transient( 'yallapp_release', $release, 12 * HOUR_IN_SECONDS );
		return $release ? $release : null;
	}

	/**
	 * Saves a status from the platform.
	 *
	 * @param array $result LicenseStatus.
	 * @return array
	 */
	private function save_status( array $result ) {
		$allowed  = array( 'active', 'expired', 'suspended', 'invalid' );
		$features = array_values( array_intersect( (array) ( $result['features'] ?? array() ), self::FEATURES ) );
		$app      = self::app_of( $result );
		$methods  = isset( $result['sign_in_methods'] ) && is_array( $result['sign_in_methods'] ) ? array_values( array_intersect( array( 'phone', 'email' ), $result['sign_in_methods'] ) ) : array();
		$status   = array(
			'status'          => in_array( $result['status'] ?? '', $allowed, true ) ? $result['status'] : 'invalid',
			'plan'            => in_array( $result['plan'] ?? null, array( 'starter', 'growth', 'pro', 'business' ), true ) ? $result['plan'] : null,
			'features'        => $features,
			// How people sign in, as the owner chose on the dashboard; null: the plugin setting applies.
			'sign_in_methods' => $methods ? $methods : null,
			// How email sign-in works (a code, or the password), as the owner chose; null: the plugin setting.
			'email_sign_in'   => in_array( $result['email_sign_in'] ?? null, array( 'code', 'password' ), true ) ? $result['email_sign_in'] : null,
			// The app's type and kind of business, as the owner chose them; null when unknown.
			'app_type'        => $app['app_type'],
			'vertical'        => $app['vertical'],
			'expires_at'      => isset( $result['expires_at'] ) ? sanitize_text_field( (string) $result['expires_at'] ) : null,
			'checked_at'      => gmdate( 'c' ),
			'message'         => isset( $result['message'] ) ? sanitize_text_field( (string) $result['message'] ) : null,
			'contacted_at'    => time(),
		);
		update_option( self::STATUS_OPTION, $status, false );
		delete_transient( 'yallapp_release' );
		return $status;
	}

	/**
	 * The app's type and kind of business, as the owner chose them in the dashboard. Unknown
	 * values (a newer platform) and older platforms that don't send them are null. Pure.
	 *
	 * @param array $result License status from the platform.
	 * @return array{app_type: string|null, vertical: string|null}
	 */
	public static function app_of( array $result ) {
		$type     = $result['app_type'] ?? null;
		$vertical = $result['vertical'] ?? null;
		return array(
			'app_type' => in_array( $type, self::APP_TYPES, true ) ? $type : null,
			'vertical' => in_array( $vertical, self::VERTICALS, true ) ? $vertical : null,
		);
	}

	/**
	 * SiteInfo body.
	 *
	 * @param string $key License key.
	 * @return array
	 */
	public function site_info( $key ) {
		$lms = $this->detector->lms();
		return array(
			'license_key'    => $key,
			'site_url'       => home_url( '/' ),
			'plugin_version' => YALLAPP_VERSION,
			'wp_version'     => get_bloginfo( 'version' ),
			'lms'            => $lms ? $lms['id'] : '',
		);
	}

	/**
	 * The platform API's base URL, without a trailing slash.
	 *
	 * @return string
	 */
	public static function base_url() {
		return untrailingslashit( defined( 'YALLAPP_PLATFORM_URL' ) ? (string) YALLAPP_PLATFORM_URL : self::DEFAULT_URL );
	}

	/**
	 * Calls the platform.
	 *
	 * @param string     $method HTTP method.
	 * @param string     $path   Path after the base URL.
	 * @param array|null $body   JSON body.
	 * @return array|WP_Error Decoded body (empty for 204), or an error.
	 */
	private function call( $method, $path, $body = null ) {
		$response = wp_remote_request(
			self::base_url() . $path,
			array(
				'method'  => $method,
				'timeout' => 15,
				'headers' => array(
					'Accept'       => 'application/json',
					'Content-Type' => 'application/json',
				),
				'body'    => null === $body ? null : wp_json_encode( $body ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'platform_unreachable', __( 'Could not reach yallapp.com.tr. Try again in a few minutes.', 'yallapp' ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( $code >= 200 && $code < 300 ) {
			return is_array( $data ) ? $data : array();
		}
		$error_code = is_array( $data ) && ! empty( $data['code'] ) ? (string) $data['code'] : 'platform_error';
		if ( 404 === $code && 'platform_error' === $error_code ) {
			$error_code = 'license_not_found';
		}
		$message = is_array( $data ) && ! empty( $data['message'] ) ? (string) $data['message'] : __( 'The license server returned an error.', 'yallapp' );
		$extra   = array( 'status' => $code );
		if ( is_array( $data ) && isset( $data['retry_after_seconds'] ) ) {
			$extra['retry_after_seconds'] = max( 1, (int) $data['retry_after_seconds'] );
		}
		return new WP_Error( $error_code, sanitize_text_field( $message ), $extra );
	}
}
