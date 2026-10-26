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
 * sent by Yallapp, the phone number and the code to deliver (the platform keeps neither), and
 * 51 the IDs of Media library videos a lesson plays.
 * 68 The license is enforced: while it isn't active (ended, suspended, not activated, or 72
 * hours without an answer from the platform) the app's API is paused. The plan's end date is
 * also compared locally. Only a development site can switch this off (enforced()).
 */
class License_Client {

	/**
	 * Plan features the platform may report (docs/api/platform.yaml, LicenseStatus).
	 */
	const FEATURES = array( 'push', 'offline_downloads', 'auto_publish', 'ios', 'page_editor', 'card_payments', 'auto_rebuild', 'chat' );

	/**
	 * App types (`LicenseStatus.app_type`) and kinds of business (`LicenseStatus.vertical`) the platform may send.
	 */
	const APP_TYPES = array( 'lms', 'store', 'booking', 'real_estate', 'news' );
	const VERTICALS = array( 'restaurant', 'clinic', 'fitness', 'charity', 'services' );

	const STATUS_OPTION = 'yallapp_license';
	const CHECK_HOOK    = 'yallapp_license_check';
	const REFRESH_HOOK  = 'yallapp_license_refresh';
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
		add_action( self::REFRESH_HOOK, array( $this, 'refresh_now' ) );
		add_action( 'init', array( $this, 'schedule' ) );
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
	 * 51 Links signed for this request to videos in the app's Yallapp Media library
	 * (docs/api/platform.yaml, mediaLinks). The caller has checked that the student may open
	 * the lesson that uses them.
	 *
	 * @param string[] $media   Media IDs or Yallapp links.
	 * @param string   $purpose play|download.
	 * @return array|WP_Error The MediaLinks body: `items` and `missing`.
	 */
	public function media_links( array $media, $purpose = 'play' ) {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return new WP_Error( 'license_missing', __( 'Activate your Yallapp license to play videos from Yallapp.', 'yallapp' ) );
		}
		return $this->call(
			'POST',
			'/licenses/media',
			array_merge(
				$this->site_info( $key ),
				array(
					'media'   => array_values( array_map( 'strval', $media ) ),
					'purpose' => 'download' === $purpose ? 'download' : 'play',
				)
			)
		);
	}

	/**
	 * 77 A chat token for a person signed in on this site (docs/api/platform.yaml,
	 * startChatSession): their WordPress ID, name and picture, and in an academy the courses
	 * they're enrolled in, for the course groups.
	 *
	 * @param int    $user_id   WordPress user ID.
	 * @param string $name      Their display name.
	 * @param string $image_url Their picture, or ''.
	 * @param array  $courses   Each `id`, `title` and `image_url` (or null).
	 * @return array|WP_Error `token`, `expires_at` and `base_url`.
	 */
	public function chat_session( $user_id, $name, $image_url, array $courses ) {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return new WP_Error( 'chat_not_available', __( 'Chat isn\'t available in this app.', 'yallapp' ), array( 'status' => 403 ) );
		}
		return $this->call(
			'POST',
			'/chat/sessions',
			array_merge(
				$this->site_info( $key ),
				array(
					'user'    => array(
						'id'        => (int) $user_id,
						'name'      => $name,
						'image_url' => '' !== $image_url ? $image_url : null,
					),
					'courses' => array_values( $courses ),
				)
			)
		);
	}

	/**
	 * 77 Tells Yallapp a person's account is gone, so their chat goes too (docs/api/platform.yaml,
	 * forgetChatMember). Without waiting for the answer: a deletion never waits on Yallapp.
	 *
	 * @param int $user_id WordPress user ID.
	 * @return void
	 */
	public function forget_chat_member( $user_id ) {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return;
		}
		wp_remote_post(
			self::base_url() . '/chat/members/forget',
			array(
				'timeout'  => 5,
				'blocking' => false,
				'headers'  => array(
					'Accept'       => 'application/json',
					'Content-Type' => 'application/json',
				),
				'body'     => wp_json_encode( array_merge( $this->site_info( $key ), array( 'user_id' => (int) $user_id ) ) ),
			)
		);
	}

	/**
	 * 85.4 Tells Yallapp how a campaign's pushes went, once its last batch is sent
	 * (docs/api/platform.yaml, reportCampaign).
	 *
	 * @param int $send_id Yallapp's send.
	 * @param int $sent    Phones Firebase and Huawei Push Kit accepted.
	 * @param int $failed  Phones they didn't.
	 * @return void
	 */
	public function report_campaign( $send_id, $sent, $failed ) {
		$key = (string) $this->settings->get( 'license_key' );
		if ( '' === $key ) {
			return;
		}
		wp_remote_post(
			self::base_url() . '/campaigns/report',
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'       => 'application/json',
					'Content-Type' => 'application/json',
				),
				'body'    => wp_json_encode(
					array_merge(
						$this->site_info( $key ),
						array(
							'send_id' => (int) $send_id,
							'sent'    => (int) $sent,
							'failed'  => (int) $failed,
						)
					)
				),
			)
		);
	}

	/**
	 * Whether license checks block the app API. 68 Always on a live site: only a development
	 * site (`WP_ENVIRONMENT_TYPE` `local` or `development`) can switch them off, with
	 * `define( 'YALLAPP_ENFORCE_LICENSE', false )` or the `yallapp_enforce_license` filter (tests).
	 *
	 * @return bool
	 */
	public static function enforced() {
		$environment = function_exists( 'wp_get_environment_type' ) ? wp_get_environment_type() : 'production';
		$constant    = defined( 'YALLAPP_ENFORCE_LICENSE' ) ? (bool) YALLAPP_ENFORCE_LICENSE : null;
		$enforced    = self::enforcement( $constant, $environment );
		if ( function_exists( 'apply_filters' ) ) {
			/**
			 * Whether the license is enforced. Turning it off counts only on a development site.
			 *
			 * @param bool $enforced Whether the license is enforced.
			 */
			$filtered = (bool) apply_filters( 'yallapp_enforce_license', $enforced );
			$enforced = $filtered || ! self::is_development( $environment );
		}
		return $enforced;
	}

	/**
	 * 68 Whether the license is enforced, from YALLAPP_ENFORCE_LICENSE (null when not defined)
	 * and the site's environment type: on unless it is set to false on a development site. Pure.
	 *
	 * @param bool|null $constant    YALLAPP_ENFORCE_LICENSE, or null.
	 * @param string    $environment wp_get_environment_type().
	 * @return bool
	 */
	public static function enforcement( $constant, $environment ) {
		return false !== $constant || ! self::is_development( $environment );
	}

	/**
	 * Whether the site says it is a development copy (`local` or `development`).
	 *
	 * @param string $environment wp_get_environment_type().
	 * @return bool
	 */
	private static function is_development( $environment ) {
		return in_array( (string) $environment, array( 'local', 'development' ), true );
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
		return 'active' === $this->state();
	}

	/**
	 * Where the license stands now (see state_of()).
	 *
	 * @return string active|expired|suspended|invalid|none|unreachable
	 */
	public function state() {
		return self::state_of( $this->status(), time() );
	}

	/**
	 * 68 Where a stored status stands at `$now`. An `active` status whose `expires_at` has
	 * passed is `expired` at once, whether or not the platform can be reached: the 72-hour
	 * grace only covers network failures before the plan's end. Otherwise an `active` status
	 * not confirmed for 72 hours is `unreachable`. Pure.
	 *
	 * @param array $status The stored status (status(), with `status`, `expires_at`, `contacted_at`).
	 * @param int   $now    Unix time.
	 * @return string active|expired|suspended|invalid|none|unreachable
	 */
	public static function state_of( array $status, $now ) {
		$state = (string) ( $status['status'] ?? 'invalid' );
		if ( 'active' !== $state ) {
			return in_array( $state, array( 'expired', 'suspended', 'none' ), true ) ? $state : 'invalid';
		}
		$ends = self::ends_at( $status );
		if ( null !== $ends && $ends <= (int) $now ) {
			return 'expired';
		}
		return (int) $now - (int) ( $status['contacted_at'] ?? 0 ) <= self::GRACE ? 'active' : 'unreachable';
	}

	/**
	 * The plan's end as Unix time, or null when the status has none (or it can't be read). Pure.
	 *
	 * @param array $status The stored status.
	 * @return int|null
	 */
	public static function ends_at( array $status ) {
		$raw = isset( $status['expires_at'] ) ? (string) $status['expires_at'] : '';
		if ( '' === $raw ) {
			return null;
		}
		$time = strtotime( $raw );
		return false === $time ? null : $time;
	}

	/**
	 * The last known status.
	 *
	 * @return array{status: string, plan: string|null, features: string[], sign_in_methods: string[]|null, email_sign_in: string|null, offline_downloads: bool|null, screen_protection: string|null, app_type: string|null, vertical: string|null, app_links: array|null, review_prompt: bool, crash_reports: bool, hide_video_branding: bool, chat: array|null, switches: array<string, bool>, expires_at: string|null, checked_at: string|null, message: string|null, contacted_at: int}
	 */
	public function status() {
		$stored = get_option( self::STATUS_OPTION, array() );
		return array_merge(
			array(
				'status'              => '' === (string) $this->settings->get( 'license_key' ) ? 'none' : 'invalid',
				'plan'                => null,
				'features'            => array(),
				'sign_in_methods'     => null,
				'email_sign_in'       => null,
				'offline_downloads'   => null,
				'screen_protection'   => null,
				'app_type'            => null,
				'vertical'            => null,
				'app_links'           => null,
				'review_prompt'       => true,
				'crash_reports'       => true,
				'hide_video_branding' => false,
				'chat'                => null,
				'switches'            => array(),
				'expires_at'          => null,
				'checked_at'          => null,
				'message'             => null,
				'contacted_at'        => 0,
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
	 * 31 Checks the license now because the platform asked (`POST /license/refresh`, or the
	 * check a nudge scheduled when it came too soon after the last one), then lets the layout
	 * client fetch the published pages.
	 *
	 * @return array|WP_Error Status.
	 */
	public function refresh_now() {
		$result = $this->check();
		/**
		 * Fires after the platform asked the site to check its license and the check ran.
		 *
		 * @param array|WP_Error $result The check's result.
		 */
		do_action( 'yallapp_license_refreshed', $result );
		return $result;
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
			'status'              => in_array( $result['status'] ?? '', $allowed, true ) ? $result['status'] : 'invalid',
			'plan'                => in_array( $result['plan'] ?? null, array( 'starter', 'growth', 'pro', 'business' ), true ) ? $result['plan'] : null,
			'features'            => $features,
			// How people sign in, as the owner chose on the dashboard; null: the plugin setting applies.
			'sign_in_methods'     => $methods ? $methods : null,
			// How email sign-in works (a code, or the password), as the owner chose; null: the plugin setting.
			'email_sign_in'       => in_array( $result['email_sign_in'] ?? null, array( 'code', 'password' ), true ) ? $result['email_sign_in'] : null,
			// 45 Offline downloads on or off, as the owner chose on the dashboard; null: the plugin setting.
			'offline_downloads'   => isset( $result['offline_downloads'] ) && is_bool( $result['offline_downloads'] ) ? $result['offline_downloads'] : null,
			// 53 Screenshots and screen recording, as the owner chose on the dashboard; null: the plugin settings.
			'screen_protection'   => \Yallapp\Content\Screen_Protection::from_status( $result['screen_protection'] ?? null ),
			// The app's type and kind of business, as the owner chose them; null when unknown.
			'app_type'            => $app['app_type'],
			'vertical'            => $app['vertical'],
			// 46 What the site's link files say (only well-formed values), and the owner's switches.
			'app_links'           => \Yallapp\App_Links::sanitize( $result['app_links'] ?? null ),
			'review_prompt'       => false !== ( $result['review_prompt'] ?? true ),
			'crash_reports'       => false !== ( $result['crash_reports'] ?? true ),
			// 72 The video sites' own players unless the owner chose to hide them (at their own risk).
			'hide_video_branding' => self::hides_video_branding( $result ),
			// 77 The app's chat, on Yallapp: where it is and whether academies have course groups.
			'chat'                => self::chat_of( $result ),
			// 83.3 The team's switches for the app's modules and new features.
			'switches'            => self::switches_of( $result ),
			'expires_at'          => isset( $result['expires_at'] ) ? sanitize_text_field( (string) $result['expires_at'] ) : null,
			'checked_at'          => gmdate( 'c' ),
			'message'             => isset( $result['message'] ) ? sanitize_text_field( (string) $result['message'] ) : null,
			'contacted_at'        => time(),
		);
		update_option( self::STATUS_OPTION, $status, false );
		// 76 The release cache of versions before 0.4.8, which updated themselves from Yallapp;
		// updates now come from WordPress.org.
		delete_transient( 'yallapp_release' );
		return $status;
	}

	/**
	 * 72 Whether the app hides the video sites' own players (their branding and controls), as the
	 * owner chose in the dashboard at their own risk. Only a true from the platform counts: missing
	 * (older platforms) or anything else is false, each site's normal player. Pure.
	 *
	 * @param array $result License status from the platform.
	 * @return bool
	 */
	public static function hides_video_branding( array $result ) {
		return true === ( $result['hide_video_branding'] ?? false );
	}

	/**
	 * 77 The app's chat (`LicenseStatus.chat`): its address on Yallapp's hosted API and whether
	 * the academy has course groups. Null when the plan has none, the owner turned it off, or
	 * the platform sends something else (an older one sends nothing). Pure.
	 *
	 * @param array $result License status from the platform.
	 * @return array{base_url: string, groups: bool}|null
	 */
	public static function chat_of( array $result ) {
		$chat = $result['chat'] ?? null;
		if ( ! is_array( $chat ) || ! is_string( $chat['base_url'] ?? null ) ) {
			return null;
		}
		$url    = trim( $chat['base_url'] );
		$scheme = wp_parse_url( $url, PHP_URL_SCHEME );
		if ( ! in_array( $scheme, array( 'https', 'http' ), true ) || '' === (string) wp_parse_url( $url, PHP_URL_HOST ) || strlen( $url ) > 500 ) {
			return null;
		}
		return array(
			'base_url' => untrailingslashit( esc_url_raw( $url ) ),
			'groups'   => true === ( $chat['groups'] ?? false ),
		);
	}

	/**
	 * 83.3 The team's switches for the app (`LicenseStatus.switches`): each name with true or
	 * false, at most 50, names of lowercase letters, digits and underscores. Older platforms
	 * send none: an empty list, every switch on. Pure.
	 *
	 * @param array $result License status from the platform.
	 * @return array<string, bool>
	 */
	public static function switches_of( array $result ) {
		$switches = array();
		foreach ( is_array( $result['switches'] ?? null ) ? $result['switches'] : array() as $name => $on ) {
			if ( is_string( $name ) && preg_match( '/^[a-z0-9_]{1,40}$/', $name ) && is_bool( $on ) && count( $switches ) < 50 ) {
				$switches[ $name ] = $on;
			}
		}
		return $switches;
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
		$lms     = $this->detector->lms();
		$booking = $this->detector->booking();
		// What the site has, so the dashboard can say when the app's type doesn't match it.
		return array(
			'license_key'    => $key,
			'site_url'       => home_url( '/' ),
			'plugin_version' => YALLAPP_VERSION,
			'wp_version'     => get_bloginfo( 'version' ),
			'lms'            => $lms ? $lms['id'] : '',
			'store'          => $this->detector->woocommerce()['active'] ? 'woocommerce' : '',
			'bookings'       => $booking ? $booking['id'] : '',
			// 48 The site's own pages that open the app on Android, for the app's next build.
			'link_paths'     => \Yallapp\Link_Paths::android_paths( ( new \Yallapp\Link_Paths( \Yallapp\Plugin::instance() ) )->entries() ),
			// 81.2 What the site looks like, for an app made from it.
			'brand'          => self::brand(),
			// 83.4 The versions of the adapters the site uses.
			'adapters'       => (object) \Yallapp\Plugin::instance()->adapter_versions(),
		);
	}

	/**
	 * The site's brand (Site_Brand), or nothing when it can't be read: the check goes on without it.
	 *
	 * @return array|null
	 */
	private static function brand() {
		try {
			return \Yallapp\Site_Brand::report();
		} catch ( \Throwable $e ) {
			return null;
		}
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
