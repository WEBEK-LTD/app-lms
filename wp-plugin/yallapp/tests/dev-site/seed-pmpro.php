<?php
/**
 * 90.3 Paid Memberships Pro on the Tutor LMS dev site: a "Gold" level, required by the free
 * Python course ("Require membership" on the course, as sites protect courses with PMPro).
 * Runs after seed.php. Run with: wp eval-file seed-pmpro.php
 *
 * Adds to yallapp_seed_ids: gold (the level's ID).
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Test fixture.

global $wpdb;

// The tables, as PMPro makes them when it's activated from wp-admin.
if ( function_exists( 'pmpro_db_delta' ) ) {
	pmpro_db_delta();
}

$wpdb->insert(
	$wpdb->pmpro_membership_levels,
	array(
		'name'              => 'Gold',
		'description'       => 'Every course.',
		'confirmation'      => '',
		'initial_payment'   => 0,
		'billing_amount'    => 0,
		'cycle_number'      => 0,
		'cycle_period'      => '',
		'billing_limit'     => 0,
		'trial_amount'      => 0,
		'trial_limit'       => 0,
		'allow_signups'     => 1,
		'expiration_number' => 0,
		'expiration_period' => '',
	)
);
$gold = (int) $wpdb->insert_id;

$seed = (array) get_option( 'yallapp_seed_ids', array() );
$wpdb->insert(
	$wpdb->pmpro_memberships_pages,
	array(
		'membership_id' => $gold,
		'page_id'       => (int) $seed['python'],
	)
);

$seed['gold'] = $gold;
update_option( 'yallapp_seed_ids', $seed );

echo 'Paid Memberships Pro seeded: Gold is level ' . $gold . ".\n";
