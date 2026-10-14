<?php
/**
 * Plugin bootstrap and service container.
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

use Yallapp\Auth\Devices;
use Yallapp\Auth\Request_Auth;
use Yallapp\Auth\Tokens;
use Yallapp\Content\Lesson_Renderer;
use Yallapp\Content\Magic_Links;
use Yallapp\Content\Media;
use Yallapp\Lms\Lms_Adapter;
use Yallapp\Lms\Tutor_Adapter;
use Yallapp\Otp\Adapter_Choice;
use Yallapp\Otp\Dev_Adapter;
use Yallapp\Otp\Digits_Adapter;
use Yallapp\Otp\Otp_Adapter;
use Yallapp\Otp\Sign_In;
use Yallapp\Otp\Yallapp_Adapter;

/**
 * Creates the plugin's services once and wires them into WordPress.
 */
class Plugin {

	const REST_NAMESPACE = 'yallapp/v1';

	/**
	 * Adapter class for each LMS the detector reports.
	 */
	const LMS_ADAPTERS = array(
		'tutor'       => Tutor_Adapter::class,
		'learndash'   => Lms\LearnDash_Adapter::class,
		'learnpress'  => Lms\LearnPress_Adapter::class,
		'lifterlms'   => Lms\LifterLMS_Adapter::class,
		'masterstudy' => Lms\MasterStudy_Adapter::class,
		'sensei'      => Lms\Sensei_Adapter::class,
		'masteriyo'   => Lms\Masteriyo_Adapter::class,
	);

	/**
	 * Adapter class for each booking plugin the detector reports.
	 */
	const BOOKING_ADAPTERS = array(
		'amelia'       => Bookings\Amelia_Adapter::class,
		'bookingpress' => Bookings\BookingPress_Adapter::class,
		'latepoint'    => Bookings\LatePoint_Adapter::class,
	);

	/**
	 * The instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Services, created on first use.
	 *
	 * @var array<string, object>
	 */
	private $services = array();

	/**
	 * The instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Hooks everything into WordPress.
	 *
	 * @return void
	 */
	public function boot() {
		Installer::maybe_upgrade();
		$this->request_auth()->register();
		$this->magic_links()->register();
		$this->push()->register();
		$this->license()->register();
		$this->layout_client()->register();
		$this->store_checkout()->register();
		( new Rest\Gatekeeper( $this ) )->register();
		// The app preview in the Yallapp dashboard runs in a browser.
		Rest\Cors::register();
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'yallapp_daily', array( $this->tokens(), 'purge_expired' ) );
		add_action( 'yallapp_daily', array( $this->inbox(), 'purge_old' ) );
		if ( is_admin() ) {
			( new Admin\Settings_Page( $this ) )->register();
			( new Admin\Lesson_Meta_Box() )->register();
		}
	}

	/**
	 * Registers REST routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->media()->register_routes();
		( new Rest\App_Controller( $this ) )->register_routes();
		( new Rest\Pages_Controller( $this ) )->register_routes();
		( new Rest\Auth_Controller( $this ) )->register_routes();
		( new Rest\Account_Controller( $this ) )->register_routes();
		( new Rest\Catalog_Controller( $this ) )->register_routes();
		( new Rest\Learning_Controller( $this ) )->register_routes();
		( new Rest\Quiz_Controller( $this ) )->register_routes();
		( new Rest\Notifications_Controller( $this ) )->register_routes();
		( new Rest\Community_Controller( $this ) )->register_routes();
		( new Rest\Store_Controller( $this ) )->register_routes();
		( new Rest\Bookings_Controller( $this ) )->register_routes();
	}

	/**
	 * Settings.
	 *
	 * @return Settings
	 */
	public function settings() {
		return $this->service(
			'settings',
			static function () {
				return new Settings();
			}
		);
	}

	/**
	 * Plugin detection.
	 *
	 * @return Detector
	 */
	public function detector() {
		return $this->service(
			'detector',
			static function () {
				return new Detector();
			}
		);
	}

	/**
	 * The LMS adapter for this site, or null when no supported LMS is active.
	 *
	 * @return Lms_Adapter|null
	 */
	public function lms() {
		if ( ! array_key_exists( 'lms', $this->services ) ) {
			$lms     = $this->detector()->lms();
			$adapter = null;
			if ( $lms && $lms['supported'] && isset( self::LMS_ADAPTERS[ $lms['id'] ] ) && class_exists( self::LMS_ADAPTERS[ $lms['id'] ] ) ) {
				$class   = self::LMS_ADAPTERS[ $lms['id'] ];
				$adapter = new $class();
			}
			/**
			 * Filters the LMS adapter, so other LMS integrations can plug in.
			 *
			 * @param Lms_Adapter|null $adapter Adapter.
			 * @param array|null       $lms     Detected LMS.
			 */
			$this->services['lms'] = apply_filters( 'yallapp_lms_adapter', $adapter, $lms );
		}
		return $this->services['lms'];
	}

	/**
	 * The booking plugin adapter, or null when the site has no supported booking plugin.
	 *
	 * @return Bookings\Booking_Adapter|null
	 */
	public function bookings() {
		if ( ! array_key_exists( 'bookings', $this->services ) ) {
			$booking = $this->detector()->booking();
			$adapter = null;
			if ( $booking && $booking['supported'] && isset( self::BOOKING_ADAPTERS[ $booking['id'] ] ) && class_exists( self::BOOKING_ADAPTERS[ $booking['id'] ] ) ) {
				$class   = self::BOOKING_ADAPTERS[ $booking['id'] ];
				$adapter = new $class();
			}
			/**
			 * Filters the booking adapter, so other booking plugins can plug in.
			 *
			 * @param Bookings\Booking_Adapter|null $adapter Adapter.
			 * @param array|null                    $booking Detected booking plugin.
			 */
			$this->services['bookings'] = apply_filters( 'yallapp_booking_adapter', $adapter, $booking );
		}
		return $this->services['bookings'];
	}

	/**
	 * The one-time code provider: the one chosen in the settings ("Sent by Yallapp" by default),
	 * or another that works when the chosen one can't send codes on this site.
	 *
	 * @return Otp_Adapter
	 */
	public function otp() {
		return $this->service(
			'otp',
			function () {
				$adapters = $this->otp_adapters();
				$adapter  = $adapters[ $this->otp_choice()['id'] ];
				/**
				 * Filters the one-time code provider.
				 *
				 * @param Otp_Adapter $adapter Adapter.
				 */
				return apply_filters( 'yallapp_otp_adapter', $adapter );
			}
		);
	}

	/**
	 * Which provider sends codes, and whether it replaces the saved choice (see Adapter_Choice::resolve()).
	 *
	 * @return array{id: string, saved: string, fallback: bool, available: bool}
	 */
	public function otp_choice() {
		$available = array();
		foreach ( $this->otp_adapters() as $id => $adapter ) {
			$available[ $id ] = $adapter->is_available();
		}
		return Adapter_Choice::resolve( (string) $this->settings()->get( 'otp_provider' ), $available );
	}

	/**
	 * Every code provider, by ID.
	 *
	 * @return array<string, Otp_Adapter>
	 */
	public function otp_adapters() {
		return $this->service(
			'otp_adapters',
			function () {
				return array(
					Adapter_Choice::YALLAPP => new Yallapp_Adapter( $this->license() ),
					Adapter_Choice::DIGITS  => new Digits_Adapter(),
					Adapter_Choice::DEV     => new Dev_Adapter(),
				);
			}
		);
	}

	/**
	 * Devices.
	 *
	 * @return Devices
	 */
	public function devices() {
		return $this->service(
			'devices',
			function () {
				return new Devices( $this->settings() );
			}
		);
	}

	/**
	 * Tokens.
	 *
	 * @return Tokens
	 */
	public function tokens() {
		return $this->service(
			'tokens',
			function () {
				return new Tokens( $this->settings(), $this->devices() );
			}
		);
	}

	/**
	 * Bearer-token authentication.
	 *
	 * @return Request_Auth
	 */
	public function request_auth() {
		return $this->service(
			'request_auth',
			function () {
				return new Request_Auth( $this->tokens() );
			}
		);
	}

	/**
	 * Sign-in flow.
	 *
	 * @return Sign_In
	 */
	public function sign_in() {
		return $this->service(
			'sign_in',
			function () {
				return new Sign_In( $this->settings(), $this->otp(), $this->devices(), $this->tokens(), $this->license() );
			}
		);
	}

	/**
	 * Signed video links.
	 *
	 * @return Media
	 */
	public function media() {
		return $this->service(
			'media',
			function () {
				return new Media( $this->settings() );
			}
		);
	}

	/**
	 * Lesson renderer.
	 *
	 * @return Lesson_Renderer
	 */
	public function lesson_renderer() {
		return $this->service(
			'lesson_renderer',
			function () {
				return new Lesson_Renderer( $this->settings(), $this->media() );
			}
		);
	}

	/**
	 * One-time sign-in links.
	 *
	 * @return Magic_Links
	 */
	public function magic_links() {
		return $this->service(
			'magic_links',
			static function () {
				return new Magic_Links();
			}
		);
	}

	/**
	 * Push notifications.
	 *
	 * @return Push\Push_Service
	 */
	public function push() {
		return $this->service(
			'push',
			function () {
				return new Push\Push_Service( $this );
			}
		);
	}

	/**
	 * Notifications inbox.
	 *
	 * @return Push\Inbox
	 */
	public function inbox() {
		return $this->service(
			'inbox',
			static function () {
				return new Push\Inbox();
			}
		);
	}

	/**
	 * The store's cart and checkout hand-off.
	 *
	 * @return Store\Checkout
	 */
	public function store_checkout() {
		return $this->service(
			'store_checkout',
			function () {
				return new Store\Checkout( $this->settings() );
			}
		);
	}

	/**
	 * License client.
	 *
	 * @return License\License_Client
	 */
	public function license() {
		return $this->service(
			'license',
			function () {
				return new License\License_Client( $this->settings(), $this->detector() );
			}
		);
	}

	/**
	 * The app layout from the platform.
	 *
	 * @return Pages\Layout_Client
	 */
	public function layout_client() {
		return $this->service(
			'layout_client',
			function () {
				return new Pages\Layout_Client( $this->settings(), $this->license() );
			}
		);
	}

	/**
	 * The app's pages, tabs, look and languages.
	 *
	 * @return Pages\Pages
	 */
	public function pages() {
		return $this->service(
			'pages',
			function () {
				return new Pages\Pages( $this );
			}
		);
	}

	/**
	 * Creates a service once.
	 *
	 * @param string   $name    Service name.
	 * @param callable $factory Factory.
	 * @return mixed
	 */
	private function service( $name, callable $factory ) {
		if ( ! isset( $this->services[ $name ] ) ) {
			$this->services[ $name ] = $factory();
		}
		return $this->services[ $name ];
	}
}
