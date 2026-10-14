<?php
/**
 * Seeds LatePoint (a hair salon and spa) for the bookings checks, like the Amelia seed.
 * Run with: wp eval-file seed-bookings-latepoint.php
 *
 * yallapp_seed_ids keys: haircut, colouring (Ayşe charges her own price), massage,
 * hidden (not shown to customers), hair, spa (categories), ayse, mehmet (staff, both
 * working Monday to Saturday 09:00 to 17:00), location.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

global $wpdb;

update_option( 'timezone_string', 'Europe/Istanbul' );

$t   = static function ( $name ) use ( $wpdb ) {
	return $wpdb->prefix . 'latepoint_' . $name;
};
$now = gmdate( 'Y-m-d H:i:s' );

$settings = array(
	'currency_symbol_before'              => '₺',
	'currency_symbol_after'               => '',
	'number_of_decimals'                  => '2',
	'default_booking_status'              => 'approved',
	'earliest_possible_booking'           => '',
	'latest_possible_booking'             => '+60 days',
	'allow_customer_booking_cancellation' => 'on',
	'limit_when_customer_can_cancel'      => 'on',
	'cancellation_limit_value'            => '1',
	'cancellation_limit_unit'             => 'hour',
	'timeblock_interval'                  => '30',
);
foreach ( $settings as $name => $value ) {
	$wpdb->delete( $t( 'settings' ), array( 'name' => $name ) );
	$wpdb->insert(
		$t( 'settings' ),
		array(
			'name'       => $name,
			'value'      => $value,
			'created_at' => $now,
			'updated_at' => $now,
		)
	);
}

$location = (int) $wpdb->get_var( 'SELECT id FROM ' . $t( 'locations' ) . ' ORDER BY id ASC LIMIT 1' );
if ( ! $location ) {
	$wpdb->insert(
		$t( 'locations' ),
		array(
			'name'       => 'Salon',
			'status'     => 'active',
			'created_at' => $now,
			'updated_at' => $now,
		)
	);
	$location = (int) $wpdb->insert_id;
}

foreach ( array( 'service_categories', 'services', 'agents', 'agents_services', 'custom_prices', 'work_periods' ) as $table ) {
	$wpdb->query( 'DELETE FROM ' . $t( $table ) );
}

$category = static function ( $name, $order ) use ( $wpdb, $t, $now ) {
	$wpdb->insert(
		$t( 'service_categories' ),
		array(
			'name'         => $name,
			'parent_id'    => 0,
			'order_number' => $order,
			'created_at'   => $now,
			'updated_at'   => $now,
		)
	);
	return (int) $wpdb->insert_id;
};
$hair = $category( 'Hair', 1 );
$spa  = $category( 'Spa', 2 );

$service = static function ( $name, $category, $minutes, $price, $order, $visibility = 'visible' ) use ( $wpdb, $t, $now ) {
	$wpdb->insert(
		$t( 'services' ),
		array(
			'name'               => $name,
			'short_description'  => $name . ' with our team.',
			'is_price_variable'  => 0,
			'price_min'          => $price,
			'price_max'          => $price,
			'charge_amount'      => $price,
			'deposit_amount'     => 0,
			'duration'           => $minutes,
			'buffer_before'      => 0,
			'buffer_after'       => 0,
			'category_id'        => $category,
			'order_number'       => $order,
			'bg_color'           => '#1D6B48',
			'timeblock_interval' => 30,
			'capacity_min'       => 1,
			'capacity_max'       => 1,
			'status'             => 'active',
			'visibility'         => $visibility,
			'created_at'         => $now,
			'updated_at'         => $now,
		)
	);
	return (int) $wpdb->insert_id;
};
$haircut   = $service( 'Haircut', $hair, 30, 300, 1 );
$colouring = $service( 'Hair colouring', $hair, 90, 900, 2 );
$massage   = $service( 'Massage', $spa, 60, 600, 3 );
$hidden    = $service( 'Staff training', $spa, 60, 0, 4, 'hidden' );

$agent = static function ( $first, $last, $email ) use ( $wpdb, $t, $now ) {
	$wpdb->insert(
		$t( 'agents' ),
		array(
			'first_name'   => $first,
			'last_name'    => $last,
			'display_name' => $first . ' ' . $last,
			'title'        => 'Senior stylist',
			'bio'          => 'Senior stylist with ten years of experience.',
			'email'        => $email,
			'phone'        => '',
			'status'       => 'active',
			'custom_hours' => 0,
			'created_at'   => $now,
			'updated_at'   => $now,
		)
	);
	return (int) $wpdb->insert_id;
};
$ayse   = $agent( 'Ayşe', 'Kaya', 'ayse@salon.test' );
$mehmet = $agent( 'Mehmet', 'Demir', 'mehmet@salon.test' );

foreach ( array(
	array( $ayse, $haircut, null ),
	array( $ayse, $colouring, 950 ),
	array( $mehmet, $haircut, null ),
	array( $mehmet, $massage, null ),
	array( $mehmet, $hidden, null ),
) as $link ) {
	$wpdb->insert(
		$t( 'agents_services' ),
		array(
			'agent_id'           => $link[0],
			'service_id'         => $link[1],
			'location_id'        => $location,
			'is_custom_hours'    => 0,
			'is_custom_price'    => null === $link[2] ? 0 : 1,
			'is_custom_duration' => 0,
			'created_at'         => $now,
			'updated_at'         => $now,
		)
	);
	if ( null !== $link[2] ) {
		$wpdb->insert(
			$t( 'custom_prices' ),
			array(
				'agent_id'            => $link[0],
				'service_id'          => $link[1],
				'location_id'         => $location,
				'is_price_variable'   => 0,
				'price_min'           => $link[2],
				'price_max'           => $link[2],
				'charge_amount'       => $link[2],
				'is_deposit_required' => 0,
				'deposit_amount'      => 0,
				'created_at'          => $now,
				'updated_at'          => $now,
			)
		);
	}
}

// General hours: Monday (1) to Saturday (6) 09:00-17:00, Sunday (7) off (start and end 0).
for ( $day = 1; $day <= 7; $day++ ) {
	$wpdb->insert(
		$t( 'work_periods' ),
		array(
			'agent_id'    => 0,
			'service_id'  => 0,
			'location_id' => 0,
			'start_time'  => 7 === $day ? 0 : 540,
			'end_time'    => 7 === $day ? 0 : 1020,
			'week_day'    => $day,
			'chain_id'    => '',
			'created_at'  => $now,
			'updated_at'  => $now,
		)
	);
}

update_option(
	'yallapp_seed_ids',
	array(
		'haircut'   => $haircut,
		'colouring' => $colouring,
		'massage'   => $massage,
		'hidden'    => $hidden,
		'hair'      => $hair,
		'spa'       => $spa,
		'ayse'      => $ayse,
		'mehmet'    => $mehmet,
		'location'  => $location,
		'one_staff' => false,
	)
);

echo "Seeded.\n";
