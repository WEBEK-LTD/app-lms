<?php
/**
 * Seeds BookingPress (a hair salon and spa) for the bookings checks, like the Amelia seed.
 * Run with: wp eval-file seed-bookings-bookingpress.php
 *
 * The free BookingPress has no staff and no hidden services, so yallapp_seed_ids has
 * no_staff set, ayse and mehmet at 0, and hidden at an ID that doesn't exist. Keys:
 * haircut, colouring, massage, hidden, hair, spa (categories), with the business open
 * Monday to Saturday 09:00 to 17:00.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

global $wpdb;

update_option( 'timezone_string', 'Europe/Istanbul' );

$t = static function ( $name ) use ( $wpdb ) {
	return $wpdb->prefix . 'bookingpress_' . $name;
};

$settings = array(
	array( 'payment_default_currency', 'TRY', 'payment_setting' ),
	array( 'price_symbol_position', 'before', 'payment_setting' ),
	array( 'price_number_of_decimals', '2', 'payment_setting' ),
	array( 'price_separator', 'comma-dot', 'payment_setting' ),
	array( 'on_site_payment', 'true', 'payment_setting' ),
	array( 'show_time_as_per_service_duration', 'true', 'general_setting' ),
	array( 'default_time_slot_step', '30', 'general_setting' ),
	array( 'share_timeslot_between_services', 'true', 'general_setting' ),
	array( 'default_minimum_time_for_canceling', '60', 'general_setting' ),
	array( 'onsite_appointment_status', '1', 'general_setting' ),
	array( 'appointment_status', 'Approved', 'general_setting' ),
);
foreach ( $settings as $setting ) {
	$wpdb->delete(
		$t( 'settings' ),
		array(
			'setting_name' => $setting[0],
			'setting_type' => $setting[2],
		)
	);
	$wpdb->insert(
		$t( 'settings' ),
		array(
			'setting_name'  => $setting[0],
			'setting_value' => $setting[1],
			'setting_type'  => $setting[2],
		)
	);
}
$wpdb->delete(
	$t( 'customize_settings' ),
	array(
		'bookingpress_setting_name' => 'allow_to_cancel_appointment',
		'bookingpress_setting_type' => 'booking_my_booking',
	)
);
$wpdb->insert(
	$t( 'customize_settings' ),
	array(
		'bookingpress_setting_name'  => 'allow_to_cancel_appointment',
		'bookingpress_setting_value' => 'true',
		'bookingpress_setting_type'  => 'booking_my_booking',
	)
);
wp_cache_flush();

foreach ( array( 'categories', 'services', 'servicesmeta', 'default_workhours', 'default_daysoff' ) as $table ) {
	$wpdb->query( 'DELETE FROM ' . $t( $table ) );
}

$category = static function ( $name, $position ) use ( $wpdb, $t ) {
	$wpdb->insert(
		$t( 'categories' ),
		array(
			'bookingpress_category_name'     => $name,
			'bookingpress_category_position' => $position,
		)
	);
	return (int) $wpdb->insert_id;
};
$hair = $category( 'Hair', 1 );
$spa  = $category( 'Spa', 2 );

$service = static function ( $name, $category, $minutes, $price, $position ) use ( $wpdb, $t ) {
	$wpdb->insert(
		$t( 'services' ),
		array(
			'bookingpress_category_id'          => $category,
			'bookingpress_service_name'         => $name,
			'bookingpress_service_price'        => $price,
			'bookingpress_service_duration_val' => $minutes,
			'bookingpress_service_duration_unit' => 'm',
			'bookingpress_service_description'  => $name . ' with our team.',
			'bookingpress_service_position'     => $position,
		)
	);
	return (int) $wpdb->insert_id;
};
$haircut   = $service( 'Haircut', $hair, 30, 300, 1 );
$colouring = $service( 'Hair colouring', $hair, 90, 900, 2 );
$massage   = $service( 'Massage', $spa, 60, 600, 3 );

// Monday to Saturday 09:00-17:00; Sunday has no hours (a day off).
foreach ( array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ) as $day ) {
	$wpdb->insert(
		$t( 'default_workhours' ),
		array(
			'bookingpress_workday_key' => $day,
			'bookingpress_start_time'  => 'sunday' === $day ? null : '09:00:00',
			'bookingpress_end_time'    => 'sunday' === $day ? null : '17:00:00',
			'bookingpress_is_break'    => 0,
		)
	);
}

update_option(
	'yallapp_seed_ids',
	array(
		'haircut'   => $haircut,
		'colouring' => $colouring,
		'massage'   => $massage,
		'hidden'    => 999999,
		'hair'      => $hair,
		'spa'       => $spa,
		'ayse'      => 0,
		'mehmet'    => 0,
		'one_staff' => false,
		'no_staff'  => true,
	)
);

echo "Seeded.\n";
