<?php
/**
 * Booking plugin integration contract.
 *
 * @package Yallapp
 */

namespace Yallapp\Bookings;

defined( 'ABSPATH' ) || exit;

use WP_Error;

/**
 * What the Bookings endpoints need from a booking plugin. Methods return data shaped like
 * the API contract (docs/api/openapi.yaml), except times: adapters work in the business's
 * local time ("Y-m-d H:i" in the site's time zone) and the controller converts.
 */
interface Booking_Adapter {

	/**
	 * Machine name: amelia, bookingpress or latepoint.
	 *
	 * @return string
	 */
	public function id();

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version();

	/**
	 * The plugin's booking rules.
	 *
	 * @return array{currency: string, staff_choice: bool, notes: bool, max_days_ahead: int, min_minutes_ahead: int, cancel_before_minutes: int|null}
	 */
	public function rules();

	/**
	 * Categories with services customers can book.
	 *
	 * @return array<int, array> ServiceCategory items.
	 */
	public function categories();

	/**
	 * Services customers can book, in the plugin's order.
	 *
	 * @param array{page: int, per_page: int, search: string, category: int} $args Filters.
	 * @return array{items: array<int, array>, total: int} ServiceSummary items.
	 */
	public function services( array $args );

	/**
	 * A service customers can book, with its staff, or null.
	 *
	 * @param int $service_id Service.
	 * @return array|null ServiceDetail.
	 */
	public function service( $service_id );

	/**
	 * Staff members who provide services (all, or one service's).
	 *
	 * @param int $service_id Service, or 0 for everyone who provides a bookable service.
	 * @return array<int, array> StaffMember items.
	 */
	public function staff( $service_id = 0 );

	/**
	 * Free start times by local date, as the plugin computes them.
	 *
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member, or 0 for anyone.
	 * @param string $from       First local date, Y-m-d.
	 * @param int    $days       Number of days.
	 * @return array<string, array<int, array{time: string, staff_ids: int[]}>> Local date => slots, times "H:i".
	 */
	public function availability( $service_id, $staff_id, $from, $days );

	/**
	 * Books a free time for a customer, through the plugin.
	 *
	 * @param int    $user_id    WordPress user.
	 * @param int    $service_id Service.
	 * @param int    $staff_id   Staff member, or 0 for the plugin to pick.
	 * @param string $start      Local start, Y-m-d H:i.
	 * @param string $notes      The customer's note.
	 * @return int|WP_Error The appointment ID; slot_taken when the time is gone.
	 */
	public function book( $user_id, $service_id, $staff_id, $start, $notes );

	/**
	 * The customer's appointments.
	 *
	 * @param int    $user_id  WordPress user.
	 * @param string $status   upcoming or past.
	 * @param int    $page     Page.
	 * @param int    $per_page Page size.
	 * @return array{items: array<int, array>, total: int} Appointment rows (see Base_Adapter::appointment_row()).
	 */
	public function appointments( $user_id, $status, $page, $per_page );

	/**
	 * One of the customer's appointments, or null.
	 *
	 * @param int $user_id        WordPress user.
	 * @param int $appointment_id Appointment.
	 * @return array|null Appointment row.
	 */
	public function appointment( $user_id, $appointment_id );

	/**
	 * Cancels one of the customer's appointments through the plugin.
	 *
	 * @param int $user_id        WordPress user.
	 * @param int $appointment_id Appointment.
	 * @return true|WP_Error
	 */
	public function cancel( $user_id, $appointment_id );
}
