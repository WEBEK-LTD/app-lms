<?php
/**
 * Must-use plugin for the dev site only: MySQL functions that booking plugins and Paid
 * Memberships Pro call and SQLite lacks, so their queries run on the SQLite test database as they do on MySQL.
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
	// 90.3 Paid Memberships Pro: CONVERT_TZ(date, '+00:00', @@global.time_zone), the database
	// keeping UTC as the test site does, and UNIX_TIMESTAMP(date) of a UTC date.
	$yallapp_pdo->sqliteCreateFunction(
		'CONVERT_TZ',
		static function ( $value, $from = null, $to = null ) {
			return $value;
		}
	);
	$yallapp_pdo->sqliteCreateFunction(
		'UNIX_TIMESTAMP',
		static function ( $value = null ) {
			if ( null === $value ) {
				return time();
			}
			$time = strtotime( (string) $value . ' UTC' );
			return false === $time ? null : $time;
		}
	);
}

// 90.3 Paid Memberships Pro groups a user's levels by the "ID" alias, which SQLite finds
// ambiguous with its joined tables' columns: name the level's own column, as MySQL reads it.
add_filter(
	'query',
	static function ( $query ) {
		if ( is_string( $query ) && false !== strpos( $query, 'pmpro_memberships_users' ) ) {
			$query = (string) preg_replace( '/GROUP BY\s+ID\b/', 'GROUP BY l.id', $query );
		}
		return $query;
	}
);

