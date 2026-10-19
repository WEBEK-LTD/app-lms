<?php
/**
 * The Yallapp settings screen.
 *
 * @package Yallapp
 */

namespace Yallapp\Admin;

defined( 'ABSPATH' ) || exit;

use Yallapp\Auth\Devices;
use Yallapp\Otp\Adapter_Choice;
use Yallapp\Otp\Dev_Adapter;
use Yallapp\Otp\Phone;
use Yallapp\Otp\Yallapp_Adapter;
use Yallapp\Plugin;
use Yallapp\Settings;

/**
 * Renders the settings page and handles its forms through admin-post.php.
 */
class Settings_Page {

	const SLUG       = 'yallapp';
	const CAPABILITY = 'manage_options';

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Saved values.
	 *
	 * @var array
	 */
	private $values = array();

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'admin_post_yallapp_save', array( $this, 'save' ) );
		add_action( 'admin_post_yallapp_license', array( $this, 'license' ) );
		add_action( 'admin_post_yallapp_layout', array( $this, 'layout' ) );
		add_action( 'admin_post_yallapp_push', array( $this, 'manual_push' ) );
		add_action( 'admin_post_yallapp_unlink', array( $this, 'unlink' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( YALLAPP_FILE ), array( $this, 'action_links' ) );
	}

	/**
	 * Adds the menu item.
	 *
	 * @return void
	 */
	public function menu() {
		add_menu_page(
			__( 'Yallapp', 'yallapp' ),
			__( 'Yallapp', 'yallapp' ),
			self::CAPABILITY,
			self::SLUG,
			array( $this, 'render' ),
			self::menu_icon(),
			58
		);
	}

	/**
	 * Adds a Settings link on the plugins screen.
	 *
	 * @param array $links Links.
	 * @return array
	 */
	public function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Settings', 'yallapp' ) . '</a>' );
		return $links;
	}

	/**
	 * Loads CSS and JS on this screen only.
	 *
	 * @param string $hook Screen hook.
	 * @return void
	 */
	public function assets( $hook ) {
		if ( 'toplevel_page_' . self::SLUG !== $hook ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_style( 'yallapp-admin', plugins_url( 'assets/admin.css', YALLAPP_FILE ), array(), YALLAPP_VERSION );
		wp_enqueue_script( 'yallapp-admin', plugins_url( 'assets/admin.js', YALLAPP_FILE ), array( 'jquery', 'jquery-ui-sortable' ), YALLAPP_VERSION, true );
		wp_localize_script(
			'yallapp-admin',
			'yallappAdmin',
			array(
				'chooseImage' => __( 'Choose image', 'yallapp' ),
				'useImage'    => __( 'Use this image', 'yallapp' ),
			)
		);
	}

	/**
	 * Page URL.
	 *
	 * @param array $args Query arguments.
	 * @return string
	 */
	public static function url( array $args = array() ) {
		return add_query_arg( array_merge( array( 'page' => self::SLUG ), $args ), admin_url( 'admin.php' ) );
	}

	/**
	 * Renders the page.
	 *
	 * @return void
	 */
	public function render() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}
		$this->values = $this->plugin->settings()->all();
		echo '<div class="wrap yallapp">';
		echo '<header class="ya-head"><div><h1>' . esc_html__( 'Yallapp', 'yallapp' ) . '</h1><p>' . esc_html__( 'These settings apply to the app instantly, with no app store update needed.', 'yallapp' ) . '</p></div></header>';
		$this->notice();
		$this->license_card();
		$this->layout_card();
		$this->compatibility_card();

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" enctype="multipart/form-data" class="ya-form">';
		echo '<input type="hidden" name="action" value="yallapp_save">';
		wp_nonce_field( 'yallapp_save' );
		// 31 Only what fits the app: the type chosen in the dashboard, else what the site's plugins suggest.
		$type = $this->app_type();
		foreach ( self::cards_for( $type ) as $card ) {
			$this->card( $card, $type );
		}
		echo '<div class="ya-savebar"><button type="submit" class="button button-primary button-hero">' . esc_html__( 'Save changes', 'yallapp' ) . '</button></div>';
		echo '</form>';

		$this->manual_push_card( $type );
		$this->devices_card( $type );
		echo '</div>';
	}

	/**
	 * 31 The app type the page shows settings for: the one chosen in the Yallapp dashboard (the
	 * license status), else the one the site's plugins suggest, as the default pages do.
	 *
	 * @return string|null lms, store, bookings, news, or null when nothing fits.
	 */
	private function app_type() {
		return self::app_type_for(
			\Yallapp\Pages\Default_Layout::chosen_type( $this->plugin->license()->status() ),
			null !== $this->plugin->lms(),
			\Yallapp\Store\Catalog::available(),
			null !== $this->plugin->bookings()
		);
	}

	/**
	 * 31 The chosen type, else the first that the site's plugins fit (an LMS, a shop, a booking
	 * plugin); null when there's no choice and nothing fits. Pure.
	 *
	 * @param string|null $chosen       Default_Layout::chosen_type() of the license status.
	 * @param bool        $has_lms      A supported LMS is active.
	 * @param bool        $has_shop     WooCommerce is active.
	 * @param bool        $has_bookings A supported booking plugin is active.
	 * @return string|null
	 */
	public static function app_type_for( $chosen, $has_lms, $has_shop, $has_bookings ) {
		if ( in_array( $chosen, array( 'lms', 'store', 'bookings', 'news' ), true ) ) {
			return $chosen;
		}
		if ( $has_lms ) {
			return 'lms';
		}
		if ( $has_shop ) {
			return 'store';
		}
		return $has_bookings ? 'bookings' : null;
	}

	/**
	 * 31 The cards of the settings form for an app type, in order: course settings only for
	 * Academy apps, the shop's for Store apps, and so on. Without a type, a note instead. Pure.
	 *
	 * @param string|null $type app_type_for().
	 * @return string[] general, sign_in, purchases, video, content, home, checkout, store, bookings, news, no_type, notifications, updates.
	 */
	public static function cards_for( $type ) {
		$own = array(
			'lms'      => array( 'purchases', 'video', 'content', 'home' ),
			'store'    => array( 'checkout', 'store' ),
			'bookings' => array( 'bookings' ),
			'news'     => array( 'news' ),
		);
		return array_merge( array( 'general', 'sign_in' ), $own[ (string) $type ] ?? array( 'no_type' ), array( 'notifications', 'updates' ) );
	}

	/**
	 * 31 The notifications sent automatically for an app type (settings keys). Pure.
	 *
	 * @param string|null $type app_type_for().
	 * @return string[]
	 */
	public static function automatic_notifications_for( $type ) {
		if ( 'lms' === $type ) {
			return array( 'notify_new_lesson', 'notify_announcement', 'notify_enrollment', 'notify_qna_answer' );
		}
		return 'news' === $type ? array( 'notify_new_post' ) : array();
	}

	/**
	 * Renders one card of the settings form.
	 *
	 * @param string      $card Card name from cards_for().
	 * @param string|null $type App type.
	 * @return void
	 */
	private function card( $card, $type ) {
		$cards = array(
			'general'   => 'general_card',
			'sign_in'   => 'sign_in_card',
			'purchases' => 'purchases_card',
			'video'     => 'video_card',
			'content'   => 'content_card',
			'home'      => 'home_card',
			'checkout'  => 'checkout_card',
			'store'     => 'store_card',
			'bookings'  => 'bookings_card',
			'news'      => 'news_card',
			'no_type'   => 'no_type_card',
			'updates'   => 'updates_card',
		);
		if ( 'notifications' === $card ) {
			$this->notifications_card( $type );
		} elseif ( isset( $cards[ $card ] ) ) {
			$this->{$cards[ $card ]}();
		}
	}

	/**
	 * 31 Instead of another type's settings: what to do so this app's appear.
	 *
	 * @return void
	 */
	private function no_type_card() {
		$this->open( __( 'Your app', 'yallapp' ) );
		echo '<p class="ya-help">' . esc_html__( 'Choose your app type in your Yallapp dashboard, then activate your license above (or click Check now). The settings for that kind of app then appear here. Until then, only the settings every app has are shown.', 'yallapp' ) . '</p>';
		$this->close();
	}

	/**
	 * Saves the main form.
	 *
	 * @return void
	 */
	public function save() {
		$this->guard();
		check_admin_referer( 'yallapp_save' );
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Each value is sanitized by Settings::sanitize().
		$raw     = isset( $_POST['yallapp'] ) && is_array( $_POST['yallapp'] ) ? wp_unslash( $_POST['yallapp'] ) : array();
		$changes = array_diff_key( $raw, array_flip( array( 'license_key', 'firebase_service_account', 'huawei_push_app_secret' ) ) );
		// 36 Huawei Push Kit: an empty secret field keeps the saved one.
		if ( ! empty( $_POST['yallapp_huawei_remove'] ) ) {
			$changes['huawei_push_app_id']     = '';
			$changes['huawei_push_app_secret'] = '';
		} elseif ( isset( $raw['huawei_push_app_secret'] ) && '' !== trim( (string) $raw['huawei_push_app_secret'] ) ) {
			$changes['huawei_push_app_secret'] = trim( (string) $raw['huawei_push_app_secret'] );
		}

		if ( ! empty( $_POST['yallapp_firebase_remove'] ) ) {
			$changes['firebase_service_account'] = '';
		} elseif ( isset( $_FILES['yallapp_firebase'] ) && ! empty( $_FILES['yallapp_firebase']['tmp_name'] ) && is_uploaded_file( $_FILES['yallapp_firebase']['tmp_name'] ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Path from PHP.
			$json      = (string) file_get_contents( $_FILES['yallapp_firebase']['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Uploaded temp file.
			$encrypted = Settings::service_account( $json );
			if ( '' === $encrypted ) {
				$this->redirect( 'error', __( 'That file is not a Firebase service account. Download it from Firebase > Project settings > Service accounts.', 'yallapp' ) );
			}
			$changes['firebase_service_account'] = $encrypted;
		}

		$this->plugin->settings()->update( $changes );
		$this->redirect( 'success', __( 'Settings saved. The app picks them up on its next launch.', 'yallapp' ) );
	}

	/**
	 * Activates, re-checks or deactivates the license.
	 *
	 * @return void
	 */
	public function license() {
		$this->guard();
		check_admin_referer( 'yallapp_license' );
		$client = $this->plugin->license();
		$task   = isset( $_POST['task'] ) ? sanitize_key( wp_unslash( $_POST['task'] ) ) : '';
		if ( 'deactivate' === $task ) {
			$client->deactivate();
			$this->redirect( 'success', __( 'The license was released from this site.', 'yallapp' ) );
		}
		$result = 'check' === $task
			? $client->check()
			: $client->activate( isset( $_POST['license_key'] ) ? sanitize_text_field( wp_unslash( $_POST['license_key'] ) ) : '' );
		if ( is_wp_error( $result ) ) {
			$this->redirect( 'error', $result->get_error_message() );
		}
		$this->redirect( 'active' === $result['status'] ? 'success' : 'error', 'active' === $result['status'] ? __( 'Your license is active.', 'yallapp' ) : ( $result['message'] ? $result['message'] : __( 'This license is not active.', 'yallapp' ) ) );
	}

	/**
	 * Fetches the app layout from the platform now.
	 *
	 * @return void
	 */
	public function layout() {
		$this->guard();
		check_admin_referer( 'yallapp_layout' );
		$result   = $this->plugin->layout_client()->refresh();
		$messages = array(
			'updated'   => __( 'The app layout was updated. The app shows it on its next launch.', 'yallapp' ),
			'unchanged' => __( 'The app layout is up to date.', 'yallapp' ),
			'cleared'   => __( 'No pages are published in your Yallapp dashboard yet, so the app shows the default pages.', 'yallapp' ),
		);
		if ( is_wp_error( $result ) ) {
			$this->redirect( 'error', $result->get_error_message() );
		}
		$this->redirect( 'success', $messages[ $result ] );
	}

	/**
	 * Sends a manual notification: to the students' inbox, and by push when Firebase is set up.
	 *
	 * @return void
	 */
	public function manual_push() {
		$this->guard();
		check_admin_referer( 'yallapp_push' );
		$title     = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		$body      = isset( $_POST['body'] ) ? sanitize_textarea_field( wp_unslash( $_POST['body'] ) ) : '';
		$course_id = isset( $_POST['course_id'] ) ? absint( $_POST['course_id'] ) : 0;
		if ( '' === $title || '' === $body ) {
			$this->redirect( 'error', __( 'Enter a title and a message.', 'yallapp' ) );
		}
		$push    = $this->plugin->push();
		$sent    = $push->announce( $title, $body, $course_id );
		$academy = 'lms' === $this->app_type();
		if ( ! $push->is_configured() ) {
			$this->redirect( 'success', $academy ? __( 'Saved to your students\' notifications in the app. Upload your Firebase service account file to also send it as a push notification.', 'yallapp' ) : __( 'Saved to the notifications in the app. Upload your Firebase service account file to also send it as a push notification.', 'yallapp' ) );
		}
		/* translators: %d: number of students. */
		$students = sprintf( _n( 'Sending to %d student.', 'Sending to %d students.', $sent, 'yallapp' ), $sent );
		/* translators: %d: number of people. */
		$people = sprintf( _n( 'Sending to %d person.', 'Sending to %d people.', $sent, 'yallapp' ), $sent );
		$this->redirect( 'success', $academy ? $students : $people );
	}

	/**
	 * Unlinks a student's device.
	 *
	 * @return void
	 */
	public function unlink() {
		$this->guard();
		check_admin_referer( 'yallapp_unlink' );
		$user_id = isset( $_POST['user_id'] ) ? absint( $_POST['user_id'] ) : 0;
		$row_id  = isset( $_POST['row_id'] ) ? absint( $_POST['row_id'] ) : 0;
		$search  = isset( $_POST['device_search'] ) ? sanitize_text_field( wp_unslash( $_POST['device_search'] ) ) : '';
		$this->plugin->devices()->remove( $user_id, $row_id );
		$this->redirect( 'success', __( 'Device unlinked. Whoever used it is signed out on it.', 'yallapp' ), array( 'device_search' => $search ) );
	}

	/**
	 * Stops users who can't manage settings.
	 *
	 * @return void
	 */
	private function guard() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You are not allowed to change Yallapp settings.', 'yallapp' ), 403 );
		}
	}

	/**
	 * Redirects back with a notice.
	 *
	 * @param string $type    success or error.
	 * @param string $message Message.
	 * @param array  $args    Extra query arguments.
	 * @return void
	 */
	private function redirect( $type, $message, array $args = array() ) {
		set_transient(
			'yallapp_notice_' . get_current_user_id(),
			array(
				'type'    => $type,
				'message' => $message,
			),
			MINUTE_IN_SECONDS
		);
		wp_safe_redirect( self::url( array_filter( $args ) ) );
		exit;
	}

	/**
	 * Prints the pending notice.
	 *
	 * @return void
	 */
	private function notice() {
		$key    = 'yallapp_notice_' . get_current_user_id();
		$notice = get_transient( $key );
		if ( ! is_array( $notice ) ) {
			return;
		}
		delete_transient( $key );
		printf(
			'<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
			'success' === $notice['type'] ? 'success' : 'error',
			esc_html( $notice['message'] )
		);
	}

	/**
	 * License card.
	 *
	 * @return void
	 */
	private function license_card() {
		$client = $this->plugin->license();
		$status = $client->status();
		$key    = (string) $this->values['license_key'];
		$labels = array(
			'none'      => __( 'Not activated', 'yallapp' ),
			'active'    => __( 'Active', 'yallapp' ),
			'expired'   => __( 'Expired', 'yallapp' ),
			'suspended' => __( 'Suspended', 'yallapp' ),
			'invalid'   => __( 'Not valid', 'yallapp' ),
		);
		$state  = $client->is_active() ? 'active' : $status['status'];
		$this->open( __( 'License', 'yallapp' ), '<span class="ya-pill ya-pill-' . esc_attr( 'active' === $state ? 'ok' : 'warn' ) . '">' . esc_html( $labels[ $state ] ?? $labels['invalid'] ) . '</span>' );
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="ya-inline">';
		echo '<input type="hidden" name="action" value="yallapp_license">';
		wp_nonce_field( 'yallapp_license' );
		if ( '' === $key ) {
			echo '<label class="ya-field"><span>' . esc_html__( 'License key', 'yallapp' ) . '</span><input type="text" name="license_key" class="regular-text code" placeholder="YALL-XXXX-XXXX-XXXX" autocomplete="off"></label>';
			echo '<button class="button button-primary" name="task" value="activate">' . esc_html__( 'Activate', 'yallapp' ) . '</button>';
			echo '<p class="ya-help">' . esc_html__( 'Find your key in your Yallapp dashboard on yallapp.com.tr.', 'yallapp' ) . '</p>';
		} else {
			echo '<dl class="ya-facts">';
			$this->fact( __( 'License key', 'yallapp' ), substr( $key, 0, 5 ) . str_repeat( '•', max( 0, strlen( $key ) - 9 ) ) . substr( $key, -4 ) );
			$this->fact( __( 'Plan', 'yallapp' ), $status['plan'] ? ucfirst( $status['plan'] ) : '—' );
			$this->fact( __( 'Licensed domain', 'yallapp' ), (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
			$this->fact( __( 'Renews on', 'yallapp' ), $status['expires_at'] ? date_i18n( get_option( 'date_format' ), strtotime( $status['expires_at'] ) ) : '—' );
			$this->fact( __( 'Plugin version', 'yallapp' ), YALLAPP_VERSION );
			$this->fact( __( 'Last checked', 'yallapp' ), $status['checked_at'] ? date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $status['checked_at'] ) ) : '—' );
			echo '</dl>';
			if ( $status['message'] ) {
				echo '<p class="ya-help">' . esc_html( $status['message'] ) . '</p>';
			}
			echo '<div class="ya-actions"><button class="button" name="task" value="check">' . esc_html__( 'Check now', 'yallapp' ) . '</button> ';
			echo '<button class="button-link ya-danger" name="task" value="deactivate">' . esc_html__( 'Deactivate on this site', 'yallapp' ) . '</button></div>';
		}
		if ( ! $client::enforced() ) {
			echo '<p class="ya-help">' . esc_html__( 'Test mode: the app works on this site without an active license.', 'yallapp' ) . '</p>';
		}
		echo '</form>';
		$this->close();
	}

	/**
	 * App layout card: the pages and look published in the Yallapp dashboard.
	 *
	 * @return void
	 */
	private function layout_card() {
		$state     = $this->plugin->layout_client()->state();
		$published = null !== $state['layout'];
		$format    = get_option( 'date_format' ) . ' ' . get_option( 'time_format' );
		$this->open( __( 'App pages and look', 'yallapp' ), '<span class="ya-pill ya-pill-' . ( $published ? 'ok' : 'warn' ) . '">' . esc_html( $published ? __( 'Published', 'yallapp' ) : __( 'Default pages', 'yallapp' ) ) . '</span>' );
		echo '<p class="ya-help">' . esc_html__( 'Build your app\'s pages, tabs, look and languages in your Yallapp dashboard. This site fetches them every 15 minutes and fills them with its own content.', 'yallapp' ) . '</p>';
		echo '<dl class="ya-facts">';
		$this->fact( __( 'Layout version', 'yallapp' ), $published ? (string) $state['layout']['version'] : __( 'None published yet', 'yallapp' ) );
		$this->fact( __( 'Last fetched', 'yallapp' ), $state['fetched_at'] ? (string) wp_date( $format, $state['fetched_at'] ) : '—' );
		echo '</dl>';
		if ( '' === (string) $this->values['license_key'] ) {
			echo '<p class="ya-help">' . esc_html__( 'Activate your license to use the pages you publish in your Yallapp dashboard. Until then the app shows the default pages.', 'yallapp' ) . '</p>';
		} elseif ( $state['error'] ) {
			echo '<p class="ya-help">' . esc_html( $state['error'] ) . '</p>';
		}
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="ya-inline">';
		echo '<input type="hidden" name="action" value="yallapp_layout">';
		wp_nonce_field( 'yallapp_layout' );
		echo '<div class="ya-actions"><button class="button"' . disabled( '' === (string) $this->values['license_key'], true, false ) . '>' . esc_html__( 'Refresh app layout', 'yallapp' ) . '</button></div>';
		echo '</form>';
		$this->close();
	}

	/**
	 * Compatibility card.
	 *
	 * @return void
	 */
	private function compatibility_card() {
		$detector = $this->plugin->detector();
		$lms      = $detector->lms();
		$digits   = $detector->digits();
		$woo      = $detector->woocommerce();
		$this->open( __( 'Compatibility status', 'yallapp' ) );
		echo '<ul class="ya-status">';
		if ( $lms ) {
			$this->status_row( __( 'LMS plugin (detected)', 'yallapp' ), $lms['name'] . ' ' . $lms['version'], $lms['supported'], $lms['supported'] ? __( 'Compatible', 'yallapp' ) : __( 'Support is coming soon', 'yallapp' ) );
			$this->status_row( __( 'Premium add-ons', 'yallapp' ), $lms['pro'] ? __( 'Active', 'yallapp' ) : __( 'Not installed', 'yallapp' ), true, __( 'Premium features appear when active', 'yallapp' ) );
		} elseif ( 'lms' !== $this->app_type() ) {
			// 31 Only Academy apps need one.
			$this->status_row( __( 'LMS plugin', 'yallapp' ), __( 'Not found', 'yallapp' ), true, __( 'Needed only for an Academy app', 'yallapp' ) );
		} else {
			$this->status_row( __( 'LMS plugin', 'yallapp' ), __( 'Not found', 'yallapp' ), false, __( 'Install and activate Tutor LMS', 'yallapp' ) );
		}
		$choice = $this->plugin->otp_choice();
		$notice = $this->otp_notice( $choice, $digits );
		$this->status_row(
			__( 'Sign-in codes', 'yallapp' ),
			self::provider_names()[ $choice['id'] ],
			$choice['available'],
			'' !== $notice ? $notice : __( 'Ready', 'yallapp' )
		);
		if ( $digits['api'] ) {
			$digits_note = __( 'Its REST API add-on is installed, so you can choose Digits to send sign-in codes. Its accounts sign in with the same number either way.', 'yallapp' );
		} elseif ( $digits['active'] ) {
			$digits_note = __( 'Digits\' REST API add-on isn\'t installed, so Yallapp sends the sign-in codes on WhatsApp. Digits accounts still sign in with the same number, and your website\'s sign-in keeps working as before.', 'yallapp' );
		} else {
			$digits_note = __( 'Optional: Yallapp sends the sign-in codes on WhatsApp', 'yallapp' );
		}
		$this->status_row(
			__( 'Digits', 'yallapp' ),
			$digits['active'] ? ( '' !== $digits['version'] ? $digits['version'] : __( 'Active', 'yallapp' ) ) : __( 'Not found', 'yallapp' ),
			true,
			$digits_note
		);
		if ( $digits['addons'] ) {
			$names = array();
			foreach ( $digits['addons'] as $addon ) {
				$names[] = trim( $addon['name'] . ' ' . $addon['version'] );
			}
			$this->status_row(
				__( 'Digits add-ons', 'yallapp' ),
				implode( ', ', $names ),
				true,
				Adapter_Choice::DIGITS === $choice['id'] ? __( 'Codes go out through the gateway you choose in Digits', 'yallapp' ) : __( 'Used by your website\'s own sign-in; the app\'s codes are sent by Yallapp', 'yallapp' )
			);
		}
		$checkout = $lms && 'tutor' === $lms['id'] && function_exists( 'tutor_utils' ) && 'wc' === tutor_utils()->get_option( 'monetize_by' );
		$this->status_row(
			__( 'WooCommerce', 'yallapp' ),
			$woo['active'] ? $woo['version'] : __( 'Not found', 'yallapp' ),
			true,
			$woo['active'] && $checkout ? __( 'Linked to your LMS checkout', 'yallapp' ) : ( $woo['active'] && ! $lms ? __( 'Used by your Store app', 'yallapp' ) : __( 'Optional', 'yallapp' ) )
		);
		echo '</ul>';
		$this->close();
	}

	/**
	 * General card.
	 *
	 * @return void
	 */
	private function general_card() {
		$this->open( __( 'General', 'yallapp' ) );
		$this->toggle( 'api_enabled', __( 'Enable the app API', 'yallapp' ), __( 'Turn off to stop the app from loading anything from this site.', 'yallapp' ) );
		$this->text( 'app_name', __( 'App name', 'yallapp' ), get_bloginfo( 'name' ) );
		$this->image( 'logo_id', __( 'Logo', 'yallapp' ) );
		$this->color( 'primary_color', __( 'Primary color', 'yallapp' ) );
		$this->text( 'support_whatsapp', __( 'Support WhatsApp number', 'yallapp' ), '+90 5xx xxx xx xx' );
		$this->text( 'support_email', __( 'Support email', 'yallapp' ), 'help@example.com' );
		$this->page( 'terms_page_id', __( 'Terms & Conditions page', 'yallapp' ) );
		$this->page( 'privacy_page_id', __( 'Privacy Policy page', 'yallapp' ) );
		$this->close();
	}

	/**
	 * Sign-in card.
	 *
	 * @return void
	 */
	private function sign_in_card() {
		$this->open( __( 'Sign-in', 'yallapp' ) );
		$this->radios(
			'sign_in_methods',
			__( 'People sign in with', 'yallapp' ),
			array(
				'phone' => __( 'Their phone number and a code', 'yallapp' ),
				'email' => __( 'Their email address', 'yallapp' ),
				'both'  => __( 'Either: the app shows a Phone / Email switch', 'yallapp' ),
			)
		);
		$this->radios(
			'email_sign_in',
			__( 'Email sign-in works', 'yallapp' ),
			array(
				'password' => __( 'With their password: existing accounts only', 'yallapp' ),
				'code'     => __( 'With a code by email: anyone can sign up (Yallapp emails the code)', 'yallapp' ),
			)
		);
		$platform = $this->plugin->license()->status()['sign_in_methods'];
		$way      = $this->plugin->license()->status()['email_sign_in'];
		if ( \Yallapp\Otp\Methods::from_platform( $platform ) && $this->plugin->license()->has_key() ) {
			$by_code = \Yallapp\Otp\Methods::CODE === $this->plugin->sign_in()->email_way();
			$names   = array(
				'phone' => __( 'phone number', 'yallapp' ),
				'email' => $by_code ? __( 'email and a code', 'yallapp' ) : __( 'email and password', 'yallapp' ),
			);
			$chosen  = array();
			foreach ( $this->plugin->sign_in()->methods() as $method ) {
				$chosen[] = $names[ $method ];
			}
			/* translators: %s: sign-in methods, such as "phone number, email and password". */
			echo '<p class="ya-help"><span class="ya-pill ya-pill-warn">' . esc_html( sprintf( __( 'Chosen on your Yallapp dashboard\'s App sign-in page: %s. That choice replaces this setting.', 'yallapp' ), implode( ', ', $chosen ) ) ) . '</span></p>';
		}
		if ( null !== $way && $this->plugin->license()->has_key() ) {
			echo '<p class="ya-help"><span class="ya-pill ya-pill-warn">' . esc_html( 'code' === $way ? __( 'Chosen on your Yallapp dashboard: email sign-in with a code. That choice replaces this setting.', 'yallapp' ) : __( 'Chosen on your Yallapp dashboard: email sign-in with the password. That choice replaces this setting.', 'yallapp' ) ) . '</span></p>';
		}
		echo '<p class="ya-help">' . esc_html__( 'With the password, only people who already have an account on this website sign in by email, and WordPress checks the password with your security plugins. With a code, Yallapp emails a 6-digit code (from your own address when you set one in your Yallapp dashboard), and people without an account sign up when sign-up from the app is allowed. Staff accounts that can edit the site never sign in by code. Needs an active license.', 'yallapp' ) . '</p>';
		$this->provider_choice();
		$this->toggle( 'signup_allowed', __( 'Allow new accounts to sign up from the app', 'yallapp' ) );
		$this->checks(
			'signup_fields',
			__( 'Required at sign-up', 'yallapp' ),
			array(
				'name'  => __( 'Name', 'yallapp' ),
				'email' => __( 'Email', 'yallapp' ),
				'city'  => __( 'City', 'yallapp' ),
			),
			array( 'name' )
		);
		$this->text( 'default_country_code', __( 'Default country code', 'yallapp' ), '+90' );
		$this->select(
			'resend_seconds',
			__( 'Wait before resending code', 'yallapp' ),
			array(
				30  => __( '30 seconds', 'yallapp' ),
				60  => __( '60 seconds', 'yallapp' ),
				120 => __( '120 seconds', 'yallapp' ),
			)
		);
		$this->number( 'max_code_requests_per_hour', __( 'Max code requests per hour', 'yallapp' ), 1, 20 );
		$this->select(
			'session_days',
			__( 'Keep people signed in for', 'yallapp' ),
			array(
				7  => __( '7 days', 'yallapp' ),
				30 => __( '30 days', 'yallapp' ),
				90 => __( '90 days', 'yallapp' ),
			)
		);
		$this->number( 'device_limit', __( 'Devices per account', 'yallapp' ), 1, 10 );
		$this->radios(
			'device_limit_action',
			__( 'When someone reaches the device limit', 'yallapp' ),
			array(
				'block'          => __( 'Block the new device until an admin unlinks one', 'yallapp' ),
				'replace_oldest' => __( 'Sign out the oldest device automatically', 'yallapp' ),
			)
		);
		echo '<fieldset class="ya-sub"><legend>' . esc_html__( 'Store review access', 'yallapp' ) . '</legend>';
		echo '<p class="ya-help">' . esc_html__( 'Apple and Google reviewers need to sign in. This number gets no code and accepts the fixed code. With email sign-in, reviewers type the test email address (not a staff account) and the fixed code as the password; apps that sign in by email only need it. Keep it on while your app is in review.', 'yallapp' ) . '</p>';
		$this->toggle( 'review_access_enabled', __( 'Turn on store review access', 'yallapp' ) );
		$this->text( 'review_phone', __( 'Test number', 'yallapp' ), '+90 500 000 00 00' );
		$this->text( 'review_email', __( 'Test email', 'yallapp' ), 'review@your-site.com' );
		$this->text( 'review_code', __( 'Fixed code', 'yallapp' ), '000000' );
		echo '</fieldset>';
		$this->close();
	}

	/**
	 * Who sends sign-in codes: Yallapp (default), Digits, or development codes on a local site.
	 *
	 * @return void
	 */
	private function provider_choice() {
		$adapters = $this->plugin->otp_adapters();
		$choice   = $this->plugin->otp_choice();
		$digits   = $this->plugin->detector()->digits();
		$options  = array(
			Adapter_Choice::YALLAPP => array(
				self::provider_names()[ Adapter_Choice::YALLAPP ] . ' ' . __( '(recommended)', 'yallapp' ),
				$adapters[ Adapter_Choice::YALLAPP ]->is_available()
					? __( 'Yallapp sends each code on WhatsApp with your app\'s name. Nothing to set up.', 'yallapp' )
					: __( 'Yallapp sends each code on WhatsApp with your app\'s name. Needs an active license.', 'yallapp' ),
			),
			Adapter_Choice::DIGITS  => array(
				self::provider_names()[ Adapter_Choice::DIGITS ],
				$adapters[ Adapter_Choice::DIGITS ]->is_available()
					? __( 'Available: codes go out through the SMS or WhatsApp gateway set up in Digits.', 'yallapp' )
					: ( $digits['active']
						? __( 'Not available: needs Digits\' REST API add-on, which isn\'t installed.', 'yallapp' )
						: __( 'Not available: needs Digits and its REST API add-on.', 'yallapp' ) ),
			),
		);
		if ( Dev_Adapter::allowed() || Adapter_Choice::DEV === $this->values['otp_provider'] ) {
			$options[ Adapter_Choice::DEV ] = array(
				self::provider_names()[ Adapter_Choice::DEV ],
				Dev_Adapter::allowed()
					? __( 'For testing on this site only: every code is 123456 and nothing is sent.', 'yallapp' )
					: __( 'Not available: only on a local or development site that defines YALLAPP_DEV_OTP.', 'yallapp' ),
			);
		}
		echo '<div class="ya-row" role="radiogroup" aria-labelledby="ya-otp-provider"><span class="ya-label" id="ya-otp-provider">' . esc_html__( 'Sign-in codes are sent by', 'yallapp' ) . '</span><div class="ya-choices">';
		foreach ( $options as $value => $option ) {
			printf(
				'<label><input type="radio" name="%1$s" value="%2$s"%3$s> %4$s<br><span class="ya-help">%5$s</span></label>',
				esc_attr( self::name( 'otp_provider' ) ),
				esc_attr( $value ),
				checked( (string) $this->values['otp_provider'], $value, false ),
				esc_html( $option[0] ),
				esc_html( $option[1] )
			);
		}
		echo '</div></div>';
		$notice = $this->otp_notice( $choice, $digits );
		if ( '' !== $notice ) {
			echo '<p class="ya-help"><span class="ya-pill ya-pill-warn">' . esc_html( $notice ) . '</span></p>';
		}
		$error = Adapter_Choice::YALLAPP === $choice['id'] ? Yallapp_Adapter::last_error() : null;
		if ( $error ) {
			/* translators: 1: date and time, 2: reason. */
			echo '<p class="ya-help">' . esc_html( sprintf( __( 'The last code that couldn\'t be sent (%1$s): %2$s', 'yallapp' ), wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $error['at'] ), $error['message'] ) ) . '</p>';
		}
		echo '<p class="ya-help">' . esc_html__( 'Whoever sends the codes, people sign in to the same account with the same number, also the accounts made with Digits.', 'yallapp' ) . '</p>';
	}

	/**
	 * Names of the code providers.
	 *
	 * @return array<string, string>
	 */
	private static function provider_names() {
		return array(
			Adapter_Choice::YALLAPP => __( 'Sent by Yallapp (WhatsApp)', 'yallapp' ),
			Adapter_Choice::DIGITS  => __( 'Digits', 'yallapp' ),
			Adapter_Choice::DEV     => __( 'Development codes (123456)', 'yallapp' ),
		);
	}

	/**
	 * In plain words, why the saved choice isn't the one sending codes, or why nothing can. Empty when all is well.
	 *
	 * @param array $choice Adapter_Choice::resolve() result.
	 * @param array $digits Detector::digits().
	 * @return string
	 */
	private function otp_notice( array $choice, array $digits ) {
		if ( ! $choice['fallback'] && $choice['available'] ) {
			return '';
		}
		$why     = array(
			Adapter_Choice::YALLAPP => __( 'your Yallapp license isn\'t active on this site', 'yallapp' ),
			Adapter_Choice::DIGITS  => $digits['active'] ? __( 'Digits\' REST API add-on isn\'t installed', 'yallapp' ) : __( 'Digits isn\'t installed', 'yallapp' ),
			Adapter_Choice::DEV     => __( 'development codes work only on a local or development site that defines YALLAPP_DEV_OTP', 'yallapp' ),
		);
		$instead = array(
			Adapter_Choice::YALLAPP => __( 'Yallapp sends the codes on WhatsApp instead', 'yallapp' ),
			Adapter_Choice::DIGITS  => __( 'Digits sends the codes instead', 'yallapp' ),
			Adapter_Choice::DEV     => __( 'the development code 123456 is used instead', 'yallapp' ),
		);
		$names   = self::provider_names();
		if ( $choice['fallback'] ) {
			/* translators: 1: chosen provider, 2: why it can't send codes, 3: who sends them instead. */
			return sprintf( __( 'You chose %1$s, but %2$s, so %3$s.', 'yallapp' ), $names[ $choice['saved'] ], $why[ $choice['saved'] ], $instead[ $choice['id'] ] );
		}
		if ( Adapter_Choice::YALLAPP === $choice['saved'] ) {
			return __( 'Nobody can sign in to the app yet: activate your Yallapp license above, and Yallapp sends the sign-in codes on WhatsApp.', 'yallapp' );
		}
		/* translators: 1: chosen provider, 2: why it can't send codes. */
		return sprintf( __( '%1$s can\'t send sign-in codes because %2$s, and nothing else can either. Activate your Yallapp license above to have Yallapp send them.', 'yallapp' ), $names[ $choice['saved'] ], $why[ $choice['saved'] ] );
	}

	/**
	 * Purchases card.
	 *
	 * @return void
	 */
	private function purchases_card() {
		$this->open( __( 'Purchases', 'yallapp' ) );
		$this->toggle( 'android_enroll_button', __( '"Enroll now" button on Android', 'yallapp' ), __( 'Opens your website checkout with the student signed in.', 'yallapp' ) );
		echo '<div class="ya-row ya-disabled"><span class="ya-label">' . esc_html__( '"Enroll now" button on iOS', 'yallapp' ) . '</span><span class="ya-help">' . esc_html__( 'Disabled due to Apple\'s digital content policy. iOS is view-only.', 'yallapp' ) . '</span></div>';
		$this->toggle( 'free_enrollment', __( 'Free courses: enroll directly in the app (Android & iOS)', 'yallapp' ) );
		$this->radios(
			'checkout_opens_in',
			__( 'Where checkout opens', 'yallapp' ),
			array(
				'in_app'  => __( 'Inside the app, with the student signed in automatically', 'yallapp' ),
				'browser' => __( 'In the phone\'s browser', 'yallapp' ),
			)
		);
		$this->toggle( 'hide_site_chrome_in_app', __( 'Hide site header & footer on in-app checkout', 'yallapp' ) );
		$this->close();
	}

	/**
	 * 31 Checkout card, for Store apps: where the site's checkout opens.
	 *
	 * @return void
	 */
	private function checkout_card() {
		$this->open( __( 'Checkout', 'yallapp' ) );
		$this->radios(
			'checkout_opens_in',
			__( 'Where checkout opens', 'yallapp' ),
			array(
				'in_app'  => __( 'Inside the app, with the customer signed in automatically', 'yallapp' ),
				'browser' => __( 'In the phone\'s browser', 'yallapp' ),
			)
		);
		$this->toggle( 'hide_site_chrome_in_app', __( 'Hide site header & footer on in-app checkout', 'yallapp' ) );
		echo '<p class="ya-help">' . esc_html__( 'Physical products are bought on both phones. The iPhone app never sells virtual or downloadable products.', 'yallapp' ) . '</p>';
		$this->close();
	}

	/**
	 * 31 Bookings card, for Bookings apps: the app's home screen and cancelling in the app.
	 *
	 * @return void
	 */
	private function bookings_card() {
		$labels  = array(
			'banner'           => __( 'Promo banner', 'yallapp' ),
			'next_appointment' => __( 'The customer\'s next appointment', 'yallapp' ),
			'categories'       => __( 'Categories', 'yallapp' ),
			'services'         => __( 'Services', 'yallapp' ),
			'staff'            => __( 'Staff', 'yallapp' ),
		);
		$enabled = (array) $this->values['bookings_home_sections'];
		$order   = array_merge( $enabled, array_diff( array_keys( $labels ), $enabled ) );
		$this->open( __( 'Bookings app', 'yallapp' ) );
		echo '<div class="ya-row"><span class="ya-label">' . esc_html__( 'Home sections shown (drag to reorder)', 'yallapp' ) . '</span>';
		echo '<input type="hidden" name="yallapp[bookings_home_sections][]" value="">';
		echo '<ul class="ya-sortable">';
		foreach ( $order as $section ) {
			if ( ! isset( $labels[ $section ] ) ) {
				continue;
			}
			printf(
				'<li><span class="ya-grip" aria-hidden="true">⋮⋮</span><label><input type="checkbox" name="yallapp[bookings_home_sections][]" value="%1$s"%2$s> %3$s</label></li>',
				esc_attr( $section ),
				checked( in_array( $section, $enabled, true ), true, false ),
				esc_html( $labels[ $section ] )
			);
		}
		echo '</ul></div>';
		$this->image( 'bookings_banner_image_id', __( 'Promo banner image', 'yallapp' ) );
		$services = array( 0 => __( 'None', 'yallapp' ) );
		$adapter  = $this->plugin->bookings();
		if ( $adapter ) {
			$list = $adapter->services(
				array(
					'page'     => 1,
					'per_page' => 100,
					'search'   => '',
					'category' => 0,
				)
			);
			foreach ( $list['items'] as $service ) {
				$services[ (int) $service['id'] ] = (string) $service['name'];
			}
		}
		$this->select( 'bookings_banner_service_id', __( 'Banner opens service', 'yallapp' ), $services );
		$this->toggle( 'bookings_cancel', __( 'Customers can cancel appointments in the app', 'yallapp' ), __( 'Only while your booking plugin\'s own rules allow it.', 'yallapp' ) );
		$this->close();
	}

	/**
	 * Video card.
	 *
	 * @return void
	 */
	private function video_card() {
		$this->open( __( 'Video & content protection', 'yallapp' ) );
		$this->toggle( 'block_screen_capture', __( 'Block screenshots & screen recording', 'yallapp' ) );
		$this->select(
			'watermark',
			__( 'Video watermark', 'yallapp' ),
			array(
				'off'            => __( 'Off', 'yallapp' ),
				'phone'          => __( 'Phone number', 'yallapp' ),
				'name'           => __( 'Student name', 'yallapp' ),
				'name_and_phone' => __( 'Name & phone number', 'yallapp' ),
			)
		);
		$this->select(
			'video_link_ttl',
			__( 'Temporary video link expires after', 'yallapp' ),
			array(
				1800  => __( '30 minutes', 'yallapp' ),
				7200  => __( '2 hours', 'yallapp' ),
				21600 => __( '6 hours', 'yallapp' ),
			)
		);
		$this->select(
			'required_watch_percent',
			__( 'Required watch time before "Mark as complete"', 'yallapp' ),
			array(
				0   => __( 'No requirement', 'yallapp' ),
				80  => '80%',
				100 => '100%',
			)
		);
		$this->toggle( 'offline_downloads', __( 'Allow offline downloads', 'yallapp' ), __( 'Students can save lessons and whole courses to watch and read without the internet. Files are stored encrypted inside the app and deleted when the student\'s access ends. Lessons whose video plays from YouTube, Vimeo or another video site can\'t be saved. Needs a plan with offline mode; a choice made on the Yallapp dashboard\'s Courses page wins.', 'yallapp' ) );
		$chosen = $this->plugin->license()->has_key() ? ( $this->plugin->license()->status()['offline_downloads'] ?? null ) : null;
		if ( is_bool( $chosen ) ) {
			echo '<p class="ya-help"><span class="ya-pill ya-pill-warn">' . esc_html( $chosen ? __( 'Chosen on your Yallapp dashboard: downloads on. That choice replaces this setting.', 'yallapp' ) : __( 'Chosen on your Yallapp dashboard: downloads off. That choice replaces this setting.', 'yallapp' ) ) . '</span></p>';
		}
		$this->close();
	}

	/**
	 * Lesson content card.
	 *
	 * @return void
	 */
	private function content_card() {
		$this->open( __( 'Lesson content (HTML & code)', 'yallapp' ) );
		$this->radios(
			'render_mode',
			__( 'How lesson content is displayed', 'yallapp' ),
			array(
				'auto'    => __( 'Auto: native for simple content, web view for complex content', 'yallapp' ),
				'native'  => __( 'Always native', 'yallapp' ),
				'webview' => __( 'Always web view (exactly like the website)', 'yallapp' ),
			)
		);
		$this->toggle( 'theme_styles_in_webview', __( 'Load the site\'s theme styles in web view', 'yallapp' ) );
		$this->toggle( 'allow_scripts', __( 'Allow scripts inside lesson content', 'yallapp' ) );
		$this->toggle( 'code_highlighting', __( 'Syntax highlighting & copy button for code blocks', 'yallapp' ) );
		$this->toggle( 'embed_fullscreen_button', __( 'Full-screen button on embedded apps (iframes)', 'yallapp' ) );
		$this->radios(
			'embed_height',
			__( 'Embedded app height on phones', 'yallapp' ),
			array(
				'auto'       => __( 'Auto: match the embedded content (recommended)', 'yallapp' ),
				'fit_screen' => __( 'Fit the screen', 'yallapp' ),
				'as_set'     => __( 'Keep the height set in the lesson', 'yallapp' ),
			)
		);
		echo '<p class="ya-help">' . esc_html__( 'Each lesson can override this from its edit screen.', 'yallapp' ) . '</p>';
		$this->close();
	}

	/**
	 * Home screen card.
	 *
	 * @return void
	 */
	private function home_card() {
		$labels  = array(
			'banner'            => __( 'Promo banner', 'yallapp' ),
			'continue_learning' => __( 'Continue learning', 'yallapp' ),
			'categories'        => __( 'Categories', 'yallapp' ),
			'featured_courses'  => __( 'Featured courses (hand-picked)', 'yallapp' ),
			'latest_courses'    => __( 'Latest courses', 'yallapp' ),
		);
		$enabled = (array) $this->values['home_sections'];
		$order   = array_merge( $enabled, array_diff( array_keys( $labels ), $enabled ) );
		$this->open( __( 'App home screen', 'yallapp' ) );
		echo '<div class="ya-row"><span class="ya-label">' . esc_html__( 'Sections shown (drag to reorder)', 'yallapp' ) . '</span>';
		echo '<input type="hidden" name="yallapp[home_sections][]" value="">';
		echo '<ul class="ya-sortable">';
		foreach ( $order as $section ) {
			if ( ! isset( $labels[ $section ] ) ) {
				continue;
			}
			printf(
				'<li><span class="ya-grip" aria-hidden="true">⋮⋮</span><label><input type="checkbox" name="yallapp[home_sections][]" value="%1$s"%2$s> %3$s</label></li>',
				esc_attr( $section ),
				checked( in_array( $section, $enabled, true ), true, false ),
				esc_html( $labels[ $section ] )
			);
		}
		echo '</ul></div>';
		$this->image( 'banner_image_id', __( 'Promo banner image', 'yallapp' ) );
		$courses = $this->course_options();
		$this->select( 'banner_course_id', __( 'Banner opens course', 'yallapp' ), array( 0 => __( 'None', 'yallapp' ) ) + $courses );
		echo '<label class="ya-row"><span class="ya-label">' . esc_html__( 'Featured courses', 'yallapp' ) . '</span>';
		echo '<input type="hidden" name="yallapp[featured_course_ids][]" value="">';
		echo '<span><select name="yallapp[featured_course_ids][]" multiple size="6" class="ya-multi">';
		foreach ( $courses as $id => $title ) {
			printf( '<option value="%1$d"%2$s>%3$s</option>', (int) $id, selected( in_array( (int) $id, (array) $this->values['featured_course_ids'], true ), true, false ), esc_html( $title ) );
		}
		echo '</select><br><span class="ya-help">' . esc_html__( 'Hold Ctrl or Cmd to pick more than one.', 'yallapp' ) . '</span></span></label>';
		$this->close();
	}

	/**
	 * Store card: home screen sections and delivery options for Store apps.
	 *
	 * @return void
	 */
	private function store_card() {
		$labels  = array(
			'banner'            => __( 'Promo banner', 'yallapp' ),
			'categories'        => __( 'Categories', 'yallapp' ),
			'featured_products' => __( 'Featured products', 'yallapp' ),
			'sale_products'     => __( 'On sale', 'yallapp' ),
			'new_products'      => __( 'New arrivals', 'yallapp' ),
			'best_sellers'      => __( 'Best sellers', 'yallapp' ),
		);
		$enabled = (array) $this->values['store_home_sections'];
		$order   = array_merge( $enabled, array_diff( array_keys( $labels ), $enabled ) );
		$this->open( __( 'Store app', 'yallapp' ) );
		echo '<div class="ya-row"><span class="ya-label">' . esc_html__( 'Home sections shown (drag to reorder)', 'yallapp' ) . '</span>';
		echo '<input type="hidden" name="yallapp[store_home_sections][]" value="">';
		echo '<ul class="ya-sortable">';
		foreach ( $order as $section ) {
			if ( ! isset( $labels[ $section ] ) ) {
				continue;
			}
			printf(
				'<li><span class="ya-grip" aria-hidden="true">⋮⋮</span><label><input type="checkbox" name="yallapp[store_home_sections][]" value="%1$s"%2$s> %3$s</label></li>',
				esc_attr( $section ),
				checked( in_array( $section, $enabled, true ), true, false ),
				esc_html( $labels[ $section ] )
			);
		}
		echo '</ul><span class="ya-help">' . esc_html__( 'Featured products are the ones starred in WooCommerce.', 'yallapp' ) . '</span></div>';
		$this->image( 'store_banner_image_id', __( 'Promo banner image', 'yallapp' ) );
		$this->select( 'store_banner_product_id', __( 'Banner opens product', 'yallapp' ), array( 0 => __( 'None', 'yallapp' ) ) + $this->product_options() );
		$categories = array( 0 => __( 'None', 'yallapp' ) );
		foreach ( ( new \Yallapp\Store\Catalog() )->categories() as $category ) {
			$categories[ $category['id'] ] = $category['name'];
		}
		$this->select( 'store_banner_category_id', __( 'Or opens category', 'yallapp' ), $categories );
		$this->toggle( 'store_delivery_date', __( 'Ask for a delivery date in the cart', 'yallapp' ), __( 'Saved on the order and shown in the order screen and emails. Useful for flower and gift shops.', 'yallapp' ) );
		$this->toggle( 'store_delivery_date_required', __( 'The delivery date is required', 'yallapp' ) );
		$this->number( 'store_delivery_min_days', __( 'Earliest delivery (days from today)', 'yallapp' ), 0, 60 );
		$this->number( 'store_delivery_max_days', __( 'Latest delivery (days from today)', 'yallapp' ), 0, 365 );
		$this->checks(
			'store_closed_weekdays',
			__( 'No deliveries on', 'yallapp' ),
			array(
				'1' => __( 'Monday', 'yallapp' ),
				'2' => __( 'Tuesday', 'yallapp' ),
				'3' => __( 'Wednesday', 'yallapp' ),
				'4' => __( 'Thursday', 'yallapp' ),
				'5' => __( 'Friday', 'yallapp' ),
				'6' => __( 'Saturday', 'yallapp' ),
				'0' => __( 'Sunday', 'yallapp' ),
			)
		);
		$this->toggle( 'store_gift_message', __( 'Let customers add a gift message', 'yallapp' ) );
		$this->number( 'store_gift_message_max', __( 'Gift message length (characters)', 'yallapp' ), 1, 500 );
		$this->close();
	}

	/**
	 * Published products for pickers.
	 *
	 * @return array<int, string>
	 */
	private function product_options() {
		$list = array();
		foreach ( get_posts(
			array(
				'post_type'      => 'product',
				'post_status'    => 'publish',
				'posts_per_page' => 200, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- Admin picker.
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		) as $post ) {
			$list[ (int) $post->ID ] = get_the_title( $post );
		}
		return $list;
	}

	/**
	 * Notifications card: the Firebase file, and (31) the notifications the app's type sends by itself.
	 *
	 * @param string|null $type App type.
	 * @return void
	 */
	private function notifications_card( $type ) {
		$this->open( __( 'Notifications (Firebase)', 'yallapp' ) );
		echo '<div class="ya-row"><span class="ya-label">' . esc_html__( 'Firebase service account file', 'yallapp' ) . '</span><div>';
		if ( '' !== (string) $this->plugin->settings()->get( 'firebase_service_account' ) ) {
			echo '<p><span class="ya-pill ya-pill-ok">' . esc_html__( 'Connected', 'yallapp' ) . '</span></p>';
			echo '<label><input type="checkbox" name="yallapp_firebase_remove" value="1"> ' . esc_html__( 'Remove the saved file', 'yallapp' ) . '</label><br>';
		}
		echo '<input type="file" name="yallapp_firebase" accept="application/json,.json">';
		echo '<p class="ya-help">' . esc_html__( 'Firebase > Project settings > Service accounts > Generate new private key. The file is stored encrypted.', 'yallapp' ) . '</p>';
		echo '</div></div>';
		$this->huawei_push_fields();
		$toggles = self::automatic_notifications_for( $type );
		if ( $toggles ) {
			$labels = array(
				'notify_new_lesson'   => array( __( 'A new lesson is added to an enrolled course', 'yallapp' ), '' ),
				'notify_announcement' => array( __( 'An instructor posts an announcement', 'yallapp' ), '' ),
				'notify_enrollment'   => array( __( 'An enrollment is confirmed after payment', 'yallapp' ), '' ),
				'notify_qna_answer'   => array( __( 'An instructor answers a student\'s question', 'yallapp' ), '' ),
				'notify_new_post'     => array(
					__( 'Notify app users about new posts', 'yallapp' ),
					__( 'Each new post goes to the notifications inbox and, with Firebase, to the phones of people signed in to the app. Untick it for one post in its "In the app" box.', 'yallapp' ),
				),
			);
			echo '<fieldset class="ya-sub"><legend>' . esc_html__( 'Send a notification automatically when', 'yallapp' ) . '</legend>';
			foreach ( $toggles as $key ) {
				$this->toggle( $key, $labels[ $key ][0], $labels[ $key ][1] );
			}
			echo '</fieldset>';
		}
		$this->close();
	}

	/**
	 * 36 Huawei Push Kit: Huawei phones without Google Play get notifications through it,
	 * in apps built with Huawei push (agconnect-services.json in the Yallapp dashboard).
	 *
	 * @return void
	 */
	private function huawei_push_fields() {
		$settings = $this->plugin->settings();
		$saved    = '' !== (string) $settings->get( 'huawei_push_app_id' ) && '' !== (string) $settings->get( 'huawei_push_app_secret' );
		echo '<div class="ya-row"><label class="ya-label" for="ya-huawei-app-id">' . esc_html__( 'Huawei Push Kit (optional)', 'yallapp' ) . '</label><div>';
		if ( $saved ) {
			echo '<p><span class="ya-pill ya-pill-ok">' . esc_html__( 'Connected', 'yallapp' ) . '</span></p>';
			echo '<label><input type="checkbox" name="yallapp_huawei_remove" value="1"> ' . esc_html__( 'Remove the Huawei details', 'yallapp' ) . '</label><br>';
		}
		echo '<input type="text" id="ya-huawei-app-id" name="yallapp[huawei_push_app_id]" inputmode="numeric" autocomplete="off" placeholder="' . esc_attr__( 'App ID', 'yallapp' ) . '" value="' . esc_attr( (string) $settings->get( 'huawei_push_app_id' ) ) . '"> ';
		echo '<input type="password" name="yallapp[huawei_push_app_secret]" autocomplete="off" placeholder="' . esc_attr( $saved ? __( 'App secret (saved)', 'yallapp' ) : __( 'App secret', 'yallapp' ) ) . '" aria-label="' . esc_attr__( 'App secret', 'yallapp' ) . '">';
		echo '<p class="ya-help">' . esc_html__( 'For Huawei phones without Google Play. AppGallery Connect > Project settings > App information: the app ID and the app secret. The secret is stored encrypted; leave it empty to keep the saved one.', 'yallapp' ) . '</p>';
		echo '</div></div>';
	}

	/**
	 * News & blog card: what articles show in the app.
	 *
	 * @return void
	 */
	private function news_card() {
		$this->open( __( 'News & blog', 'yallapp' ) );
		echo '<p class="ya-help">' . esc_html__( 'The app shows your published posts. Sticky posts are the top stories; private and password-protected posts never show.', 'yallapp' ) . '</p>';
		$this->toggle( 'news_show_author', __( 'Show who wrote each article', 'yallapp' ) );
		$this->toggle( 'news_show_dates', __( 'Show when each article was published', 'yallapp' ) );
		$this->close();
	}

	/**
	 * Updates card.
	 *
	 * @return void
	 */
	private function updates_card() {
		$this->open( __( 'Updates & maintenance', 'yallapp' ) );
		$this->text( 'min_app_version', __( 'Minimum allowed version (force update)', 'yallapp' ), '1.0.0' );
		$this->toggle( 'maintenance', __( 'Maintenance mode (the app shows a message only)', 'yallapp' ) );
		$name = 'yallapp[maintenance_message]';
		echo '<label class="ya-row"><span class="ya-label">' . esc_html__( 'Maintenance message', 'yallapp' ) . '</span><textarea name="' . esc_attr( $name ) . '" rows="3" class="large-text">' . esc_textarea( (string) $this->values['maintenance_message'] ) . '</textarea></label>';
		$this->close();
	}

	/**
	 * Manual notification card.
	 *
	 * @param string|null $type App type.
	 * @return void
	 */
	private function manual_push_card( $type ) {
		$this->open( __( 'Send a manual notification', 'yallapp' ) );
		if ( ! $this->plugin->push()->is_configured() ) {
			echo '<p class="ya-help">' . esc_html__( 'Messages appear in the app\'s notifications. Upload your Firebase service account file in Notifications to also send them as push notifications.', 'yallapp' ) . '</p>';
		}
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		echo '<input type="hidden" name="action" value="yallapp_push">';
		wp_nonce_field( 'yallapp_push' );
		echo '<label class="ya-row"><span class="ya-label">' . esc_html__( 'Send to', 'yallapp' ) . '</span><select name="course_id"><option value="0">' . esc_html__( 'Everyone with the app', 'yallapp' ) . '</option>';
		// 31 Sending to one course's students is for Academy apps.
		foreach ( 'lms' === $type ? $this->course_options() : array() as $id => $title ) {
			/* translators: %s: course title. */
			printf( '<option value="%1$d">%2$s</option>', (int) $id, esc_html( sprintf( __( 'Students of %s', 'yallapp' ), $title ) ) );
		}
		echo '</select></label>';
		echo '<label class="ya-row"><span class="ya-label">' . esc_html__( 'Title', 'yallapp' ) . '</span><input type="text" name="title" class="regular-text" maxlength="80" required></label>';
		echo '<label class="ya-row"><span class="ya-label">' . esc_html__( 'Message', 'yallapp' ) . '</span><textarea name="body" rows="3" class="large-text" maxlength="240" required></textarea></label>';
		echo '<div class="ya-actions"><button class="button button-primary">' . esc_html__( 'Send', 'yallapp' ) . '</button></div>';
		echo '</form>';
		$this->close();
	}

	/**
	 * Devices card: who is signed in on which phone.
	 *
	 * @param string|null $type App type.
	 * @return void
	 */
	private function devices_card( $type ) {
		$search = isset( $_GET['device_search'] ) ? sanitize_text_field( wp_unslash( $_GET['device_search'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only search.
		$this->open( 'lms' === $type ? __( 'Student devices', 'yallapp' ) : __( 'App user devices', 'yallapp' ) );
		echo '<form method="get" action="' . esc_url( admin_url( 'admin.php' ) ) . '" class="ya-inline">';
		echo '<input type="hidden" name="page" value="' . esc_attr( self::SLUG ) . '">';
		echo '<input type="search" name="device_search" value="' . esc_attr( $search ) . '" class="regular-text" placeholder="' . esc_attr__( 'Search by mobile number', 'yallapp' ) . '">';
		echo '<button class="button">' . esc_html__( 'Search', 'yallapp' ) . '</button></form>';
		if ( '' !== $search ) {
			$user = $this->find_student( $search );
			if ( ! $user ) {
				echo '<p class="ya-help">' . esc_html( 'lms' === $type ? __( 'No student uses this number.', 'yallapp' ) : __( 'Nobody uses this number in the app.', 'yallapp' ) ) . '</p>';
			} else {
				$rows = $this->plugin->devices()->for_user( $user->ID );
				echo '<p><strong>' . esc_html( $user->display_name ) . '</strong></p>';
				if ( ! $rows ) {
					echo '<p class="ya-help">' . esc_html__( 'No devices are signed in.', 'yallapp' ) . '</p>';
				}
				echo '<ul class="ya-devices">';
				foreach ( $rows as $row ) {
					$device = Devices::to_api( $row, 0 );
					echo '<li><div><strong>' . esc_html( ( $device['name'] ? $device['name'] : __( 'Phone', 'yallapp' ) ) . ' · ' . ( 'ios' === $device['platform'] ? 'iOS' : 'Android' ) ) . '</strong><br><span class="ya-help">';
					/* translators: %s: date. */
					echo esc_html( sprintf( __( 'Last sign-in: %s', 'yallapp' ), date_i18n( get_option( 'date_format' ), strtotime( $device['last_seen_at'] ) ) ) );
					echo '</span></div><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
					echo '<input type="hidden" name="action" value="yallapp_unlink"><input type="hidden" name="user_id" value="' . (int) $user->ID . '"><input type="hidden" name="row_id" value="' . (int) $row->id . '"><input type="hidden" name="device_search" value="' . esc_attr( $search ) . '">';
					wp_nonce_field( 'yallapp_unlink' );
					echo '<button class="button-link ya-danger">' . esc_html__( 'Unlink', 'yallapp' ) . '</button></form></li>';
				}
				echo '</ul>';
			}
		}
		$this->close();
	}

	/**
	 * Finds a student by phone number, username or email.
	 *
	 * @param string $search Search text.
	 * @return \WP_User|null
	 */
	private function find_student( $search ) {
		$search = trim( $search );
		if ( 0 === strpos( $search, '+' ) ) {
			$digits = preg_replace( '/\D+/', '', $search );
			for ( $length = 1; $length <= 3; $length++ ) {
				$phone   = Phone::parse( substr( $digits, 0, $length ), substr( $digits, $length ) );
				$user_id = $phone ? $this->plugin->otp()->find_user( $phone ) : 0;
				if ( $user_id ) {
					return get_userdata( $user_id );
				}
			}
		} elseif ( preg_match( '/^[\d\s()-]+$/', $search ) ) {
			$phone   = Phone::parse( (string) $this->values['default_country_code'], $search );
			$user_id = $phone ? $this->plugin->otp()->find_user( $phone ) : 0;
			if ( $user_id ) {
				return get_userdata( $user_id );
			}
		}
		$user = get_user_by( is_email( $search ) ? 'email' : 'login', $search );
		return $user ? $user : null;
	}

	/**
	 * Published courses as id => title.
	 *
	 * @return array<int, string>
	 */
	private function course_options() {
		$lms = $this->plugin->lms();
		if ( ! $lms ) {
			return array();
		}
		$posts = get_posts(
			array(
				'post_type'      => $lms->post_types()['course'],
				'post_status'    => 'publish',
				'posts_per_page' => 200, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- Admin picker.
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$list  = array();
		foreach ( $posts as $post ) {
			$list[ (int) $post->ID ] = get_the_title( $post );
		}
		return $list;
	}

	/**
	 * Opens a card.
	 *
	 * @param string $title Title.
	 * @param string $badge Badge HTML (escaped by the caller).
	 * @return void
	 */
	private function open( $title, $badge = '' ) {
		echo '<section class="ya-card"><h2>' . esc_html( $title ) . ' ' . $badge . '</h2>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by the caller.
	}

	/**
	 * Closes a card.
	 *
	 * @return void
	 */
	private function close() {
		echo '</section>';
	}

	/**
	 * Field name.
	 *
	 * @param string $key Setting key.
	 * @return string
	 */
	private static function name( $key ) {
		return 'yallapp[' . $key . ']';
	}

	/**
	 * Toggle switch.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label.
	 * @param string $help  Help text.
	 * @return void
	 */
	private function toggle( $key, $label, $help = '' ) {
		printf(
			'<label class="ya-row ya-toggle"><span class="ya-label">%1$s%4$s</span><input type="hidden" name="%2$s" value="0"><input type="checkbox" role="switch" name="%2$s" value="1"%3$s></label>',
			esc_html( $label ),
			esc_attr( self::name( $key ) ),
			checked( (bool) $this->values[ $key ], true, false ),
			$help ? '<span class="ya-help">' . esc_html( $help ) . '</span>' : ''
		);
	}

	/**
	 * Text input.
	 *
	 * @param string $key         Setting key.
	 * @param string $label       Label.
	 * @param string $placeholder Placeholder.
	 * @return void
	 */
	private function text( $key, $label, $placeholder = '' ) {
		printf(
			'<label class="ya-row"><span class="ya-label">%1$s</span><input type="text" name="%2$s" value="%3$s" placeholder="%4$s" class="regular-text"></label>',
			esc_html( $label ),
			esc_attr( self::name( $key ) ),
			esc_attr( (string) $this->values[ $key ] ),
			esc_attr( $placeholder )
		);
	}

	/**
	 * Number input.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label.
	 * @param int    $min   Minimum.
	 * @param int    $max   Maximum.
	 * @return void
	 */
	private function number( $key, $label, $min, $max ) {
		printf(
			'<label class="ya-row"><span class="ya-label">%1$s</span><input type="number" name="%2$s" value="%3$d" min="%4$d" max="%5$d" class="small-text"></label>',
			esc_html( $label ),
			esc_attr( self::name( $key ) ),
			(int) $this->values[ $key ],
			(int) $min,
			(int) $max
		);
	}

	/**
	 * Color input.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label.
	 * @return void
	 */
	private function color( $key, $label ) {
		printf(
			'<label class="ya-row"><span class="ya-label">%1$s</span><input type="color" name="%2$s" value="%3$s"></label>',
			esc_html( $label ),
			esc_attr( self::name( $key ) ),
			esc_attr( (string) $this->values[ $key ] )
		);
	}

	/**
	 * Select.
	 *
	 * @param string $key     Setting key.
	 * @param string $label   Label.
	 * @param array  $options Value => label.
	 * @return void
	 */
	private function select( $key, $label, array $options ) {
		echo '<label class="ya-row"><span class="ya-label">' . esc_html( $label ) . '</span><select name="' . esc_attr( self::name( $key ) ) . '">';
		foreach ( $options as $value => $text ) {
			printf( '<option value="%1$s"%2$s>%3$s</option>', esc_attr( (string) $value ), selected( (string) $this->values[ $key ], (string) $value, false ), esc_html( $text ) );
		}
		echo '</select></label>';
	}

	/**
	 * Radio group.
	 *
	 * @param string $key     Setting key.
	 * @param string $label   Label.
	 * @param array  $options Value => label.
	 * @return void
	 */
	private function radios( $key, $label, array $options ) {
		$id = 'ya-' . str_replace( '_', '-', $key );
		echo '<div class="ya-row" role="radiogroup" aria-labelledby="' . esc_attr( $id ) . '"><span class="ya-label" id="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</span><div class="ya-choices">';
		foreach ( $options as $value => $text ) {
			printf( '<label><input type="radio" name="%1$s" value="%2$s"%3$s> %4$s</label>', esc_attr( self::name( $key ) ), esc_attr( (string) $value ), checked( (string) $this->values[ $key ], (string) $value, false ), esc_html( $text ) );
		}
		echo '</div></div>';
	}

	/**
	 * Checkbox group.
	 *
	 * @param string   $key      Setting key.
	 * @param string   $label    Label.
	 * @param array    $options  Value => label.
	 * @param string[] $required Values that are always on.
	 * @return void
	 */
	private function checks( $key, $label, array $options, array $required = array() ) {
		$id = 'ya-' . str_replace( '_', '-', $key );
		echo '<div class="ya-row" role="group" aria-labelledby="' . esc_attr( $id ) . '"><span class="ya-label" id="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</span><div class="ya-choices ya-choices-inline">';
		echo '<input type="hidden" name="' . esc_attr( self::name( $key ) ) . '[]" value="">';
		foreach ( $options as $value => $text ) {
			$locked = in_array( $value, $required, true );
			printf(
				'<label><input type="checkbox" name="%1$s[]" value="%2$s"%3$s%4$s> %5$s</label>',
				esc_attr( self::name( $key ) ),
				esc_attr( $value ),
				checked( $locked || in_array( $value, (array) $this->values[ $key ], true ), true, false ),
				$locked ? ' onclick="return false" aria-disabled="true"' : '',
				esc_html( $text )
			);
		}
		echo '</div></div>';
	}

	/**
	 * Page picker.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label.
	 * @return void
	 */
	private function page( $key, $label ) {
		echo '<label class="ya-row"><span class="ya-label">' . esc_html( $label ) . '</span>';
		wp_dropdown_pages(
			array(
				'name'              => esc_attr( self::name( $key ) ),
				'selected'          => (int) $this->values[ $key ],
				'show_option_none'  => esc_html__( 'Select a page', 'yallapp' ),
				'option_none_value' => '0',
			)
		);
		echo '</label>';
	}

	/**
	 * Media library image picker.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label.
	 * @return void
	 */
	private function image( $key, $label ) {
		$id  = (int) $this->values[ $key ];
		$url = $id ? wp_get_attachment_image_url( $id, 'thumbnail' ) : '';
		printf(
			'<div class="ya-row"><span class="ya-label">%1$s</span><div class="ya-image" data-ya-image><img src="%2$s" alt=""%3$s><input type="hidden" name="%4$s" value="%5$d"><button type="button" class="button" data-ya-pick>%6$s</button> <button type="button" class="button-link ya-danger" data-ya-clear%7$s>%8$s</button></div></div>',
			esc_html( $label ),
			esc_url( (string) $url ),
			$url ? '' : ' hidden',
			esc_attr( self::name( $key ) ),
			(int) $id,
			esc_html__( 'Upload image', 'yallapp' ),
			$url ? '' : ' hidden',
			esc_html__( 'Remove', 'yallapp' )
		);
	}

	/**
	 * Status list row.
	 *
	 * @param string $label  Label.
	 * @param string $value  Value.
	 * @param bool   $ok     Whether it's fine.
	 * @param string $detail Detail.
	 * @return void
	 */
	private function status_row( $label, $value, $ok, $detail ) {
		printf(
			'<li><span class="ya-label">%1$s</span><span>%2$s</span><span class="ya-pill ya-pill-%3$s">%4$s</span></li>',
			esc_html( $label ),
			esc_html( $value ),
			$ok ? 'ok' : 'warn',
			esc_html( $detail )
		);
	}

	/**
	 * Definition list item.
	 *
	 * @param string $label Label.
	 * @param string $value Value.
	 * @return void
	 */
	private function fact( $label, $value ) {
		echo '<div><dt>' . esc_html( $label ) . '</dt><dd>' . esc_html( $value ) . '</dd></div>';
	}

	/**
	 * The Yallapp mark as a menu icon.
	 *
	 * @return string
	 */
	private static function menu_icon() {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g fill="black" transform="translate(47.104 763.904) scale(1.365333)"><path d="M224.0 153.0Q190.0 153.0 153.5 146.5Q117.0 140.0 83.0 125.5Q49.0 111.0 22.0 89.0L63.0 -30.0Q95.0 6.0 137.5 20.5Q180.0 35.0 219.0 35.0Q276.0 35.0 311.0 11.0Q346.0 -13.0 362.5 -56.0Q379.0 -99.0 379.0 -156.0L384.0 -262.0H375.0Q370.0 -187.0 347.0 -140.5Q324.0 -94.0 287.5 -73.0Q251.0 -52.0 204.0 -52.0Q146.0 -52.0 108.5 -81.5Q71.0 -111.0 53.0 -168.0Q35.0 -225.0 35.0 -306.0V-522.0H161.0V-336.0Q161.0 -247.0 182.5 -205.0Q204.0 -163.0 252.0 -163.0Q278.0 -163.0 298.5 -176.0Q319.0 -189.0 333.5 -214.5Q348.0 -240.0 355.5 -279.0Q363.0 -318.0 363.0 -369.0V-522.0H489.0V-152.0Q489.0 -109.0 481.0 -65.0Q473.0 -21.0 454.5 18.0Q436.0 57.0 406.0 87.5Q376.0 118.0 331.0 135.5Q286.0 153.0 224.0 153.0Z"/><path d="M576.0 12.0Q535.0 12.0 514.5 -6.0Q494.0 -24.0 494.0 -61.0Q494.0 -98.0 514.5 -116.0Q535.0 -134.0 576.0 -134.0Q617.0 -134.0 638.0 -116.0Q659.0 -98.0 659.0 -61.0Q659.0 12.0 576.0 12.0Z"/></g></svg>';
		return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Menu icon.
	}
}
