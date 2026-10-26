<?php
/**
 * Bookings endpoints.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use DateTimeImmutable;
use DateTimeZone;
use Exception;
use WP_Error;
use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Bookings\Base_Adapter;
use Yallapp\Bookings\Booking_Adapter;

/**
 * /bookings/* and /me/appointments/*, for Bookings apps on Amelia, BookingPress or
 * LatePoint. The adapter speaks the business's local time; this controller converts to
 * the contract's UTC times and adds what every plugin shares (can_cancel, home).
 */
class Bookings_Controller extends Controller {

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		// Public reads, as on the website; booking and anything about a person needs their token.
		$open = '__return_true';
		$auth = array( $this, 'require_user' );
		$this->route(
			'/bookings/home',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'home' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/bookings/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'categories' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/bookings/services',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'services' ),
				'permission_callback' => $open,
				'args'                => array_merge(
					self::page_args(),
					array(
						'search'   => array( 'type' => 'string' ),
						'category' => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
					)
				),
			)
		);
		$this->route(
			'/bookings/services/(?P<service_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'service' ),
				'permission_callback' => $open,
			)
		);
		$this->route(
			'/bookings/availability',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'availability' ),
				'permission_callback' => $open,
				'args'                => array(
					'service' => array(
						'type'     => 'integer',
						'minimum'  => 1,
						'required' => true,
					),
					'staff'   => array(
						'type'    => 'integer',
						'minimum' => 0,
						'default' => 0,
					),
					'from'    => array(
						'type'     => 'string',
						'pattern'  => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
						'required' => true,
					),
					'days'    => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 31,
						'default' => 7,
					),
				),
			)
		);
		$this->route(
			'/bookings/appointments',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'book' ),
				'permission_callback' => $auth,
				'args'                => array(
					'platform'   => self::platform_arg(),
					'service_id' => array(
						'type'     => 'integer',
						'minimum'  => 1,
						'required' => true,
					),
					'staff_id'   => array(
						'type'    => array( 'integer', 'null' ),
						'minimum' => 1,
					),
					'start'      => array(
						'type'     => 'string',
						'format'   => 'date-time',
						'required' => true,
					),
					'notes'      => array(
						'type'      => array( 'string', 'null' ),
						'maxLength' => 1000,
					),
				),
			)
		);
		$this->route(
			'/me/appointments',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'my_appointments' ),
				'permission_callback' => $auth,
				'args'                => array_merge(
					self::page_args(),
					array(
						'status' => array(
							'type'    => 'string',
							'enum'    => array( 'upcoming', 'past' ),
							'default' => 'upcoming',
						),
					)
				),
			)
		);
		$this->route(
			'/me/appointments/(?P<appointment_id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'my_appointment' ),
				'permission_callback' => $auth,
			)
		);
		$this->route(
			'/me/appointments/(?P<appointment_id>\d+)/cancel',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'cancel' ),
				'permission_callback' => $auth,
			)
		);
	}

	/**
	 * The adapter, or the error response for sites without a supported booking plugin.
	 *
	 * @return Booking_Adapter|\WP_REST_Response
	 */
	private function adapter() {
		$adapter = $this->plugin->bookings();
		if ( ! $adapter ) {
			return self::error( 'bookings_unavailable', __( 'Bookings are not available right now.', 'yallapp' ), 503 );
		}
		return $adapter;
	}

	/**
	 * Config.bookings for GET /config, or null.
	 *
	 * @param Booking_Adapter|null $adapter Adapter.
	 * @return array|null
	 */
	public static function config( $adapter ) {
		if ( ! $adapter ) {
			return null;
		}
		$rules = $adapter->rules();
		return array(
			'plugin'                => $adapter->id(),
			'plugin_version'        => $adapter->version(),
			'timezone'              => wp_timezone_string(),
			'currency'              => $rules['currency'],
			'staff_choice'          => (bool) $rules['staff_choice'],
			'notes'                 => (bool) $rules['notes'],
			'max_days_ahead'        => max( 1, (int) $rules['max_days_ahead'] ),
			'min_minutes_ahead'     => max( 0, (int) $rules['min_minutes_ahead'] ),
			'cancel_before_minutes' => null === $rules['cancel_before_minutes'] ? null : max( 0, (int) $rules['cancel_before_minutes'] ),
		);
	}

	/**
	 * GET /bookings/home.
	 *
	 * @return \WP_REST_Response
	 */
	public function home() {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$settings = $this->plugin->settings();
		$sections = array();
		foreach ( (array) $settings->get( 'bookings_home_sections' ) as $type ) {
			if ( 'banner' === $type ) {
				$image_id = (int) $settings->get( 'bookings_banner_image_id' );
				$image    = $image_id ? wp_get_attachment_url( $image_id ) : false;
				if ( $image ) {
					$service    = (int) $settings->get( 'bookings_banner_service_id' );
					$sections[] = array(
						'type'   => 'banner',
						'title'  => null,
						'banner' => array(
							'image_url'       => $image,
							'link_service_id' => $service && $adapter->service( $service ) ? $service : null,
						),
					);
				}
			} elseif ( 'next_appointment' === $type ) {
				$user_id = get_current_user_id();
				if ( $user_id ) {
					$next = $adapter->appointments( $user_id, 'upcoming', 1, 1 );
					if ( $next['items'] ) {
						$sections[] = array(
							'type'        => 'next_appointment',
							'title'       => __( 'Your next appointment', 'yallapp' ),
							'appointment' => $this->appointment_shape( $adapter, $next['items'][0] ),
						);
					}
				}
			} elseif ( 'categories' === $type ) {
				$categories = $adapter->categories();
				if ( $categories ) {
					$sections[] = array(
						'type'       => 'categories',
						'title'      => __( 'Categories', 'yallapp' ),
						'categories' => $categories,
					);
				}
			} elseif ( 'services' === $type ) {
				$services = $adapter->services(
					array(
						'page'     => 1,
						'per_page' => 10,
						'search'   => '',
						'category' => 0,
					)
				);
				if ( $services['items'] ) {
					$sections[] = array(
						'type'     => 'services',
						'title'    => __( 'Services', 'yallapp' ),
						'services' => $services['items'],
					);
				}
			} elseif ( 'staff' === $type ) {
				$staff = $adapter->staff( 0 );
				if ( count( $staff ) > 1 ) {
					$sections[] = array(
						'type'  => 'staff',
						'title' => __( 'Our team', 'yallapp' ),
						'staff' => $staff,
					);
				}
			}
		}
		return $this->ok( array( 'sections' => $sections ) );
	}

	/**
	 * GET /bookings/categories.
	 *
	 * @return \WP_REST_Response
	 */
	public function categories() {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		return $this->ok( array( 'items' => $adapter->categories() ) );
	}

	/**
	 * GET /bookings/services.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function services( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$result = $adapter->services(
			array(
				'page'     => (int) $request['page'],
				'per_page' => (int) $request['per_page'],
				'search'   => trim( (string) $request['search'] ),
				'category' => (int) $request['category'],
			)
		);
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $result['items'] ) ) );
	}

	/**
	 * GET /bookings/services/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function service( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$service = $adapter->service( (int) $request['service_id'] );
		if ( ! $service ) {
			return self::error( 'not_found', __( 'Service not found.', 'yallapp' ), 404 );
		}
		return $this->ok( $service );
	}

	/**
	 * GET /bookings/availability.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function availability( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$service = $adapter->service( (int) $request['service'] );
		if ( ! $service ) {
			return self::error( 'not_found', __( 'Service not found.', 'yallapp' ), 404 );
		}
		$staff = (int) $request['staff'];
		if ( $staff && ! in_array( $staff, array_map( 'intval', wp_list_pluck( $service['staff'], 'id' ) ), true ) ) {
			return self::error( 'invalid_request', __( 'This staff member doesn\'t provide this service.', 'yallapp' ), 400 );
		}
		$from = Base_Adapter::local( $request['from'] . ' 00:00' );
		if ( ! $from || $from->format( 'Y-m-d' ) !== $request['from'] ) {
			return self::error( 'invalid_request', __( 'Choose a valid date.', 'yallapp' ), 400 );
		}
		$days  = (int) $request['days'];
		$slots = $adapter->availability( (int) $service['id'], $staff, $from->format( 'Y-m-d' ), $days );
		return $this->ok(
			array(
				'timezone' => wp_timezone_string(),
				'days'     => self::days( $from, $days, $slots, (int) $service['duration_minutes'] ),
			)
		);
	}

	/**
	 * The contract's days: every day in the range, slots with UTC start and end.
	 *
	 * @param DateTimeImmutable $from     First local day, at midnight.
	 * @param int               $days     Number of days.
	 * @param array             $slots    Adapter slots by local date.
	 * @param int               $duration Minutes.
	 * @return array
	 */
	public static function days( DateTimeImmutable $from, $days, array $slots, $duration ) {
		$utc = new DateTimeZone( 'UTC' );
		$out = array();
		for ( $i = 0; $i < $days; $i++ ) {
			$date  = $from->modify( '+' . $i . ' days' )->format( 'Y-m-d' );
			$items = array();
			$seen  = array();
			foreach ( isset( $slots[ $date ] ) ? $slots[ $date ] : array() as $slot ) {
				$start = Base_Adapter::local( $date . ' ' . $slot['time'] );
				if ( ! $start || isset( $seen[ $slot['time'] ] ) ) {
					continue;
				}
				$seen[ $slot['time'] ] = true;
				$items[]               = array(
					'start'      => $start->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ),
					'end'        => $start->modify( '+' . (int) $duration . ' minutes' )->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ),
					'local_time' => $start->format( 'H:i' ),
					'staff_ids'  => array_values( array_unique( array_map( 'intval', $slot['staff_ids'] ) ) ),
				);
			}
			usort(
				$items,
				static function ( $a, $b ) {
					return strcmp( $a['start'], $b['start'] );
				}
			);
			$out[] = array(
				'date'  => $date,
				'slots' => $items,
			);
		}
		return $out;
	}

	/**
	 * POST /bookings/appointments.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function book( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$service = $adapter->service( (int) $request['service_id'] );
		if ( ! $service ) {
			return self::error( 'invalid_request', __( 'This service can\'t be booked.', 'yallapp' ), 400 );
		}
		$staff = (int) $request['staff_id'];
		if ( $staff && ! in_array( $staff, array_map( 'intval', wp_list_pluck( $service['staff'], 'id' ) ), true ) ) {
			return self::error( 'invalid_request', __( 'This staff member doesn\'t provide this service.', 'yallapp' ), 400 );
		}
		try {
			$start = new DateTimeImmutable( (string) $request['start'] );
		} catch ( Exception $e ) {
			return self::error( 'invalid_request', __( 'Choose a time.', 'yallapp' ), 400 );
		}
		$local = $start->setTimezone( Base_Adapter::timezone() );
		// The time must be one the plugin offers now: free, and inside its booking window.
		$day   = $adapter->availability( (int) $service['id'], $staff, $local->format( 'Y-m-d' ), 1 );
		$free  = false;
		$taken = array();
		foreach ( isset( $day[ $local->format( 'Y-m-d' ) ] ) ? $day[ $local->format( 'Y-m-d' ) ] : array() as $slot ) {
			if ( $slot['time'] === $local->format( 'H:i' ) ) {
				$free  = true;
				$taken = $slot['staff_ids'];
			}
		}
		if ( ! $free || ( $staff && ! in_array( $staff, array_map( 'intval', $taken ), true ) ) ) {
			return self::error( 'slot_taken', __( 'This time was just taken. Please choose another one.', 'yallapp' ), 409 );
		}
		$notes = $adapter->rules()['notes'] ? sanitize_textarea_field( (string) $request['notes'] ) : '';
		$id    = $adapter->book( get_current_user_id(), (int) $service['id'], $staff, $local->format( 'Y-m-d H:i' ), $notes );
		if ( is_wp_error( $id ) ) {
			return self::from_wp_error( $id );
		}
		$row = $adapter->appointment( get_current_user_id(), $id );
		if ( ! $row ) {
			return self::error( 'not_found', __( 'Appointment not found.', 'yallapp' ), 404 );
		}
		return $this->ok( $this->appointment_shape( $adapter, $row ), 201 );
	}

	/**
	 * GET /me/appointments.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function my_appointments( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$result = $adapter->appointments( get_current_user_id(), (string) $request['status'], (int) $request['page'], (int) $request['per_page'] );
		$items  = array();
		foreach ( $result['items'] as $row ) {
			$items[] = $this->appointment_shape( $adapter, $row );
		}
		return $this->ok( array_merge( self::page_meta( $request, $result['total'] ), array( 'items' => $items ) ) );
	}

	/**
	 * GET /me/appointments/{id}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function my_appointment( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$row = $adapter->appointment( get_current_user_id(), (int) $request['appointment_id'] );
		if ( ! $row ) {
			return self::error( 'not_found', __( 'Appointment not found.', 'yallapp' ), 404 );
		}
		return $this->ok( $this->appointment_shape( $adapter, $row ) );
	}

	/**
	 * POST /me/appointments/{id}/cancel.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function cancel( WP_REST_Request $request ) {
		$adapter = $this->adapter();
		if ( ! $adapter instanceof Booking_Adapter ) {
			return $adapter;
		}
		$user_id = get_current_user_id();
		$id      = (int) $request['appointment_id'];
		$row     = $adapter->appointment( $user_id, $id );
		if ( ! $row ) {
			return self::error( 'not_found', __( 'Appointment not found.', 'yallapp' ), 404 );
		}
		if ( ! $this->can_cancel( $adapter, $row ) ) {
			return self::error( 'too_late', __( 'This appointment can no longer be cancelled in the app. Please contact us.', 'yallapp' ), 409 );
		}
		$done = $adapter->cancel( $user_id, $id );
		if ( is_wp_error( $done ) ) {
			return self::from_wp_error( $done );
		}
		return $this->ok( $this->appointment_shape( $adapter, $adapter->appointment( $user_id, $id ) ) );
	}

	/**
	 * Whether the customer may cancel now: not started, not already closed, and far
	 * enough ahead for the business's rule.
	 *
	 * @param Booking_Adapter $adapter Adapter.
	 * @param array           $row     Appointment row.
	 * @return bool
	 */
	private function can_cancel( Booking_Adapter $adapter, array $row ) {
		$before = $adapter->rules()['cancel_before_minutes'];
		if ( null === $before || ! $this->plugin->settings()->get( 'bookings_cancel' ) ) {
			return false;
		}
		if ( ! in_array( $row['status'], array( 'approved', 'pending' ), true ) ) {
			return false;
		}
		$start = Base_Adapter::local( $row['start'] );
		return $start && $start->getTimestamp() - time() >= (int) $before * MINUTE_IN_SECONDS;
	}

	/**
	 * The contract's Appointment.
	 *
	 * @param Booking_Adapter $adapter Adapter.
	 * @param array           $row     Appointment row: id, status, status_label, service, staff, start, end (local), price, notes, location.
	 * @return array
	 */
	private function appointment_shape( Booking_Adapter $adapter, array $row ) {
		$utc   = new DateTimeZone( 'UTC' );
		$start = Base_Adapter::local( $row['start'] );
		$end   = Base_Adapter::local( $row['end'] );
		return array(
			'id'           => (int) $row['id'],
			'status'       => $row['status'],
			'status_label' => $row['status_label'],
			'service'      => $row['service'],
			'staff'        => $row['staff'],
			'start'        => $start ? $start->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ) : null,
			'end'          => $end ? $end->setTimezone( $utc )->format( 'Y-m-d\TH:i:s\Z' ) : null,
			'local_date'   => $start ? $start->format( 'Y-m-d' ) : null,
			'local_time'   => $start ? $start->format( 'H:i' ) : null,
			'price'        => $row['price'],
			'notes'        => '' !== (string) $row['notes'] ? (string) $row['notes'] : null,
			'location'     => isset( $row['location'] ) && '' !== (string) $row['location'] ? (string) $row['location'] : null,
			'can_cancel'   => $this->can_cancel( $adapter, $row ),
		);
	}

	/**
	 * The label for a contract status, for plugins without their own wording.
	 *
	 * @param string $status Contract status.
	 * @return string
	 */
	public static function status_label( $status ) {
		$labels = array(
			'approved'  => __( 'Approved', 'yallapp' ),
			'pending'   => __( 'Pending', 'yallapp' ),
			'cancelled' => __( 'Cancelled', 'yallapp' ),
			'rejected'  => __( 'Rejected', 'yallapp' ),
			'no_show'   => __( 'No-show', 'yallapp' ),
			'completed' => __( 'Completed', 'yallapp' ),
		);
		return isset( $labels[ $status ] ) ? $labels[ $status ] : ucfirst( (string) $status );
	}

	/**
	 * A WP_Error for a time that's no longer free.
	 *
	 * @return WP_Error
	 */
	public static function slot_taken() {
		return new WP_Error( 'slot_taken', __( 'This time was just taken. Please choose another one.', 'yallapp' ), array( 'status' => 409 ) );
	}
}
