<?php
/**
 * Removes Yallapp data when the plugin is deleted.
 *
 * Student accounts, enrollments and progress belong to the LMS and stay untouched.
 *
 * @package Yallapp
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

foreach ( array( 'yallapp_devices', 'yallapp_tokens', 'yallapp_notifications' ) as $yallapp_table ) {
	$wpdb->query( 'DROP TABLE IF EXISTS ' . esc_sql( $wpdb->prefix . $yallapp_table ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared -- Plugin tables.
}

foreach ( array( 'yallapp_settings', 'yallapp_secret', 'yallapp_license', 'yallapp_layout', 'yallapp_db_version', 'yallapp_seed_ids', 'yallapp_store_grants' ) as $yallapp_option ) {
	delete_option( $yallapp_option );
}

// Transients and per-user progress kept by the app.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_yallapp\\_%' OR option_name LIKE '\\_transient\\_timeout\\_yallapp\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
// 85.4 What each campaign from the Yallapp dashboard sent.
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'yallapp\\_campaign\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'yallapp\\_position\\_%' OR meta_key LIKE 'yallapp\\_watched\\_%' OR meta_key = 'yallapp_notifications_read_id'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
// 100.4 What the app gave through the stores (the access itself stays with the LMS and plugins).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'yallapp\\_grant\\_lock\\_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key = 'yallapp_store_access'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
$wpdb->query( "DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_yallapp_render_mode', '_yallapp_embed_height')" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery

foreach ( array( 'yallapp_daily', 'yallapp_license_check', 'yallapp_layout_refresh', 'yallapp_push_send', 'yallapp_campaign_send', 'yallapp_billing_catalog' ) as $yallapp_hook ) {
	wp_unschedule_hook( $yallapp_hook );
}
