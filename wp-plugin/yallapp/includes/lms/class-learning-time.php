<?php
/**
 * The time students spend learning.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

use Yallapp\Installer;

defined( 'ABSPATH' ) || exit;

/**
 * 123 The time a student spends in a lesson, as the app counts it while the lesson is open
 * and the app in front: kept per day in the site's time zone and per course, at most a day's
 * worth for each. My courses shows this week's, each day of it, against the week before;
 * the account the whole of it.
 */
class Learning_Time {

	/** The most one report adds: five minutes. */
	const MAX_REPORT = 300;
	/** The most a day holds for one course. */
	const MAX_DAY = 86400;

	/**
	 * Adds the seconds the app counted to today's.
	 *
	 * @param int $user_id   Student.
	 * @param int $course_id Course.
	 * @param int $seconds   1 to 300.
	 * @param int $now       Now (a timestamp).
	 * @return void
	 */
	public static function add( $user_id, $course_id, $seconds, $now ) {
		global $wpdb;
		$seconds = max( 0, min( self::MAX_REPORT, (int) $seconds ) );
		if ( (int) $user_id <= 0 || 0 === $seconds ) {
			return;
		}
		$table = Installer::tables()['learning_time'];
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$wpdb->query( $wpdb->prepare( "INSERT INTO {$table} (user_id, day, course_id, seconds) VALUES (%d, %s, %d, %d) ON DUPLICATE KEY UPDATE seconds = LEAST(seconds + VALUES(seconds), %d)", (int) $user_id, self::day( $now ), max( 0, (int) $course_id ), $seconds, self::MAX_DAY ) );
	}

	/**
	 * This week's learning: the last seven days to today, oldest first, each day's minutes;
	 * the seven days' total against the seven before them, and the whole of it.
	 *
	 * @param int $user_id Student.
	 * @param int $now     Now (a timestamp).
	 * @return array
	 */
	public static function week( $user_id, $now ) {
		global $wpdb;
		$table = Installer::tables()['learning_time'];
		$from  = self::day( $now - 13 * DAY_IN_SECONDS );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT day, SUM(seconds) AS seconds FROM {$table} WHERE user_id = %d AND day >= %s GROUP BY day", (int) $user_id, $from ), ARRAY_A );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Plugin table.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COALESCE(SUM(seconds), 0) FROM {$table} WHERE user_id = %d", (int) $user_id ) );
		return self::shape( array_column( $rows, 'seconds', 'day' ), $total, $now );
	}

	/**
	 * The week from each day's seconds (`Y-m-d` => seconds). Pure.
	 *
	 * @param array $by_day Seconds by day.
	 * @param int   $total  All the seconds.
	 * @param int   $now    Now (a timestamp).
	 * @return array
	 */
	public static function shape( array $by_day, $total, $now ) {
		$days = array();
		$week = 0;
		$last = 0;
		for ( $i = 13; $i >= 0; $i-- ) {
			$day     = self::day( $now - $i * DAY_IN_SECONDS );
			$seconds = (int) ( $by_day[ $day ] ?? 0 );
			if ( $i < 7 ) {
				$week  += $seconds;
				$days[] = array(
					'date'    => $day,
					'minutes' => intdiv( $seconds, 60 ),
				);
			} else {
				$last += $seconds;
			}
		}
		return array(
			'days'              => $days,
			'week_minutes'      => intdiv( $week, 60 ),
			'last_week_minutes' => intdiv( $last, 60 ),
			'total_minutes'     => intdiv( (int) $total, 60 ),
		);
	}

	/**
	 * A timestamp's day in the site's time zone.
	 *
	 * @param int $timestamp Timestamp.
	 * @return string `Y-m-d`.
	 */
	private static function day( $timestamp ) {
		return wp_date( 'Y-m-d', (int) $timestamp );
	}
}
