<?php
/**
 * LatePoint integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Bookings;

defined( 'ABSPATH' ) || exit;

use DateTimeImmutable;
use Throwable;
use WP_Error;
use Yallapp\Rest\Bookings_Controller;

/**
 * LatePoint through its database tables for reading, its own availability engine for
 * free times, and its models for booking (an order, an order item and the booking, the
 * way its checkout saves them) and cancelling, so its rules and notifications apply.
 *
 * LatePoint keeps dates and minutes since midnight in the site's time zone, plus the same
 * times in UTC. Our appointment ID is LatePoint's booking ID.
 */
class LatePoint_Adapter extends Base_Adapter {

	/**
	 * Booking statuses that hold a time.
	 */
	const ACTIVE = array( 'approved', 'pending', 'payment_pending' );

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'latepoint';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return (string) get_option( 'latepoint_plugin_version', '' );
	}

	/**
	 * A table name.
	 *
	 * @param string $name Without prefix.
	 * @return string
	 */
	private static function table( $name ) {
		global $wpdb;
		return $wpdb->prefix . 'latepoint_' . $name;
	}

	/**
	 * One of LatePoint's settings.
	 *
	 * @param string $name     Name.
	 * @param mixed  $fallback Fallback.
	 * @return mixed
	 */
	private static function setting( $name, $fallback = '' ) {
		if ( class_exists( '\\OsSettingsHelper' ) ) {
			return \OsSettingsHelper::get_settings_value( $name, $fallback );
		}
		global $wpdb;
		$settings = self::table( 'settings' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own table.
		$value = $wpdb->get_var( $wpdb->prepare( "SELECT value FROM {$settings} WHERE name = %s LIMIT 1", $name ) );
		return null === $value ? $fallback : maybe_unserialize( $value );
	}

	/**
	 * Whether an on/off setting is on.
	 *
	 * @param string $name Name.
	 * @return bool
	 */
	private static function is_on( $name ) {
		return 'on' === self::setting( $name, '' );
	}

	/**
	 * Seconds from now to a LatePoint relative date ("+2 hours", "+60 days"), or null.
	 *
	 * @param string $relative Relative date.
	 * @return int|null
	 */
	private static function seconds_until( $relative ) {
		$relative = trim( (string) $relative );
		if ( '' === $relative ) {
			return null;
		}
		$now  = new DateTimeImmutable( 'now', self::timezone() );
		$then = self::local( $relative );
		return $then ? $then->getTimestamp() - $now->getTimestamp() : null;
	}

	/**
	 * The ISO currency for LatePoint's currency symbol (it stores only the symbol).
	 *
	 * @return string
	 */
	private static function currency() {
		$symbol  = trim( (string) self::setting( 'currency_symbol_before', '' ) . (string) self::setting( 'currency_symbol_after', '' ) );
		$symbols = array(
			'₺'   => 'TRY',
			'TL'  => 'TRY',
			'$'   => 'USD',
			'US$' => 'USD',
			'€'   => 'EUR',
			'£'   => 'GBP',
			'E£'  => 'EGP',
			'SAR' => 'SAR',
			'AED' => 'AED',
		);
		$code    = isset( $symbols[ $symbol ] ) ? $symbols[ $symbol ] : ( preg_match( '/^[A-Z]{3}$/', $symbol ) ? $symbol : 'USD' );
		/**
		 * Filters the ISO currency of a booking plugin that only stores a symbol.
		 *
		 * @param string $code    ISO currency.
		 * @param string $plugin  Booking plugin.
		 * @param string $symbol  The plugin's currency symbol.
		 */
		return (string) apply_filters( 'yallapp_bookings_currency', $code, 'latepoint', $symbol );
	}

	/**
	 * The plugin's booking rules.
	 *
	 * @return array
	 */
	public function rules() {
		$latest   = self::seconds_until( self::setting( 'latest_possible_booking', '' ) );
		$earliest = self::seconds_until( self::setting( 'earliest_possible_booking', '' ) );
		$cancel   = null;
		if ( self::is_on( 'allow_customer_booking_cancellation' ) ) {
			$cancel = 0;
			$value  = (int) self::setting( 'cancellation_limit_value', 0 );
			$unit   = (string) self::setting( 'cancellation_limit_unit', '' );
			if ( self::is_on( 'limit_when_customer_can_cancel' ) && $value && '' !== $unit ) {
				$seconds = strtotime( '+' . $value . ' ' . $unit, 0 );
				$cancel  = false === $seconds ? 0 : (int) ceil( $seconds / 60 );
			}
		}
		return array(
			'currency'              => self::currency(),
			'staff_choice'          => true,
			'notes'                 => true,
			'max_days_ahead'        => null === $latest ? 365 : max( 0, (int) round( $latest / DAY_IN_SECONDS ) ),
			'min_minutes_ahead'     => null === $earliest ? 0 : max( 0, (int) round( $earliest / 60 ) ),
			'cancel_before_minutes' => $cancel,
		);
	}

	/**
	 * A price as LatePoint shows it.
	 *
	 * @param float $amount Amount.
	 * @return array
	 */
	private function latepoint_price( $amount ) {
		if ( class_exists( '\\OsMoneyHelper' ) ) {
			$formatted = \OsMoneyHelper::format_price( (float) $amount );
		} else {
			$formatted = self::money( $amount, (string) self::setting( 'currency_symbol_before', '' ), 'before', (int) self::setting( 'number_of_decimals', 2 ) ) . (string) self::setting( 'currency_symbol_after', '' );
		}
		return self::price( $amount, self::currency(), $formatted );
	}

	/**
	 * An attachment's URL, or null.
	 *
	 * @param int $id Attachment.
	 * @return string|null
	 */
	private static function image( $id ) {
		$url = $id ? wp_get_attachment_image_url( (int) $id, 'medium' ) : false;
		return $url ? (string) $url : null;
	}

	/**
	 * SQL for "service s is bookable": active, visible, and an active agent provides it.
	 *
	 * @return string
	 */
	private static function bookable_sql() {
		return "s.status = 'active' AND s.visibility = 'visible' AND EXISTS (SELECT 1 FROM " . self::table( 'agents_services' ) . ' links INNER JOIN '
			. self::table( 'agents' ) . " agents ON agents.id = links.agent_id AND agents.status = 'active' WHERE links.service_id = s.id)";
	}

	/**
	 * Categories with bookable services.
	 *
	 * @return array
	 */
	public function categories() {
		global $wpdb;
		$categories = self::table( 'service_categories' );
		$services   = self::table( 'services' );
		$bookable   = self::bookable_sql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
		$rows = $wpdb->get_results( "SELECT c.id, c.name, c.selection_image_id, c.order_number, COUNT(s.id) AS services FROM {$categories} c INNER JOIN {$services} s ON s.category_id = c.id AND {$bookable} GROUP BY c.id, c.name, c.selection_image_id, c.order_number ORDER BY c.order_number ASC, c.id ASC", ARRAY_A );
		$out  = array();
		foreach ( (array) $rows as $row ) {
			$out[] = array(
				'id'        => (int) $row['id'],
				'name'      => (string) $row['name'],
				'count'     => (int) $row['services'],
				'image_url' => self::image( (int) $row['selection_image_id'] ),
			);
		}
		return $out;
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
		$where    = self::bookable_sql();
		$params   = array();
		if ( $args['category'] ) {
			$where   .= ' AND s.category_id = %d';
			$params[] = (int) $args['category'];
		}
		if ( '' !== $args['search'] ) {
			$where   .= ' AND s.name LIKE %s';
			$params[] = '%' . $wpdb->esc_like( $args['search'] ) . '%';
		}
		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;
		$count    = "SELECT COUNT(*) FROM {$services} s WHERE {$where}";
		$select   = "SELECT s.* FROM {$services} s WHERE {$where} ORDER BY s.order_number ASC, s.id ASC LIMIT %d OFFSET %d";
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- LatePoint's own tables; values are placeholders.
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
	 * A service's price: what LatePoint charges, else its listed price.
	 *
	 * @param array $row Service or custom price row.
	 * @return float
	 */
	private static function amount( array $row ) {
		$charge = isset( $row['charge_amount'] ) ? (float) $row['charge_amount'] : 0.0;
		return $charge > 0 ? $charge : (float) $row['price_min'];
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
			'image_url'        => self::image( (int) $row['selection_image_id'] ),
			'duration_minutes' => max( 1, (int) $row['duration'] ),
			'price'            => $this->latepoint_price( self::amount( $row ) ),
			'category_id'      => $row['category_id'] ? (int) $row['category_id'] : null,
			'color'            => ! empty( $row['bg_color'] ) ? (string) $row['bg_color'] : null,
		);
	}

	/**
	 * A bookable service's row, or null.
	 *
	 * @param int $service_id Service.
	 * @return array|null
	 */
	private function service_row( $service_id ) {
		global $wpdb;
		$services = self::table( 'services' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$services} s WHERE s.id = %d AND s.status = 'active' AND s.visibility = 'visible'", (int) $service_id ), ARRAY_A );
		return $row ? $row : null;
	}

	/**
	 * A bookable service with its staff.
	 *
	 * @param int $service_id Service.
	 * @return array|null
	 */
	public function service( $service_id ) {
		$row = $this->service_row( $service_id );
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
				'description_html' => wp_kses_post( wpautop( (string) $row['short_description'] ) ),
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
		$agents   = self::table( 'agents' );
		$links    = self::table( 'agents_services' );
		$services = self::table( 'services' );
		if ( $service_id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT DISTINCT a.* FROM {$agents} a INNER JOIN {$links} l ON l.agent_id = a.id WHERE l.service_id = %d AND a.status = 'active' ORDER BY a.first_name ASC, a.id ASC", (int) $service_id ), ARRAY_A );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
			$rows = $wpdb->get_results( "SELECT DISTINCT a.* FROM {$agents} a INNER JOIN {$links} l ON l.agent_id = a.id INNER JOIN {$services} s ON s.id = l.service_id AND s.status = 'active' AND s.visibility = 'visible' WHERE a.status = 'active' ORDER BY a.first_name ASC, a.id ASC", ARRAY_A );
		}
		$service = $service_id ? $this->service_row( $service_id ) : null;
		$out     = array();
		foreach ( (array) $rows as $row ) {
			$own   = $service ? $this->custom_price( (int) $row['id'], (int) $service_id ) : null;
			$name  = trim( $row['first_name'] . ' ' . $row['last_name'] );
			$out[] = self::person(
				(int) $row['id'],
				'' !== $name ? $name : (string) $row['display_name'],
				self::image( (int) $row['avatar_image_id'] ),
				'' !== trim( (string) $row['title'] ) ? (string) $row['title'] : wp_trim_words( wp_strip_all_tags( (string) $row['bio'] ), 12, '…' ),
				null !== $own && abs( $own - self::amount( $service ) ) > 0.001 ? $this->latepoint_price( $own ) : null
			);
		}
		return $out;
	}

	/**
	 * An agent's own price for a service, or null.
	 *
	 * @param int $agent_id   Agent.
	 * @param int $service_id Service.
	 * @return float|null
	 */
	private function custom_price( $agent_id, $service_id ) {
		global $wpdb;
		$links  = self::table( 'agents_services' );
		$prices = self::table( 'custom_prices' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT p.charge_amount, p.price_min FROM {$prices} p INNER JOIN {$links} l ON l.agent_id = p.agent_id AND l.service_id = p.service_id AND l.location_id = p.location_id AND l.is_custom_price = 1 WHERE p.agent_id = %d AND p.service_id = %d ORDER BY p.id ASC LIMIT 1", (int) $agent_id, (int) $service_id ), ARRAY_A );
		return $row ? self::amount( $row ) : null;
	}

	/**
	 * Where an agent provides a service: the first active location.
	 *
	 * @param int $agent_id   Agent.
	 * @param int $service_id Service.
	 * @return int
	 */
	private function location( $agent_id, $service_id ) {
		global $wpdb;
		$links     = self::table( 'agents_services' );
		$locations = self::table( 'locations' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT l.location_id FROM {$links} l INNER JOIN {$locations} loc ON loc.id = l.location_id AND loc.status = 'active' WHERE l.agent_id = %d AND l.service_id = %d ORDER BY loc.order_number ASC, loc.id ASC LIMIT 1", (int) $agent_id, (int) $service_id ) );
	}

	/**
	 * Whether LatePoint's classes the adapter relies on are loaded.
	 *
	 * @return bool
	 */
	private static function engine() {
		return class_exists( '\\OsResourceHelper' ) && class_exists( '\\LatePoint\\Misc\\BookingRequest' ) && class_exists( '\\OsBookingModel' );
	}

	/**
	 * A LatePoint date in the site's time zone.
	 *
	 * @param string $date Y-m-d.
	 * @return \DateTime
	 */
	private static function day( $date ) {
		return class_exists( '\\OsWpDateTime' ) ? new \OsWpDateTime( $date ) : new \DateTime( $date, self::timezone() );
	}

	/**
	 * Free start times by local date, from LatePoint's availability engine, inside its
	 * earliest and latest booking times.
	 *
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member or 0.
	 * @param string $from       First local date.
	 * @param int    $days       Days.
	 * @return array
	 */
	public function availability( $service_id, $staff_id, $from, $days ) {
		$service = $this->service_row( $service_id );
		if ( ! $service || ! self::engine() ) {
			return array();
		}
		$agents = array_map( 'intval', wp_list_pluck( $this->staff( (int) $service_id ), 'id' ) );
		$now    = new DateTimeImmutable( 'now', self::timezone() );
		$first  = $now;
		$last   = null;
		try {
			if ( class_exists( '\\OsSettingsHelper' ) ) {
				$earliest = (string) \OsSettingsHelper::get_earliest_possible_booking_restriction( (int) $service_id );
				$latest   = (string) \OsSettingsHelper::get_latest_possible_booking_restriction( (int) $service_id );
			} else {
				$earliest = (string) self::setting( 'earliest_possible_booking', '' );
				$latest   = (string) self::setting( 'latest_possible_booking', '' );
			}
			if ( '' !== $earliest && self::local( $earliest ) > $first ) {
				$first = self::local( $earliest );
			}
			if ( '' !== $latest ) {
				$last = self::local( $latest );
			}
			$request = new \LatePoint\Misc\BookingRequest(
				array(
					'start_date'      => $from,
					'service_id'      => (int) $service_id,
					'agent_id'        => (int) $staff_id,
					'location_id'     => 0,
					'duration'        => (int) $service['duration'],
					'buffer_before'   => (int) $service['buffer_before'],
					'buffer_after'    => (int) $service['buffer_after'],
					'total_attendees' => 1,
				)
			);
			$end     = self::day( $from );
			$end->modify( '+' . ( max( 1, (int) $days ) - 1 ) . ' days' );
			$resources = \OsResourceHelper::get_resources_grouped_by_day( $request, self::day( $from ), $end );
		} catch ( Throwable $e ) {
			return array();
		}
		$out = array();
		foreach ( (array) $resources as $date => $day_resources ) {
			$times = array();
			foreach ( (array) $day_resources as $resource ) {
				$agent = (int) $resource->agent_id;
				if ( ! in_array( $agent, $agents, true ) || ( $staff_id && (int) $staff_id !== $agent ) ) {
					continue;
				}
				foreach ( (array) $resource->slots as $slot ) {
					if ( ! $slot->can_accomodate( 1 ) ) {
						continue;
					}
					$time  = sprintf( '%02d:%02d', intdiv( (int) $slot->start_time, 60 ), (int) $slot->start_time % 60 );
					$start = self::local( $date . ' ' . $time );
					if ( ! $start || $start < $first || ( $last && $start > $last ) ) {
						continue;
					}
					$times[ $time ][] = $agent;
				}
			}
			ksort( $times );
			foreach ( $times as $time => $ids ) {
				$out[ (string) $date ][] = array(
					'time'      => (string) $time,
					'staff_ids' => array_values( array_unique( $ids ) ),
				);
			}
		}
		return $out;
	}

	/**
	 * The LatePoint customer for a WordPress user.
	 *
	 * @param int  $user_id WordPress user.
	 * @param bool $create  Create (or link by email) when missing.
	 * @return int Customer ID, or 0.
	 */
	private function customer( $user_id, $create = false ) {
		global $wpdb;
		$customers = self::table( 'customers' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own table.
		$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$customers} WHERE wordpress_user_id = %d ORDER BY id ASC LIMIT 1", (int) $user_id ) );
		if ( $id || ! $create || ! class_exists( '\\OsCustomerModel' ) ) {
			return $id;
		}
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return 0;
		}
		$email = (string) $user->user_email;
		if ( is_email( $email ) ) {
			// A customer who booked on the website with this email becomes this user's, as LatePoint does.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own table.
			$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$customers} WHERE email = %s AND (wordpress_user_id IS NULL OR wordpress_user_id = 0) ORDER BY id ASC LIMIT 1", $email ) );
			if ( $id ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- LatePoint's own table.
				$wpdb->update( $customers, array( 'wordpress_user_id' => (int) $user_id ), array( 'id' => $id ) );
				return $id;
			}
		} else {
			$email = 'customer-' . (int) $user->ID . '@app.invalid';
		}
		list( $first, $last ) = self::names( $user );
		if ( '' === $last && false !== strpos( $first, ' ' ) ) {
			list( $first, $last ) = preg_split( '/\s+/', $first, 2 );
		}
		try {
			$customer                    = new \OsCustomerModel();
			$customer->first_name        = $first;
			$customer->last_name         = $last;
			$customer->email             = $email;
			$customer->phone             = self::phone( $user_id );
			$customer->wordpress_user_id = (int) $user_id;
			$customer->is_guest          = false;
			if ( ! $customer->save() && ! $customer->save( false, true ) ) {
				return 0;
			}
			do_action( 'latepoint_customer_created', $customer ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LatePoint hook, fired as its checkout does.
		} catch ( Throwable $e ) {
			return 0;
		}
		return (int) $customer->id;
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
	 * Books a free time through LatePoint's models, the way its checkout saves an order.
	 *
	 * @param int    $user_id    User.
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member or 0.
	 * @param string $start      Local Y-m-d H:i.
	 * @param string $notes      The customer's note, kept as the order's comment.
	 * @return int|WP_Error Booking ID.
	 */
	public function book( $user_id, $service_id, $staff_id, $start, $notes ) {
		$service = $this->service_row( $service_id );
		if ( ! $service || ! self::engine() || ! class_exists( '\\OsOrderModel' ) || ! class_exists( '\\OsOrderItemModel' ) ) {
			return new WP_Error( 'bookings_unavailable', __( 'Bookings are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		$date = substr( $start, 0, 10 );
		$time = substr( $start, 11, 5 );
		if ( ! $staff_id ) {
			$day = $this->availability( $service_id, 0, $date, 1 );
			foreach ( isset( $day[ $date ] ) ? $day[ $date ] : array() as $slot ) {
				if ( $time === $slot['time'] && $slot['staff_ids'] ) {
					$staff_id = (int) $slot['staff_ids'][0];
				}
			}
			if ( ! $staff_id ) {
				return Bookings_Controller::slot_taken();
			}
		}
		$customer_id = $this->customer( $user_id, true );
		$location_id = $this->location( $staff_id, $service_id );
		if ( ! $customer_id || ! $location_id ) {
			return self::failed();
		}
		try {
			$booking                  = new \OsBookingModel();
			$booking->service_id      = (int) $service_id;
			$booking->agent_id        = (int) $staff_id;
			$booking->location_id     = $location_id;
			$booking->customer_id     = $customer_id;
			$booking->start_date      = $date;
			$booking->start_time      = (int) substr( $time, 0, 2 ) * 60 + (int) substr( $time, 3, 2 );
			$booking->duration        = (int) $service['duration'];
			$booking->total_attendees = 1;
			$booking->status          = class_exists( '\\OsBookingHelper' ) ? \OsBookingHelper::get_default_booking_status( (int) $service_id ) : 'approved';
			$booking->server_timezone = wp_timezone_string();
			$booking->set_buffers();
			$booking->calculate_end_date_and_time();
			$booking->set_utc_datetimes();
			if ( ! $booking->is_bookable() ) {
				return Bookings_Controller::slot_taken();
			}
			$own    = $this->custom_price( $staff_id, $service_id );
			$amount = null !== $own ? $own : self::amount( $service );
			if ( class_exists( '\\OsBookingHelper' ) && method_exists( '\\OsBookingHelper', 'calculate_full_amount_for_booking' ) ) {
				$amount = (float) \OsBookingHelper::calculate_full_amount_for_booking( $booking );
			}

			$order                   = new \OsOrderModel();
			$order->customer_id      = $customer_id;
			$order->subtotal         = $amount;
			$order->total            = $amount;
			$order->customer_comment = (string) $notes;
			$order->source_url       = home_url( '/' );
			if ( ! $order->save() ) {
				return self::failed();
			}
			$item            = new \OsOrderItemModel();
			$item->order_id  = $order->id;
			$item->variant   = defined( 'LATEPOINT_ITEM_VARIANT_BOOKING' ) ? LATEPOINT_ITEM_VARIANT_BOOKING : 'booking';
			$item->item_data = $booking->generate_item_data();
			$item->subtotal  = $amount;
			$item->total     = $amount;
			if ( ! $item->save() ) {
				$this->forget_order( (int) $order->id );
				return self::failed();
			}
			$booking->order_item_id = $item->id;
			if ( ! $booking->save() ) {
				$this->forget_order( (int) $order->id );
				return self::failed();
			}
			do_action( 'latepoint_booking_created', $booking ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LatePoint hook, fired as its checkout does.
			$data       = json_decode( (string) $booking->generate_item_data(), true );
			$data       = is_array( $data ) ? $data : array();
			$data['id'] = $booking->id;
			$item->update_attributes( array( 'item_data' => wp_json_encode( $data ) ) );
			if ( method_exists( $order, 'determine_payment_status' ) ) {
				$order->determine_payment_status();
			}
			do_action( 'latepoint_order_created', $order ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LatePoint hook, fired as its checkout does.
		} catch ( Throwable $e ) {
			return isset( $booking->id ) && $booking->id ? (int) $booking->id : self::failed();
		}
		return (int) $booking->id;
	}

	/**
	 * Removes an order whose booking couldn't be saved.
	 *
	 * @param int $order_id Order.
	 * @return void
	 */
	private function forget_order( $order_id ) {
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- LatePoint's own tables; the order this request just created.
		$wpdb->delete( self::table( 'order_items' ), array( 'order_id' => $order_id ) );
		$wpdb->delete( self::table( 'orders' ), array( 'id' => $order_id ) );
		// phpcs:enable
	}

	/**
	 * Base query for the customer's bookings.
	 *
	 * @return string
	 */
	private static function bookings_sql() {
		return 'SELECT b.id, b.status, b.start_date, b.start_time, b.end_date, b.end_time, b.start_datetime_utc, b.end_datetime_utc, s.id AS service_id, s.name AS service_name, s.selection_image_id, a.id AS staff_id, a.first_name, a.last_name, a.display_name, a.avatar_image_id, l.name AS location, oi.subtotal, o.customer_comment FROM '
			. self::table( 'bookings' ) . ' b INNER JOIN ' . self::table( 'services' ) . ' s ON s.id = b.service_id LEFT JOIN '
			. self::table( 'agents' ) . ' a ON a.id = b.agent_id LEFT JOIN ' . self::table( 'locations' ) . ' l ON l.id = b.location_id LEFT JOIN '
			. self::table( 'order_items' ) . ' oi ON oi.id = b.order_item_id LEFT JOIN ' . self::table( 'orders' ) . ' o ON o.id = oi.order_id';
	}

	/**
	 * A local "Y-m-d H:i" from a LatePoint date and minutes since midnight.
	 *
	 * @param string $date    Y-m-d.
	 * @param int    $minutes Minutes.
	 * @return string
	 */
	private static function at( $date, $minutes ) {
		$time = self::local( $date . ' 00:00' );
		return $time ? $time->modify( '+' . (int) $minutes . ' minutes' )->format( 'Y-m-d H:i' ) : '';
	}

	/**
	 * An appointment row from a query row.
	 *
	 * @param array $row Row.
	 * @return array
	 */
	private function row( array $row ) {
		$statuses = array(
			'approved'        => 'approved',
			'pending'         => 'pending',
			'payment_pending' => 'pending',
			'cancelled'       => 'cancelled',
			'no_show'         => 'no_show',
			'completed'       => 'completed',
		);
		$status   = isset( $statuses[ $row['status'] ] ) ? $statuses[ $row['status'] ] : 'pending';
		$start    = $row['start_datetime_utc'] ? self::utc_to_local( $row['start_datetime_utc'] ) : self::at( $row['start_date'], $row['start_time'] );
		$end      = $row['end_datetime_utc'] ? self::utc_to_local( $row['end_datetime_utc'] ) : self::at( $row['end_date'] ? $row['end_date'] : $row['start_date'], $row['end_time'] );
		$finished = self::local( $end );
		if ( 'approved' === $status && $finished && $finished->getTimestamp() < time() ) {
			$status = 'completed';
		}
		$name = trim( $row['first_name'] . ' ' . $row['last_name'] );
		return array(
			'id'           => (int) $row['id'],
			'status'       => $status,
			'status_label' => Bookings_Controller::status_label( $status ),
			'service'      => array(
				'id'        => (int) $row['service_id'],
				'name'      => (string) $row['service_name'],
				'image_url' => self::image( (int) $row['selection_image_id'] ),
			),
			'staff'        => $row['staff_id'] ? self::person( (int) $row['staff_id'], '' !== $name ? $name : (string) $row['display_name'], self::image( (int) $row['avatar_image_id'] ) ) : null,
			'start'        => $start,
			'end'          => $end,
			'price'        => $this->latepoint_price( (float) $row['subtotal'] ),
			'notes'        => (string) $row['customer_comment'],
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
		$active   = "'" . implode( "', '", self::ACTIVE ) . "'";
		$upcoming = 'upcoming' === $status;
		$where    = $upcoming
			? "b.customer_id = %d AND b.start_datetime_utc >= %s AND b.status IN ({$active})"
			: "b.customer_id = %d AND (b.start_datetime_utc < %s OR b.status NOT IN ({$active}))";
		$order    = $upcoming ? 'b.start_datetime_utc ASC' : 'b.start_datetime_utc DESC';
		$offset   = ( max( 1, (int) $page ) - 1 ) * max( 1, (int) $per_page );
		$base     = self::bookings_sql();
		$bookings = self::table( 'bookings' );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders -- LatePoint's own tables; the placeholders are in $where.
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$bookings} b WHERE {$where}", $customer, $now ) );
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Table names come from $wpdb->prefix.
		$rows = $wpdb->get_results( $wpdb->prepare( "{$base} WHERE {$where} ORDER BY {$order}, b.id ASC LIMIT %d OFFSET %d", $customer, $now, max( 1, (int) $per_page ), $offset ), ARRAY_A );
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
	 * @param int $appointment_id Booking ID.
	 * @return array|null
	 */
	public function appointment( $user_id, $appointment_id ) {
		global $wpdb;
		$customer = $this->customer( $user_id );
		if ( ! $customer ) {
			return null;
		}
		$base = self::bookings_sql();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- LatePoint's own tables.
		$row = $wpdb->get_row( $wpdb->prepare( "{$base} WHERE b.id = %d AND b.customer_id = %d", (int) $appointment_id, $customer ), ARRAY_A );
		return $row ? $this->row( $row ) : null;
	}

	/**
	 * Cancels through LatePoint, when its own customer rule allows it.
	 *
	 * @param int $user_id        User.
	 * @param int $appointment_id Booking ID.
	 * @return true|WP_Error
	 */
	public function cancel( $user_id, $appointment_id ) {
		$too_late = new WP_Error( 'too_late', __( 'This appointment can no longer be cancelled in the app. Please contact us.', 'yallapp' ), array( 'status' => 409 ) );
		if ( ! $this->appointment( $user_id, $appointment_id ) ) {
			return new WP_Error( 'not_found', __( 'Appointment not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		if ( ! class_exists( '\\OsBookingHelper' ) ) {
			return new WP_Error( 'bookings_unavailable', __( 'Bookings are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		try {
			$booking = new \OsBookingModel( (int) $appointment_id );
			if ( class_exists( '\\OsCustomerHelper' ) && ! \OsCustomerHelper::can_cancel_booking( $booking ) ) {
				return $too_late;
			}
			$done = \OsBookingHelper::change_booking_status( (int) $appointment_id, defined( 'LATEPOINT_BOOKING_STATUS_CANCELLED' ) ? LATEPOINT_BOOKING_STATUS_CANCELLED : 'cancelled' );
		} catch ( Throwable $e ) {
			$done = false;
		}
		return $done ? true : $too_late;
	}
}
