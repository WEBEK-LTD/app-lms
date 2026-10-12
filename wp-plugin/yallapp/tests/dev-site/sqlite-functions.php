<?php
/**
 * Must-use plugin for the dev site only: MySQL functions that booking plugins call and
 * SQLite lacks, so their queries run on the SQLite test database as they do on MySQL.
 *
 * @package Yallapp
 */

// phpcs:disable -- Test environment only, never shipped.

$yallapp_dbh = isset( $GLOBALS['wpdb']->dbh ) ? $GLOBALS['wpdb']->dbh : null;
$yallapp_pdo = null;
if ( is_object( $yallapp_dbh ) ) {
	if ( method_exists( $yallapp_dbh, 'get_pdo' ) ) {
		$yallapp_pdo = $yallapp_dbh->get_pdo();
	} elseif ( method_exists( $yallapp_dbh, 'get_connection' ) ) {
		$yallapp_connection = $yallapp_dbh->get_connection();
		if ( is_object( $yallapp_connection ) && method_exists( $yallapp_connection, 'get_pdo' ) ) {
			$yallapp_pdo = $yallapp_connection->get_pdo();
		}
	}
}
if ( $yallapp_pdo instanceof PDO ) {
	// STR_TO_DATE('2026-10-18 21:00:00', '%Y-%m-%d %H:%i:%s'): dates are already in SQL format.
	$yallapp_pdo->sqliteCreateFunction(
		'STR_TO_DATE',
		static function ( $value, $format = '' ) {
			$time = strtotime( (string) $value );
			return false === $time ? null : gmdate( false !== strpos( (string) $format, '%H' ) ? 'Y-m-d H:i:s' : 'Y-m-d', $time );
		}
	);
}
