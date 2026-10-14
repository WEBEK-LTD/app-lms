<?php
/**
 * Amelia integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Bookings;

defined( 'ABSPATH' ) || exit;

use Throwable;
use WP_Error;
use Yallapp\Rest\Bookings_Controller;

/**
 * Amelia (Lite and paid) through its database tables for reading, and through its own
 * controllers (the way Amelia's own abilities call them) for free times, booking and
 * cancelling, so its rules, emails and calendar sync all apply.
 *
 * Amelia stores appointment times in UTC and answers free times in the site's time zone.
 * Our appointment ID is Amelia's customer booking ID.
 */
class Amelia_Adapter extends Base_Adapter {

	/**
	 * Amelia's settings.
	 *
	 * @var array|null
	 */
	private $settings = null;

	/**
	 * On Amelia Lite, the one employee it schedules; 0 when every employee can be booked.
	 *
	 * @var int|null
	 */
	private $only_provider = null;

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'amelia';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'AMELIA_VERSION' ) ? (string) AMELIA_VERSION : '';
	}

	/**
	 * A table name.
	 *
	 * @param string $name Without prefix.
	 * @return string
	 */
	private static function table( $name ) {
		global $wpdb;
		return $wpdb->prefix . 'amelia_' . $name;
	}

	/**
	 * One of Amelia's settings.
	 *
	 * @param string $group    Group, e.g. general.
	 * @param string $key      Key.
	 * @param mixed  $fallback Fallback.
	 * @return mixed
	 */
	private function setting( $group, $key, $fallback = null ) {
		if ( null === $this->settings ) {
			$raw            = get_option( 'amelia_settings' );
			$decoded        = is_string( $raw ) ? json_decode( $raw, true ) : $raw;
			$this->settings = is_array( $decoded ) ? $decoded : array();
		}
		return isset( $this->settings[ $group ][ $key ] ) ? $this->settings[ $group ][ $key ] : $fallback;
	}

	/**
	 * Amelia Lite schedules only its first employee (the lowest ID not disabled), whatever
	 * the request asks for, so the app offers only that employee there.
	 *
	 * @return int Employee ID, or 0 when every employee can be booked.
	 */
	private function only_provider() {
		if ( null !== $this->only_provider ) {
			return $this->only_provider;
		}
		$this->only_provider = 0;
		$licence             = '\\AmeliaBooking\\Infrastructure\\Licence\\Licence';
		$constants           = '\\AmeliaBooking\\Infrastructure\\Licence\\LicenceConstants';
		if ( ! class_exists( $licence ) || ! defined( $constants . '::STARTER' ) || ! method_exists( $licence, 'hasLicenseAccess' ) ) {
			return 0;
		}
		try {
			$lite = ! $licence::hasLicenseAccess( constant( $constants . '::STARTER' ) );
		} catch ( Throwable $e ) {
			$lite = false;
		}
		if ( $lite ) {
			global $wpdb;
			$users = self::table( 'users' );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own table; the same query as Amelia's.
			$this->only_provider = (int) $wpdb->get_var( "SELECT id FROM {$users} WHERE type = 'provider' AND status NOT LIKE 'disabled' ORDER BY id ASC LIMIT 1" );
			// No employee at all: nothing can be booked, which an impossible ID keeps true.
			$this->only_provider = $this->only_provider ? $this->only_provider : -1;
		}
		return $this->only_provider;
	}

	/**
	 * SQL limiting employees (alias u) to the ones that can be booked.
	 *
	 * @return string
	 */
	private function bookable_provider_sql() {
		$only = $this->only_provider();
		return "u.type = 'provider' AND u.status = 'visible'" . ( $only ? ' AND u.id = ' . (int) $only : '' );
	}

	/**
	 * The plugin's booking rules.
	 *
	 * @return array
	 */
	public function rules() {
		$cancel = (int) $this->setting( 'general', 'minimumTimeRequirementPriorToCanceling', 0 );
		return array(
			'currency'              => (string) $this->setting( 'payments', 'currency', 'USD' ),
			'staff_choice'          => 0 === $this->only_provider(),
			'notes'                 => false,
			'max_days_ahead'        => (int) $this->setting( 'general', 'numberOfDaysAvailableForBooking', 365 ),
			'min_minutes_ahead'     => (int) floor( (int) $this->setting( 'general', 'minimumTimeRequirementPriorToBooking', 0 ) / 60 ),
			'cancel_before_minutes' => (int) floor( $cancel / 60 ),
		);
	}

	/**
	 * A price as Amelia shows it.
	 *
	 * @param float $amount Amount.
	 * @return array
	 */
	private function amelia_price( $amount ) {
		$currency = (string) $this->setting( 'payments', 'currency', 'USD' );
		$symbol   = (string) $this->setting( 'payments', 'symbol', self::symbol( $currency ) );
		$position = (string) $this->setting( 'payments', 'priceSymbolPosition', 'before' );
		$decimals = (int) $this->setting( 'payments', 'priceNumberOfDecimals', 2 );
		$text     = number_format_i18n( (float) $amount, $decimals );
		switch ( $position ) {
			case 'after':
				$formatted = $text . $symbol;
				break;
			case 'afterWithSpace':
				$formatted = $text . ' ' . $symbol;
				break;
			case 'beforeWithSpace':
				$formatted = $symbol . ' ' . $text;
				break;
			default:
				$formatted = $symbol . $text;
		}
		return self::price( $amount, $currency, $formatted );
	}

	/**
	 * A currency symbol for common currencies.
	 *
	 * @param string $currency ISO code.
	 * @return string
	 */
	private static function symbol( $currency ) {
		$symbols = array(
			'TRY' => '₺',
			'USD' => '$',
			'EUR' => '€',
			'GBP' => '£',
			'SAR' => 'SAR ',
			'AED' => 'AED ',
			'EGP' => 'E£',
		);
		return isset( $symbols[ $currency ] ) ? $symbols[ $currency ] : $currency . ' ';
	}

	/**
	 * Categories with bookable services.
	 *
	 * @return array
	 */
	public function categories() {
		global $wpdb;
		$categories = self::table( 'categories' );
		$services   = self::table( 'services' );
		$provided   = $this->provided_sql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own tables.
		$rows = $wpdb->get_results( "SELECT c.id, c.name, c.pictureFullPath AS image, COUNT(s.id) AS services FROM {$categories} c INNER JOIN {$services} s ON s.categoryId = c.id AND s.status = 'visible' AND s.`show` = 1 AND {$provided} WHERE c.status = 'visible' GROUP BY c.id, c.name, c.pictureFullPath, c.position ORDER BY c.position ASC, c.id ASC", ARRAY_A );
		$out  = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'id'        => (int) $row['id'],
				'name'      => (string) $row['name'],
				'count'     => (int) $row['services'],
				'image_url' => $row['image'] ? (string) $row['image'] : null,
			);
		}
		return $out;
	}

	/**
	 * SQL for "someone who can be booked provides service s".
	 *
	 * @return string
	 */
	private function provided_sql() {
		return 'EXISTS (SELECT 1 FROM ' . self::table( 'providers_to_services' ) . ' ps INNER JOIN ' . self::table( 'users' ) . ' u ON u.id = ps.userId AND ' . $this->bookable_provider_sql() . ' WHERE ps.serviceId = s.id)';
	}

	/**
	 * Bookable services.
	 *
	 * @param array $args Filters.
	 * @return array
	 */
	public function services( array $args ) {
		global $wpdb;
		$services = self::table( 'services' );
		$where    = "s.status = 'visible' AND s.`show` = 1";
		$params   = array();
		if ( $args['category'] ) {
			$where   .= ' AND s.categoryId = %d';
			$params[] = (int) $args['category'];
		}
		if ( '' !== $args['search'] ) {
			$where   .= ' AND s.name LIKE %s';
			$params[] = '%' . $wpdb->esc_like( $args['search'] ) . '%';
		}
		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;
		$where   .= ' AND ' . $this->provided_sql();
		$count    = "SELECT COUNT(*) FROM {$services} s WHERE {$where}";
		$select   = "SELECT s.* FROM {$services} s WHERE {$where} ORDER BY s.position ASC, s.id ASC LIMIT %d OFFSET %d";
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Amelia's own tables; values are placeholders.
		$total = (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $count, $params ) ) : $wpdb->get_var( $count ) );
		$rows  = $wpdb->get_results( $wpdb->prepare( $select, array_merge( $params, array( $per_page, $offset ) ) ), ARRAY_A );
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
			'id'               => (int) $row['id'],
			'name'             => (string) $row['name'],
			'image_url'        => ! empty( $row['pictureFullPath'] ) ? (string) $row['pictureFullPath'] : null,
			'duration_minutes' => max( 1, (int) round( (int) $row['duration'] / 60 ) ),
			'price'            => $this->amelia_price( (float) $row['price'] ),
			'category_id'      => $row['categoryId'] ? (int) $row['categoryId'] : null,
			'color'            => ! empty( $row['color'] ) ? (string) $row['color'] : null,
		);
	}

	/**
	 * A bookable service with its staff.
	 *
	 * @param int $service_id Service.
	 * @return array|null
	 */
	public function service( $service_id ) {
		global $wpdb;
		$services = self::table( 'services' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$services} WHERE id = %d AND status = 'visible' AND `show` = 1", (int) $service_id ), ARRAY_A );
		if ( ! $row ) {
			return null;
		}
		$staff = $this->staff( (int) $row['id'] );
		if ( ! $staff ) {
			return null;
		}
		return array_merge(
			$this->summary( $row ),
			array(
				'description_html' => wp_kses_post( (string) $row['description'] ),
				'staff'            => $staff,
			)
		);
	}

	/**
	 * Staff members.
	 *
	 * @param int $service_id Service, or 0.
	 * @return array
	 */
	public function staff( $service_id = 0 ) {
		global $wpdb;
		$users    = self::table( 'users' );
		$links    = self::table( 'providers_to_services' );
		$services = self::table( 'services' );
		$bookable = $this->bookable_provider_sql();
		if ( $service_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own tables.
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT u.*, ps.price AS own_price, s.price AS service_price FROM {$users} u INNER JOIN {$links} ps ON ps.userId = u.id INNER JOIN {$services} s ON s.id = ps.serviceId WHERE ps.serviceId = %d AND {$bookable} ORDER BY u.firstName ASC, u.id ASC", (int) $service_id ), ARRAY_A );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own tables.
			$rows = $wpdb->get_results( "SELECT DISTINCT u.* FROM {$users} u INNER JOIN {$links} ps ON ps.userId = u.id INNER JOIN {$services} s ON s.id = ps.serviceId AND s.status = 'visible' AND s.`show` = 1 WHERE {$bookable} ORDER BY u.firstName ASC, u.id ASC", ARRAY_A );
		}
		$out = array();
		foreach ( (array) $rows as $row ) {
			$own   = isset( $row['own_price'] ) && null !== $row['own_price'] ? (float) $row['own_price'] : null;
			$base  = isset( $row['service_price'] ) ? (float) $row['service_price'] : null;
			$out[] = self::person(
				(int) $row['id'],
				trim( $row['firstName'] . ' ' . $row['lastName'] ),
				! empty( $row['pictureFullPath'] ) ? (string) $row['pictureFullPath'] : null,
				wp_trim_words( wp_strip_all_tags( (string) $row['description'] ), 12, '…' ),
				null !== $own && null !== $base && abs( $own - $base ) > 0.001 ? $this->amelia_price( $own ) : null
			);
		}
		return $out;
	}

	/**
	 * Calls one of Amelia's controllers, the way its own abilities do.
	 *
	 * @param string $controller Controller class, without the namespace.
	 * @param array  $params     Body (POST) or query (GET).
	 * @param array  $args       Route arguments.
	 * @param string $method     POST or GET.
	 * @return array|WP_Error The response's data.
	 */
	private function call( $controller, array $params, array $args = array(), $method = 'POST' ) {
		$class            = '\\AmeliaBooking\\Application\\Controller\\Booking\\Appointment\\' . $controller;
		$request_factory  = '\\Slim\\Psr7\\Factory\\ServerRequestFactory';
		$response_factory = '\\Slim\\Psr7\\Factory\\ResponseFactory';
		if ( ! defined( 'AMELIA_PATH' ) || ! class_exists( $class ) || ! class_exists( $request_factory ) || ! class_exists( $response_factory ) ) {
			return new WP_Error( 'bookings_unavailable', __( 'Bookings are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		try {
			$container = require AMELIA_PATH . '/src/Infrastructure/ContainerConfig/container.php';
			$uri       = 'http://127.0.0.1/';
			if ( 'GET' === $method && $params ) {
				$uri .= '?' . http_build_query( $params );
			}
			$request = ( new $request_factory() )->createServerRequest( $method, $uri )->withHeader( 'Content-Type', 'application/json' );
			if ( 'GET' !== $method ) {
				$request = $request->withParsedBody( $params );
			}
			$response = ( new $response_factory() )->createResponse();
			$handler  = new $class( $container );
			$result   = $handler( $request, $response, $args, true );
			$status   = (int) $result->getStatusCode();
			$decoded  = json_decode( (string) $result->getBody(), true );
		} catch ( Throwable $e ) {
			return new WP_Error( 'booking_failed', __( 'The booking couldn\'t be completed. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
		}
		$data = is_array( $decoded ) && isset( $decoded['data'] ) ? $decoded['data'] : $decoded;
		if ( $status >= 400 ) {
			if ( is_array( $data ) && ( ! empty( $data['timeSlotUnavailable'] ) || ! empty( $data['customerAlreadyBooked'] ) ) ) {
				return Bookings_Controller::slot_taken();
			}
			$message = is_array( $decoded ) && ! empty( $decoded['message'] ) ? (string) $decoded['message'] : __( 'The booking couldn\'t be completed. Please try again.', 'yallapp' );
			return new WP_Error( 'booking_failed', $message, array( 'status' => 403 === $status ? 403 : 400 ) );
		}
		return is_array( $data ) ? $data : array();
	}

	/**
	 * Free start times by local date.
	 *
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member or 0.
	 * @param string $from       First local date.
	 * @param int    $days       Days.
	 * @return array
	 */
	public function availability( $service_id, $staff_id, $from, $days ) {
		$start = self::local( $from . ' 00:00' );
		if ( ! $start ) {
			return array();
		}
		$params = array(
			'serviceId'     => (int) $service_id,
			'persons'       => 1,
			'page'          => 'booking',
			'startDateTime' => $start->format( 'Y-m-d H:i' ),
			'endDateTime'   => $start->modify( '+' . ( max( 1, (int) $days ) - 1 ) . ' days' )->format( 'Y-m-d' ) . ' 23:59',
		);
		if ( $staff_id ) {
			$params['providerIds'] = array( (int) $staff_id );
		}
		$data = $this->call( 'GetTimeSlotsController', $params, array(), 'GET' );
		if ( is_wp_error( $data ) || empty( $data['slots'] ) || ! is_array( $data['slots'] ) ) {
			return array();
		}
		$out = array();
		foreach ( $data['slots'] as $date => $times ) {
			foreach ( (array) $times as $time => $providers ) {
				$ids = array();
				foreach ( (array) $providers as $provider ) {
					$ids[] = (int) ( is_array( $provider ) ? reset( $provider ) : $provider );
				}
				if ( $staff_id && ! in_array( (int) $staff_id, $ids, true ) ) {
					continue;
				}
				$out[ (string) $date ][] = array(
					'time'      => substr( (string) $time, 0, 5 ),
					'staff_ids' => $staff_id ? array( (int) $staff_id ) : $ids,
				);
			}
		}
		return $out;
	}

	/**
	 * The Amelia customer for a WordPress user.
	 *
	 * @param int  $user_id WordPress user.
	 * @param bool $create  Create it when missing.
	 * @return array|null Amelia user row.
	 */
	private function customer( $user_id, $create = false ) {
		global $wpdb;
		$users = self::table( 'users' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$users} WHERE externalId = %d AND type = 'customer' ORDER BY id ASC LIMIT 1", (int) $user_id ), ARRAY_A );
		if ( $row || ! $create ) {
			return $row ? $row : null;
		}
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return null;
		}
		list( $first, $last ) = self::names( $user );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Amelia's own table; its customer for this WordPress user.
		$wpdb->insert(
			$users,
			array(
				'status'     => 'visible',
				'type'       => 'customer',
				'externalId' => (int) $user_id,
				'firstName'  => $first,
				'lastName'   => $last,
				'email'      => self::email( $user ),
				'phone'      => self::phone( $user_id ),
			)
		);
		return $this->customer( $user_id );
	}

	/**
	 * The user's email, or a reserved address when the account has none (phone sign-in),
	 * since Amelia's customers need one.
	 *
	 * @param \WP_User $user User.
	 * @return string
	 */
	private static function email( $user ) {
		$email = (string) $user->user_email;
		return is_email( $email ) ? $email : 'customer-' . (int) $user->ID . '@app.invalid';
	}

	/**
	 * Books a free time.
	 *
	 * @param int    $user_id    User.
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member or 0.
	 * @param string $start      Local Y-m-d H:i.
	 * @param string $notes      Note (Amelia has none).
	 * @return int|WP_Error Customer booking ID.
	 */
	public function book( $user_id, $service_id, $staff_id, $start, $notes ) {
		$customer = $this->customer( $user_id, true );
		if ( ! $customer ) {
			return new WP_Error( 'booking_failed', __( 'The booking couldn\'t be completed. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
		}
		if ( ! $staff_id ) {
			$day = $this->availability( $service_id, 0, substr( $start, 0, 10 ), 1 );
			foreach ( isset( $day[ substr( $start, 0, 10 ) ] ) ? $day[ substr( $start, 0, 10 ) ] : array() as $slot ) {
				if ( substr( $start, 11, 5 ) === $slot['time'] && $slot['staff_ids'] ) {
					$staff_id = (int) $slot['staff_ids'][0];
				}
			}
			if ( ! $staff_id ) {
				return Bookings_Controller::slot_taken();
			}
		}
		$service = $this->service( $service_id );
		$data    = $this->call(
			'AddBookingController',
			array(
				'type'               => 'appointment',
				'bookings'           => array(
					array(
						'customer'     => array(
							'id'         => (int) $customer['id'],
							'firstName'  => (string) $customer['firstName'],
							'lastName'   => (string) $customer['lastName'],
							'email'      => (string) $customer['email'],
							'phone'      => (string) $customer['phone'],
							'externalId' => (int) $user_id,
						),
						'customerId'   => (int) $customer['id'],
						'persons'      => 1,
						'extras'       => array(),
						'customFields' => array(),
					),
				),
				'bookingStart'       => $start,
				'notifyParticipants' => 1,
				'serviceId'          => (int) $service_id,
				'providerId'         => (int) $staff_id,
				'locationId'         => null,
				'payment'            => array(
					'gateway' => 'onSite',
					'amount'  => $service ? (float) $service['price']['amount'] : 0,
					'data'    => array(),
				),
				'recurring'          => array(),
				'package'            => array(),
				'locale'             => get_locale(),
				'timeZone'           => wp_timezone_string(),
				'utcOffset'          => null,
			)
		);
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$booking_id = isset( $data['booking']['id'] ) ? (int) $data['booking']['id'] : 0;
		if ( ! $booking_id ) {
			$booking_id = $this->latest_booking( (int) $customer['id'] );
		}
		return $booking_id ? $booking_id : new WP_Error( 'booking_failed', __( 'The booking couldn\'t be completed. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * The customer's newest booking ID.
	 *
	 * @param int $customer_id Amelia customer.
	 * @return int
	 */
	private function latest_booking( $customer_id ) {
		global $wpdb;
		$bookings = self::table( 'customer_bookings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own table.
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$bookings} WHERE customerId = %d ORDER BY id DESC LIMIT 1", (int) $customer_id ) );
	}

	/**
	 * Base query for the customer's bookings.
	 *
	 * @return string
	 */
	private static function bookings_sql() {
		return 'SELECT cb.id, cb.status AS booking_status, cb.price, a.status AS appointment_status, a.bookingStart, a.bookingEnd, s.id AS service_id, s.name AS service_name, s.pictureFullPath AS service_image, u.id AS staff_id, u.firstName, u.lastName, u.pictureFullPath AS staff_image, l.name AS location FROM '
			. self::table( 'customer_bookings' ) . ' cb INNER JOIN ' . self::table( 'appointments' ) . ' a ON a.id = cb.appointmentId INNER JOIN '
			. self::table( 'services' ) . ' s ON s.id = a.serviceId LEFT JOIN ' . self::table( 'users' ) . ' u ON u.id = a.providerId LEFT JOIN '
			. self::table( 'locations' ) . ' l ON l.id = a.locationId';
	}

	/**
	 * An appointment row from a query row.
	 *
	 * @param array $row Row.
	 * @return array
	 */
	private function row( array $row ) {
		$statuses = array(
			'approved' => 'approved',
			'pending'  => 'pending',
			'canceled' => 'cancelled',
			'rejected' => 'rejected',
			'no-show'  => 'no_show',
			'waiting'  => 'pending',
		);
		$status   = isset( $statuses[ $row['booking_status'] ] ) ? $statuses[ $row['booking_status'] ] : 'pending';
		$start    = self::utc_to_local( $row['bookingStart'] );
		if ( 'approved' === $status && $row['bookingEnd'] && strtotime( $row['bookingEnd'] . ' UTC' ) < time() ) {
			$status = 'completed';
		}
		return array(
			'id'           => (int) $row['id'],
			'status'       => $status,
			'status_label' => Bookings_Controller::status_label( $status ),
			'service'      => array(
				'id'        => (int) $row['service_id'],
				'name'      => (string) $row['service_name'],
				'image_url' => $row['service_image'] ? (string) $row['service_image'] : null,
			),
			'staff'        => $row['staff_id'] ? self::person( (int) $row['staff_id'], $row['firstName'] . ' ' . $row['lastName'], $row['staff_image'] ? (string) $row['staff_image'] : null ) : null,
			'start'        => $start,
			'end'          => self::utc_to_local( $row['bookingEnd'] ),
			'price'        => $this->amelia_price( (float) $row['price'] ),
			'notes'        => '',
			'location'     => $row['location'] ? (string) $row['location'] : '',
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
		$customer = $this->customer( $user_id );
		if ( ! $customer ) {
			return array(
				'items' => array(),
				'total' => 0,
			);
		}
		$now      = gmdate( 'Y-m-d H:i:s' );
		$upcoming = 'upcoming' === $status;
		$where    = $upcoming
			? "cb.customerId = %d AND a.bookingStart >= %s AND cb.status IN ('approved', 'pending', 'waiting')"
			: "cb.customerId = %d AND (a.bookingStart < %s OR cb.status NOT IN ('approved', 'pending', 'waiting'))";
		$order    = $upcoming ? 'a.bookingStart ASC' : 'a.bookingStart DESC';
		$offset   = ( max( 1, (int) $page ) - 1 ) * max( 1, (int) $per_page );
		$base     = self::bookings_sql();
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders -- Amelia's own tables; the placeholders are in $where.
		$bookings     = self::table( 'customer_bookings' );
		$appointments = self::table( 'appointments' );
		$total        = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$bookings} cb INNER JOIN {$appointments} a ON a.id = cb.appointmentId WHERE {$where}", (int) $customer['id'], $now ) );
		$rows         = $wpdb->get_results( $wpdb->prepare( "{$base} WHERE {$where} ORDER BY {$order}, cb.id ASC LIMIT %d OFFSET %d", (int) $customer['id'], $now, max( 1, (int) $per_page ), $offset ), ARRAY_A );
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
	 * @param int $appointment_id Customer booking ID.
	 * @return array|null
	 */
	public function appointment( $user_id, $appointment_id ) {
		global $wpdb;
		$customer = $this->customer( $user_id );
		if ( ! $customer ) {
			return null;
		}
		$base = self::bookings_sql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Amelia's own tables.
		$row = $wpdb->get_row( $wpdb->prepare( "{$base} WHERE cb.id = %d AND cb.customerId = %d", (int) $appointment_id, (int) $customer['id'] ), ARRAY_A );
		return $row ? $this->row( $row ) : null;
	}

	/**
	 * Cancels through Amelia.
	 *
	 * @param int $user_id        User.
	 * @param int $appointment_id Customer booking ID.
	 * @return true|WP_Error
	 */
	public function cancel( $user_id, $appointment_id ) {
		$data = $this->call( 'CancelBookingController', array(), array( 'id' => (int) $appointment_id ) );
		if ( is_wp_error( $data ) ) {
			return 'booking_failed' === $data->get_error_code()
				? new WP_Error( 'too_late', __( 'This appointment can no longer be cancelled in the app. Please contact us.', 'yallapp' ), array( 'status' => 409 ) )
				: $data;
		}
		return true;
	}
}
