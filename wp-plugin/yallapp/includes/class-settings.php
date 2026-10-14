<?php
/**
 * Plugin settings.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Stores every setting from the Yallapp admin page in one option, with typed defaults.
 */
class Settings {

	const OPTION = 'yallapp_settings';

	/**
	 * Cached values.
	 *
	 * @var array|null
	 */
	private $values = null;

	/**
	 * Default values. The type of each default is also the type the value is sanitized to.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// General.
			'api_enabled'                  => true,
			'app_name'                     => '',
			'logo_id'                      => 0,
			'primary_color'                => '#0E0D24',
			'support_whatsapp'             => '',
			'support_email'                => '',
			'terms_page_id'                => 0,
			'privacy_page_id'              => 0,
			// Sign-in.
			'otp_provider'                 => 'yallapp',
			'sign_in_methods'              => 'phone',
			'signup_allowed'               => true,
			'signup_fields'                => array( 'name' ),
			'default_country_code'         => '+90',
			'resend_seconds'               => 60,
			'max_code_requests_per_hour'   => 5,
			'session_days'                 => 30,
			'device_limit'                 => 2,
			'device_limit_action'          => 'block',
			'review_access_enabled'        => false,
			'review_phone'                 => '',
			'review_code'                  => '',
			// Purchases.
			'android_enroll_button'        => true,
			'free_enrollment'              => true,
			'checkout_opens_in'            => 'in_app',
			'hide_site_chrome_in_app'      => true,
			// Video and content protection.
			'block_screen_capture'         => true,
			'watermark'                    => 'phone',
			'video_link_ttl'               => 7200,
			'required_watch_percent'       => 0,
			'offline_downloads'            => false,
			// Lesson content.
			'render_mode'                  => 'auto',
			'theme_styles_in_webview'      => true,
			'allow_scripts'                => true,
			'code_highlighting'            => true,
			'embed_fullscreen_button'      => true,
			'embed_height'                 => 'auto',
			// Home screen.
			'home_sections'                => array( 'banner', 'continue_learning', 'categories', 'featured_courses' ),
			'featured_course_ids'          => array(),
			'banner_image_id'              => 0,
			'banner_course_id'             => 0,
			// Store home screen and delivery options (Store apps).
			'store_home_sections'          => array( 'banner', 'categories', 'featured_products', 'sale_products', 'new_products' ),
			'store_banner_image_id'        => 0,
			'store_banner_product_id'      => 0,
			'store_banner_category_id'     => 0,
			'store_delivery_date'          => false,
			'store_delivery_date_required' => false,
			'store_delivery_min_days'      => 1,
			'store_delivery_max_days'      => 30,
			'store_closed_weekdays'        => array(),
			'store_gift_message'           => false,
			'store_gift_message_max'       => 200,
			// Bookings home screen and rules (Bookings apps).
			'bookings_home_sections'       => array( 'banner', 'next_appointment', 'categories', 'services', 'staff' ),
			'bookings_banner_image_id'     => 0,
			'bookings_banner_service_id'   => 0,
			'bookings_cancel'              => true,
			// Notifications.
			'firebase_service_account'     => '',
			'notify_new_lesson'            => true,
			'notify_announcement'          => true,
			'notify_enrollment'            => true,
			'notify_qna_answer'            => true,
			// Updates and maintenance.
			'min_app_version'              => '',
			'maintenance'                  => false,
			'maintenance_message'          => '',
			// License.
			'license_key'                  => '',
		);
	}

	/**
	 * Allowed values for choice settings.
	 *
	 * @return array
	 */
	public static function choices() {
		return array(
			'otp_provider'           => array( 'yallapp', 'digits', 'dev' ),
			'sign_in_methods'        => array( 'phone', 'email', 'both' ),
			'device_limit_action'    => array( 'block', 'replace_oldest' ),
			'checkout_opens_in'      => array( 'in_app', 'browser' ),
			'watermark'              => array( 'off', 'phone', 'name', 'name_and_phone' ),
			'render_mode'            => array( 'auto', 'native', 'webview' ),
			'embed_height'           => array( 'auto', 'fit_screen', 'as_set' ),
			'signup_fields'          => array( 'name', 'email', 'city' ),
			'home_sections'          => array( 'banner', 'continue_learning', 'categories', 'featured_courses', 'latest_courses' ),
			'store_home_sections'    => array( 'banner', 'categories', 'featured_products', 'sale_products', 'new_products', 'best_sellers' ),
			'store_closed_weekdays'  => array( '0', '1', '2', '3', '4', '5', '6' ),
			'bookings_home_sections' => array( 'banner', 'next_appointment', 'categories', 'services', 'staff' ),
		);
	}

	/**
	 * Every setting, merged with defaults.
	 *
	 * @return array
	 */
	public function all() {
		if ( null === $this->values ) {
			$stored       = get_option( self::OPTION, array() );
			$this->values = array_merge( self::defaults(), is_array( $stored ) ? $stored : array() );
		}
		return $this->values;
	}

	/**
	 * One setting.
	 *
	 * @param string $key Setting key.
	 * @return mixed
	 */
	public function get( $key ) {
		$all = $this->all();
		return array_key_exists( $key, $all ) ? $all[ $key ] : null;
	}

	/**
	 * Sanitizes and saves the given settings. Unknown keys are ignored.
	 *
	 * @param array $changes Raw values keyed by setting.
	 * @return void
	 */
	public function update( array $changes ) {
		$values = $this->all();
		foreach ( $changes as $key => $raw ) {
			if ( array_key_exists( $key, self::defaults() ) ) {
				$values[ $key ] = self::sanitize( $key, $raw );
			}
		}
		update_option( self::OPTION, $values, false );
		$this->values = $values;
	}

	/**
	 * Sanitizes one value to the type of its default.
	 *
	 * @param string $key Setting key.
	 * @param mixed  $raw Raw value.
	 * @return mixed
	 */
	public static function sanitize( $key, $raw ) {
		$default = self::defaults()[ $key ];
		$choices = self::choices();

		if ( is_bool( $default ) ) {
			return in_array( $raw, array( true, 1, '1', 'on', 'yes', 'true' ), true );
		}
		if ( is_int( $default ) ) {
			return max( 0, (int) $raw );
		}
		if ( is_array( $default ) ) {
			$list = array_values( array_filter( (array) $raw, 'is_scalar' ) );
			if ( isset( $choices[ $key ] ) ) {
				return array_values( array_intersect( $list, $choices[ $key ] ) );
			}
			return array_values( array_unique( array_filter( array_map( 'absint', $list ) ) ) );
		}
		if ( isset( $choices[ $key ] ) ) {
			return in_array( $raw, $choices[ $key ], true ) ? $raw : $default;
		}
		if ( 'primary_color' === $key ) {
			$color = sanitize_hex_color( (string) $raw );
			return $color ? strtoupper( $color ) : $default;
		}
		if ( 'maintenance_message' === $key ) {
			return sanitize_textarea_field( (string) $raw );
		}
		if ( 'firebase_service_account' === $key ) {
			return self::service_account( (string) $raw );
		}
		return sanitize_text_field( (string) $raw );
	}

	/**
	 * Validates a Firebase service account JSON file and encrypts it for storage.
	 *
	 * @param string $raw JSON, an already encrypted value, or ''.
	 * @return string Encrypted value, or '' when empty or invalid.
	 */
	public static function service_account( $raw ) {
		$raw = trim( $raw );
		if ( '' === $raw || 0 === strpos( $raw, 'v1:' ) ) {
			return $raw;
		}
		$json = json_decode( $raw, true );
		if ( ! is_array( $json ) || empty( $json['project_id'] ) || empty( $json['client_email'] ) || empty( $json['private_key'] ) ) {
			return '';
		}
		$keep = array(
			'project_id'   => (string) $json['project_id'],
			'client_email' => (string) $json['client_email'],
			'private_key'  => (string) $json['private_key'],
		);
		return Crypto::encrypt( (string) wp_json_encode( $keep ) );
	}
}
