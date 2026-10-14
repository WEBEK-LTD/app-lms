<?php
/**
 * Seeds Amelia (a hair salon and spa) for the bookings checks.
 * Run with: wp eval-file seed-bookings-amelia.php
 *
 * yallapp_seed_ids keys: haircut, colouring (Ayşe charges her own price), massage,
 * hidden (not shown to customers), hair, spa (categories), ayse, mehmet (staff, both
 * working Monday to Saturday 09:00 to 17:00), one_staff (true on Amelia Lite, which
 * schedules only its first employee, Ayşe).
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

global $wpdb;

update_option( 'timezone_string', 'Europe/Istanbul' );

$raw      = get_option( 'amelia_settings' );
$settings = is_string( $raw ) ? json_decode( $raw, true ) : (array) $raw;
$settings['general']['minimumTimeRequirementPriorToBooking']   = 0;
$settings['general']['minimumTimeRequirementPriorToCanceling'] = 3600;
$settings['general']['numberOfDaysAvailableForBooking']        = 60;
$settings['general']['defaultAppointmentStatus']               = 'approved';
$settings['payments']['currency']                              = 'TRY';
$settings['payments']['symbol']                                = '₺';
$settings['payments']['priceSymbolPosition']                   = 'before';
$settings['payments']['priceNumberOfDecimals']                 = 2;
update_option( 'amelia_settings', wp_json_encode( $settings ) );

$t = static function ( $name ) use ( $wpdb ) {
	return $wpdb->prefix . 'amelia_' . $name;
};

$wpdb->query( 'DELETE FROM ' . $t( 'categories' ) );
$wpdb->insert(
	$t( 'categories' ),
	array(
		'status'   => 'visible',
		'name'     => 'Hair',
		'position' => 1,
	)
);
$hair = (int) $wpdb->insert_id;
$wpdb->insert(
	$t( 'categories' ),
	array(
		'status'   => 'visible',
		'name'     => 'Spa',
		'position' => 2,
	)
);
$spa = (int) $wpdb->insert_id;

$service = static function ( $name, $category, $minutes, $price, $position, $status = 'visible' ) use ( $wpdb, $t ) {
	$wpdb->insert(
		$t( 'services' ),
		array(
			'name'           => $name,
			'description'    => '<p>' . $name . ' with our team.</p>',
			'color'          => '#1D6B48',
			'price'          => $price,
			'status'         => $status,
			'categoryId'     => $category,
			'minCapacity'    => 1,
			'maxCapacity'    => 1,
			'duration'       => $minutes * 60,
			'timeBefore'     => 0,
			'timeAfter'      => 0,
			'bringingAnyone' => 0,
			'priority'       => 'least_expensive',
			'position'       => $position,
			'show'           => 1,
		)
	);
	return (int) $wpdb->insert_id;
};
$haircut   = $service( 'Haircut', $hair, 30, 300, 1 );
$colouring = $service( 'Hair colouring', $hair, 90, 900, 2 );
$massage   = $service( 'Massage', $spa, 60, 600, 3 );
$hidden    = $service( 'Staff training', $spa, 60, 0, 4, 'hidden' );

$provider = static function ( $first, $last, $email ) use ( $wpdb, $t ) {
	$wpdb->insert(
		$t( 'users' ),
		array(
			'status'      => 'visible',
			'type'        => 'provider',
			'firstName'   => $first,
			'lastName'    => $last,
			'email'       => $email,
			'description' => 'Senior stylist with ten years of experience.',
			'timeZone'    => 'Europe/Istanbul',
		)
	);
	$id = (int) $wpdb->insert_id;
	for ( $day = 1; $day <= 6; $day++ ) {
		$wpdb->insert(
			$t( 'providers_to_weekdays' ),
			array(
				'userId'    => $id,
				'dayIndex'  => $day,
				'startTime' => '09:00:00',
				'endTime'   => '17:00:00',
			)
		);
	}
	return $id;
};
$ayse   = $provider( 'Ayşe', 'Kaya', 'ayse@salon.test' );
$mehmet = $provider( 'Mehmet', 'Demir', 'mehmet@salon.test' );

foreach ( array(
	array( $ayse, $haircut, 300 ),
	array( $ayse, $colouring, 950 ),
	array( $mehmet, $haircut, 300 ),
	array( $mehmet, $massage, 600 ),
	array( $mehmet, $hidden, 0 ),
) as $link ) {
	$wpdb->insert(
		$t( 'providers_to_services' ),
		array(
			'userId'      => $link[0],
			'serviceId'   => $link[1],
			'price'       => $link[2],
			'minCapacity' => 1,
			'maxCapacity' => 1,
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
		'one_staff' => class_exists( '\\AmeliaBooking\\Infrastructure\\Licence\\Licence' )
			&& ! \AmeliaBooking\Infrastructure\Licence\Licence::hasLicenseAccess( \AmeliaBooking\Infrastructure\Licence\LicenceConstants::STARTER ),
	)
);

echo "Seeded.\n";
