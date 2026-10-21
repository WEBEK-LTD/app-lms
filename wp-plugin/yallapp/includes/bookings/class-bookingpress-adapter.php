<?php
/**
 * BookingPress integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Bookings;

defined( 'ABSPATH' ) || exit;

use Throwable;
use WP_Error;
use Yallapp\Rest\Bookings_Controller;

/**
 * BookingPress (free) through its database tables for reading, its own working-hours
 * engine and booked-time check for free times, and its own confirmation step for booking
 * (an entry confirmed the way its booking forms do), so its customers, payments log and
 * emails all apply.
 *
 * The free plugin has no staff: the business is one calendar, so the app offers no staff
 * choice. BookingPress keeps dates and times in the site's time zone. Our appointment ID
 * is BookingPress's appointment booking ID.
 */
class BookingPress_Adapter extends Base_Adapter {

	/**
	 * Appointment statuses: 1 approved, 2 pending, 3 cancelled, 4 rejected.
	 */
	const STATUSES = array(
		'1' => 'approved',
		'2' => 'pending',
		'3' => 'cancelled',
		'4' => 'rejected',
	);

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'bookingpress';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return (string) get_option( 'bookingpress_version', '' );
	}

	/**
	 * A table name.
	 *
	 * @param string $name Without prefix.
	 * @return string
	 */
	private static function table( $name ) {
		global $wpdb;
		return $wpdb->prefix . 'bookingpress_' . $name;
	}

	/**
	 * BookingPress's main object, or null.
	 *
	 * @return object|null
	 */
	private static function core() {
		return isset( $GLOBALS['BookingPress'] ) && is_object( $GLOBALS['BookingPress'] ) ? $GLOBALS['BookingPress'] : null;
	}

	/**
	 * One of BookingPress's settings.
	 *
	 * @param string $name Name.
	 * @param string $type Type, e.g. general_setting.
	 * @return string
	 */
	private static function setting( $name, $type ) {
		$core = self::core();
		if ( $core && method_exists( $core, 'bookingpress_get_settings' ) ) {
			return (string) $core->bookingpress_get_settings( $name, $type );
		}
		global $wpdb;
		$settings = self::table( 'settings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own table.
		return (string) $wpdb->get_var( $wpdb->prepare( "SELECT setting_value FROM {$settings} WHERE setting_name = %s AND setting_type = %s LIMIT 1", $name, $type ) );
	}

	/**
	 * One of BookingPress's look-and-feel settings.
	 *
	 * @param string $name Name.
	 * @param string $type Type, e.g. booking_my_booking.
	 * @return string
	 */
	private static function customize( $name, $type ) {
		$core = self::core();
		if ( $core && method_exists( $core, 'bookingpress_get_customize_settings' ) ) {
			return (string) $core->bookingpress_get_customize_settings( $name, $type );
		}
		global $wpdb;
		$settings = self::table( 'customize_settings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own table.
		return (string) $wpdb->get_var( $wpdb->prepare( "SELECT bookingpress_setting_value FROM {$settings} WHERE bookingpress_setting_name = %s AND bookingpress_setting_type = %s LIMIT 1", $name, $type ) );
	}

	/**
	 * Whether BookingPress Pro is active.
	 *
	 * @return bool
	 */
	private static function pro() {
		$core = self::core();
		return $core && method_exists( $core, 'bpa_is_pro_active' ) && $core->bpa_is_pro_active();
	}

	/**
	 * The ISO currency of the business.
	 *
	 * @return string
	 */
	private static function currency() {
		$name = self::setting( 'payment_default_currency', 'payment_setting' );
		$core = self::core();
		$code = $core && method_exists( $core, 'bookingpress_get_currency_code' ) ? (string) $core->bookingpress_get_currency_code( $name ) : '';
		$code = '' !== $code ? $code : $name;
		return preg_match( '/^[A-Z]{3}$/', $code ) ? $code : 'USD';
	}

	/**
	 * Minutes before an appointment the customer can still cancel it, or null.
	 *
	 * @return int|null
	 */
	private static function cancel_before() {
		if ( 'true' !== self::customize( 'allow_to_cancel_appointment', 'booking_my_booking' ) ) {
			return null;
		}
		$minutes = self::setting( 'default_minimum_time_for_canceling', 'general_setting' );
		return is_numeric( $minutes ) ? max( 0, (int) $minutes ) : 0;
	}

	/**
	 * The lead time Pro sets for a service, in minutes, or "disabled".
	 *
	 * @param int $service_id Service.
	 * @return int|string
	 */
	private static function lead_time( $service_id ) {
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- BookingPress filter, applied as its booking form does.
		$minutes = apply_filters( 'bookingpress_retrieve_minimum_required_time', 'disabled', (int) $service_id );
		return is_numeric( $minutes ) ? (int) $minutes : 'disabled';
	}

	/**
	 * How many days ahead customers can book.
	 *
	 * @return int
	 */
	private static function max_days() {
		$days = (int) self::setting( 'period_available_for_booking', 'general_setting' );
		return self::pro() && $days > 0 ? $days : 365;
	}

	/**
	 * The plugin's booking rules.
	 *
	 * @return array
	 */
	public function rules() {
		$lead = self::lead_time( 0 );
		return array(
			'currency'              => self::currency(),
			'staff_choice'          => false,
			'notes'                 => true,
			'max_days_ahead'        => self::max_days(),
			'min_minutes_ahead'     => is_int( $lead ) ? max( 0, $lead ) : 0,
			'cancel_before_minutes' => self::cancel_before(),
		);
	}

	/**
	 * A price as BookingPress shows it.
	 *
	 * @param float $amount Amount.
	 * @return array
	 */
	private function bookingpress_price( $amount ) {
		$core = self::core();
		if ( $core && method_exists( $core, 'bookingpress_price_formatter_with_currency_symbol' ) ) {
			$formatted = (string) $core->bookingpress_price_formatter_with_currency_symbol( (float) $amount );
		} else {
			$formatted = self::money( $amount, self::currency() . ' ' );
		}
		return self::price( $amount, self::currency(), $formatted );
	}

	/**
	 * A service's length in minutes.
	 *
	 * @param array $row Service row.
	 * @return int
	 */
	private static function minutes( array $row ) {
		$value = (int) $row['bookingpress_service_duration_val'];
		switch ( (string) $row['bookingpress_service_duration_unit'] ) {
			case 'h':
				return $value * 60;
			case 'd':
				return $value * 24 * 60;
			default:
				return $value;
		}
	}

	/**
	 * Categories with services.
	 *
	 * @return array
	 */
	public function categories() {
		global $wpdb;
		$categories = self::table( 'categories' );
		$services   = self::table( 'services' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own tables.
		$rows = $wpdb->get_results( "SELECT c.bookingpress_category_id AS id, c.bookingpress_category_name AS name, c.bookingpress_category_position AS position, COUNT(s.bookingpress_service_id) AS services FROM {$categories} c INNER JOIN {$services} s ON s.bookingpress_category_id = c.bookingpress_category_id GROUP BY c.bookingpress_category_id, c.bookingpress_category_name, c.bookingpress_category_position ORDER BY c.bookingpress_category_position ASC, c.bookingpress_category_id ASC", ARRAY_A );
		$out  = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'id'        => (int) $row['id'],
				'name'      => (string) $row['name'],
				'count'     => (int) $row['services'],
				'image_url' => null,
			);
		}
		return $out;
	}

	/**
	 * Services.
	 *
	 * @param array $args Filters.
	 * @return array
	 */
	public function services( array $args ) {
		global $wpdb;
		$services = self::table( 'services' );
		$where    = '1 = 1';
		$params   = array();
		if ( $args['category'] ) {
			$where   .= ' AND s.bookingpress_category_id = %d';
			$params[] = (int) $args['category'];
		}
		if ( '' !== $args['search'] ) {
			$where   .= ' AND s.bookingpress_service_name LIKE %s';
			$params[] = '%' . $wpdb->esc_like( $args['search'] ) . '%';
		}
		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;
		$count    = "SELECT COUNT(*) FROM {$services} s WHERE {$where}";
		$select   = "SELECT s.* FROM {$services} s WHERE {$where} ORDER BY s.bookingpress_service_position ASC, s.bookingpress_service_id ASC LIMIT %d OFFSET %d";
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- BookingPress's own table; values are placeholders.
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$total = (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $count, $params ) ) : $wpdb->get_var( $count ) );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$rows = $wpdb->get_results( $wpdb->prepare( $select, array_merge( $params, array( $per_page, $offset ) ) ), ARRAY_A );
		// phpcs:enable
		$items = array();
		foreach ( (array) $rows as $row ) {
			$items[] = $this->summary( $row );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * A ServiceSummary.
	 *
	 * @param array $row Service row.
	 * @return array
	 */
	private function summary( array $row ) {
		return array(
			'id'               => (int) $row['bookingpress_service_id'],
			'name'             => (string) $row['bookingpress_service_name'],
			'image_url'        => null,
			'duration_minutes' => max( 1, self::minutes( $row ) ),
			'price'            => $this->bookingpress_price( (float) $row['bookingpress_service_price'] ),
			'category_id'      => $row['bookingpress_category_id'] ? (int) $row['bookingpress_category_id'] : null,
			'color'            => null,
		);
	}

	/**
	 * A service's row, or null.
	 *
	 * @param int $service_id Service.
	 * @return array|null
	 */
	private function service_row( $service_id ) {
		global $wpdb;
		$services = self::table( 'services' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$services} WHERE bookingpress_service_id = %d", (int) $service_id ), ARRAY_A );
		return $row ? $row : null;
	}

	/**
	 * A service. The free plugin has no staff, so its list is empty.
	 *
	 * @param int $service_id Service.
	 * @return array|null
	 */
	public function service( $service_id ) {
		$row = $this->service_row( $service_id );
		if ( ! $row ) {
			return null;
		}
		return array_merge(
			$this->summary( $row ),
			array(
				'description_html' => wp_kses_post( wpautop( (string) $row['bookingpress_service_description'] ) ),
				'staff'            => array(),
			)
		);
	}

	/**
	 * Staff members: none in the free plugin.
	 *
	 * @param int $service_id Service, or 0.
	 * @return array
	 */
	public function staff( $service_id = 0 ) {
		return array();
	}

	/**
	 * Free start times by local date, from BookingPress's working hours (with its days off,
	 * breaks and lead time) less the times already booked.
	 *
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Unused: no staff.
	 * @param string $from       First local date.
	 * @param int    $days       Days.
	 * @return array
	 */
	public function availability( $service_id, $staff_id, $from, $days ) {
		$core    = self::core();
		$service = $this->service_row( $service_id );
		$first   = self::local( $from . ' 00:00' );
		if ( ! $core || ! $service || ! $first || ! method_exists( $core, 'bookinpgress_retrieve_default_workhours' ) || ! method_exists( $core, 'bookingpress_is_appointment_booked' ) ) {
			return array();
		}
		$last = ( new \DateTimeImmutable( 'today', self::timezone() ) )->modify( '+' . self::max_days() . ' days' )->format( 'Y-m-d' );
		$lead = self::lead_time( $service_id );
		$step = self::setting( 'show_time_as_per_service_duration', 'general_setting' );
		$out  = array();
		$days = max( 1, (int) $days );
		for ( $i = 0; $i < $days; $i++ ) {
			$date = $first->modify( '+' . $i . ' days' )->format( 'Y-m-d' );
			if ( $date > $last ) {
				break;
			}
			try {
				$slots = (array) $core->bookinpgress_retrieve_default_workhours( (int) $service_id, $date, $lead, 1, $step );
			} catch ( Throwable $e ) {
				$slots = array();
			}
			foreach ( $slots as $slot ) {
				$start = substr( (string) $slot['store_start_time'], 0, 5 );
				$end   = substr( (string) $slot['store_end_time'], 0, 5 );
				if ( ! empty( $slot['is_booked'] ) || $core->bookingpress_is_appointment_booked( (int) $service_id, $date, $start . ':00', $end . ':00' ) ) {
					continue;
				}
				$out[ $date ][] = array(
					'time'      => $start,
					'staff_ids' => array(),
				);
			}
		}
		return $out;
	}

	/**
	 * A failed booking.
	 *
	 * @return WP_Error
	 */
	private static function failed() {
		return new WP_Error( 'booking_failed', __( 'The booking couldn\'t be completed. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * Books a free time: an entry confirmed the way BookingPress's booking form confirms
	 * one paid on site, which creates the customer, the appointment and its payment log,
	 * and sends BookingPress's emails.
	 *
	 * @param int    $user_id    User.
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Unused: no staff.
	 * @param string $start      Local Y-m-d H:i.
	 * @param string $notes      The customer's note.
	 * @return int|WP_Error Appointment booking ID.
	 */
	public function book( $user_id, $service_id, $staff_id, $start, $notes ) {
		global $wpdb;
		$core     = self::core();
		$gateways = isset( $GLOBALS['bookingpress_payment_gateways'] ) ? $GLOBALS['bookingpress_payment_gateways'] : null;
		$service  = $this->service_row( $service_id );
		$user     = get_userdata( $user_id );
		if ( ! $core || ! is_object( $gateways ) || ! method_exists( $gateways, 'bookingpress_confirm_booking' ) || ! $service || ! $user ) {
			return new WP_Error( 'bookings_unavailable', __( 'Bookings are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		$begin = self::local( $start );
		if ( ! $begin ) {
			return Bookings_Controller::slot_taken();
		}
		$finish = $begin->modify( '+' . self::minutes( $service ) . ' minutes' );
		$date   = $begin->format( 'Y-m-d' );
		$from   = $begin->format( 'H:i:s' );
		$to     = $finish->format( 'Y-m-d' ) > $date ? '00:00:00' : $finish->format( 'H:i:s' );
		// BookingPress stops the request when the time is gone at confirmation, so check first.
		if ( $core->bookingpress_is_appointment_booked( (int) $service_id, $date, $from, $to ) ) {
			return Bookings_Controller::slot_taken();
		}

		$price = (float) $service['bookingpress_service_price'];
		if ( $price > 0 ) {
			$status  = '2' === self::setting( 'onsite_appointment_status', 'general_setting' ) ? '2' : '1';
			$payment = $status;
			$gateway = 'on-site';
		} else {
			$status  = in_array( self::setting( 'appointment_status', 'general_setting' ), array( '2', 'Pending' ), true ) ? '2' : '1';
			$payment = '1';
			$gateway = ' - ';
		}
		list( $first, $last ) = self::names( $user );
		if ( '' === $last && false !== strpos( $first, ' ' ) ) {
			list( $first, $last ) = preg_split( '/\s+/', $first, 2 );
		}
		$email    = is_email( (string) $user->user_email ) ? (string) $user->user_email : 'customer-' . (int) $user->ID . '@app.invalid';
		$options  = isset( $GLOBALS['bookingpress_global_options'] ) ? $GLOBALS['bookingpress_global_options'] : null;
		$timezone = is_object( $options ) && method_exists( $options, 'bookingpress_get_site_timezone_offset' ) ? (string) $options->bookingpress_get_site_timezone_offset() : wp_timezone_string();
		$entry    = array(
			'bookingpress_customer_id'                    => (int) $user_id,
			'bookingpress_customer_name'                  => trim( $first . ' ' . $last ),
			'bookingpress_username'                       => (string) $user->user_login,
			'bookingpress_customer_phone'                 => self::phone( $user_id ),
			'bookingpress_customer_firstname'             => $first,
			'bookingpress_customer_lastname'              => $last,
			'bookingpress_customer_country'               => '',
			'bookingpress_customer_phone_dial_code'       => '',
			'bookingpress_customer_email'                 => $email,
			'bookingpress_customer_timezone'              => $timezone,
			'bookingpress_service_id'                     => (int) $service_id,
			'bookingpress_service_name'                   => (string) $service['bookingpress_service_name'],
			'bookingpress_service_price'                  => $price,
			'bookingpress_service_currency'               => self::setting( 'payment_default_currency', 'payment_setting' ),
			'bookingpress_service_duration_val'           => (int) $service['bookingpress_service_duration_val'],
			'bookingpress_service_duration_unit'          => (string) $service['bookingpress_service_duration_unit'],
			'bookingpress_payment_gateway'                => $gateway,
			'bookingpress_appointment_date'               => $date,
			'bookingpress_appointment_end_date'           => $finish->format( 'Y-m-d' ),
			'bookingpress_appointment_time'               => $from,
			'bookingpress_appointment_end_time'           => $to,
			'bookingpress_appointment_internal_note'      => (string) $notes,
			'bookingpress_appointment_send_notifications' => 1,
			'bookingpress_appointment_status'             => $status,
			'bookingpress_paid_amount'                    => 0,
			'bookingpress_due_amount'                     => $price,
			'bookingpress_selected_appointment_date'      => $date,
			'bookingpress_selected_appointment_end_date'  => $finish->format( 'Y-m-d' ),
			'bookingpress_selected_appointment_time'      => $from,
			'bookingpress_selected_appointment_end_time'  => $to,
			'bookingpress_created_at'                     => current_time( 'mysql' ),
		);
		$entries  = self::table( 'entries' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- BookingPress's own table, filled as its booking form does.
		if ( ! $wpdb->insert( $entries, $entry ) ) {
			return self::failed();
		}
		$entry_id = (int) $wpdb->insert_id;
		try {
			$gateways->bookingpress_confirm_booking( $entry_id, array(), $payment, '', '', 1 );
		} catch ( Throwable $e ) {
			unset( $e );
		}
		$appointments = self::table( 'appointment_bookings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own table.
		$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT bookingpress_appointment_booking_id FROM {$appointments} WHERE bookingpress_entry_id = %d ORDER BY bookingpress_appointment_booking_id DESC LIMIT 1", $entry_id ) );
		return $id ? $id : self::failed();
	}

	/**
	 * SQL for the user's BookingPress customers (one WordPress user can have several).
	 *
	 * @return string With one %d placeholder for the user.
	 */
	private static function customers_sql() {
		return 'a.bookingpress_customer_id IN (SELECT bookingpress_customer_id FROM ' . self::table( 'customers' ) . ' WHERE bookingpress_wpuser_id = %d)';
	}

	/**
	 * An appointment row from a query row.
	 *
	 * @param array $row Appointment booking row.
	 * @return array
	 */
	private function row( array $row ) {
		$code   = (string) $row['bookingpress_appointment_status'];
		$status = isset( self::STATUSES[ $code ] ) ? self::STATUSES[ $code ] : 'pending';
		$start  = self::local( $row['bookingpress_appointment_date'] . ' ' . $row['bookingpress_appointment_time'] );
		$date   = ! empty( $row['bookingpress_appointment_end_date'] ) && '0000-00-00' !== $row['bookingpress_appointment_end_date'] ? $row['bookingpress_appointment_end_date'] : $row['bookingpress_appointment_date'];
		$end    = self::local( $date . ' ' . $row['bookingpress_appointment_end_time'] );
		if ( $start && $end && $end <= $start ) {
			$end = $end->modify( '+1 day' );
		}
		if ( 'approved' === $status && $end && $end->getTimestamp() < time() ) {
			$status = 'completed';
		}
		return array(
			'id'           => (int) $row['bookingpress_appointment_booking_id'],
			'status'       => $status,
			'status_label' => Bookings_Controller::status_label( $status ),
			'service'      => array(
				'id'        => (int) $row['bookingpress_service_id'],
				'name'      => (string) $row['bookingpress_service_name'],
				'image_url' => null,
			),
			'staff'        => null,
			'start'        => $start ? $start->format( 'Y-m-d H:i' ) : '',
			'end'          => $end ? $end->format( 'Y-m-d H:i' ) : '',
			'price'        => $this->bookingpress_price( (float) $row['bookingpress_service_price'] ),
			'notes'        => (string) $row['bookingpress_appointment_internal_note'],
			'location'     => '',
		);
	}

	/**
	 * The customer's appointments.
	 *
	 * @param int    $user_id  User.
	 * @param string $status   upcoming or past.
	 * @param int    $page     Page.
	 * @param int    $per_page Page size.
	 * @return array
	 */
	public function appointments( $user_id, $status, $page, $per_page ) {
		global $wpdb;
		$now          = new \DateTimeImmutable( 'now', self::timezone() );
		$today        = $now->format( 'Y-m-d' );
		$time         = $now->format( 'H:i:s' );
		$customers    = self::customers_sql();
		$later        = '(a.bookingpress_appointment_date > %s OR (a.bookingpress_appointment_date = %s AND a.bookingpress_appointment_time >= %s))';
		$upcoming     = 'upcoming' === $status;
		$where        = $upcoming
			? "{$customers} AND {$later} AND a.bookingpress_appointment_status IN ('1', '2')"
			: "{$customers} AND (NOT {$later} OR a.bookingpress_appointment_status NOT IN ('1', '2'))";
		$order        = $upcoming ? 'a.bookingpress_appointment_date ASC, a.bookingpress_appointment_time ASC' : 'a.bookingpress_appointment_date DESC, a.bookingpress_appointment_time DESC';
		$offset       = ( max( 1, (int) $page ) - 1 ) * max( 1, (int) $per_page );
		$appointments = self::table( 'appointment_bookings' );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders -- BookingPress's own tables; the placeholders are in $where.
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$appointments} a WHERE {$where}", (int) $user_id, $today, $today, $time ) );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT a.* FROM {$appointments} a WHERE {$where} ORDER BY {$order}, a.bookingpress_appointment_booking_id ASC LIMIT %d OFFSET %d", (int) $user_id, $today, $today, $time, max( 1, (int) $per_page ), $offset ), ARRAY_A );
		// phpcs:enable
		$items = array();
		foreach ( (array) $rows as $row ) {
			$items[] = $this->row( $row );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * One of the customer's appointments.
	 *
	 * @param int $user_id        User.
	 * @param int $appointment_id Appointment booking ID.
	 * @return array|null
	 */
	public function appointment( $user_id, $appointment_id ) {
		global $wpdb;
		$appointments = self::table( 'appointment_bookings' );
		$customers    = self::customers_sql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB.UnescapedDBParameter -- BookingPress's own tables; the placeholder is in $customers.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT a.* FROM {$appointments} a WHERE a.bookingpress_appointment_booking_id = %d AND {$customers}", (int) $appointment_id, (int) $user_id ), ARRAY_A );
		return $row ? $this->row( $row ) : null;
	}

	/**
	 * Cancels the way BookingPress's "My bookings" does for a signed-in customer.
	 *
	 * @param int $user_id        User.
	 * @param int $appointment_id Appointment booking ID.
	 * @return true|WP_Error
	 */
	public function cancel( $user_id, $appointment_id ) {
		global $wpdb;
		$too_late = new WP_Error( 'too_late', __( 'This appointment can no longer be cancelled in the app. Please contact us.', 'yallapp' ), array( 'status' => 409 ) );
		$row      = $this->appointment( $user_id, $appointment_id );
		if ( ! $row ) {
			return new WP_Error( 'not_found', __( 'Appointment not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $row['status'], array( 'approved', 'pending' ), true ) ) {
			return $too_late;
		}
		$core = self::core();
		if ( $core && method_exists( $core, 'bookingpress_check_cancel_appointment_permission_func' ) && ! $core->bookingpress_check_cancel_appointment_permission_func( (int) $appointment_id, (int) $user_id ) ) {
			return $too_late;
		}
		$response = array(
			'variant' => 'success',
			'title'   => '',
			'msg'     => '',
		);
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- BookingPress filter (refunds), applied as its cancel does.
		$response = apply_filters( 'bookingpress_refund_process_before_cancel_appointment', $response, (int) $appointment_id );
		if ( ! is_array( $response ) || 'success' !== ( isset( $response['variant'] ) ? $response['variant'] : '' ) ) {
			return $too_late;
		}
		$appointments = self::table( 'appointment_bookings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- BookingPress's own table, updated as its cancel does.
		$wpdb->update( $appointments, array( 'bookingpress_appointment_status' => '3' ), array( 'bookingpress_appointment_booking_id' => (int) $appointment_id ) );
		// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- BookingPress hooks, fired as its cancel does.
		do_action( 'bookingpress_after_cancel_appointment_without_check_payment', (int) $appointment_id );
		$logs = ! empty( $GLOBALS['tbl_bookingpress_payment_logs'] ) ? (string) $GLOBALS['tbl_bookingpress_payment_logs'] : self::table( 'payment_transactions' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- BookingPress's own table.
		$email = $wpdb->get_var( $wpdb->prepare( "SELECT bookingpress_customer_email FROM {$logs} WHERE bookingpress_appointment_booking_ref = %d LIMIT 1", (int) $appointment_id ) );
		if ( null !== $email ) {
			$mail = isset( $GLOBALS['bookingpress_email_notifications'] ) ? $GLOBALS['bookingpress_email_notifications'] : null;
			if ( is_object( $mail ) && method_exists( $mail, 'bookingpress_send_after_payment_log_entry_email_notification' ) ) {
				try {
					$mail->bookingpress_send_after_payment_log_entry_email_notification( 'Appointment Canceled', (int) $appointment_id, (string) $email );
				} catch ( Throwable $e ) {
					unset( $e );
				}
			}
			do_action( 'bookingpress_after_cancel_appointment', (int) $appointment_id );
		}
		// phpcs:enable
		return true;
	}
}
