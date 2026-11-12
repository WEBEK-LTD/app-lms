<?php
/**
 * 123 The time students spend learning: this week's, each day of it, against the week before.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Learning_Time;

if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}
if ( ! function_exists( 'wp_date' ) ) {
	/**
	 * A timestamp in the site's time zone (UTC in these tests).
	 *
	 * @param string $format    Format.
	 * @param int    $timestamp Timestamp.
	 * @return string
	 */
	function wp_date( $format, $timestamp ) {
		return gmdate( $format, $timestamp );
	}
}

class LearningTime123Test extends TestCase {

	public function test_the_last_seven_days_oldest_first_against_the_seven_before() {
		$now  = gmmktime( 15, 0, 0, 11, 11, 2026 );
		$week = Learning_Time::shape(
			array(
				'2026-11-11' => 1500,
				'2026-11-09' => 3600,
				'2026-11-05' => 600,
				'2026-11-04' => 1200,
				'2026-10-28' => 999,
			),
			20000,
			$now
		);
		$this->assertSame( array( '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11' ), array_column( $week['days'], 'date' ) );
		$this->assertSame( array( 10, 0, 0, 0, 60, 0, 25 ), array_column( $week['days'], 'minutes' ) );
		$this->assertSame( 95, $week['week_minutes'] );
		$this->assertSame( 20, $week['last_week_minutes'] );
		$this->assertSame( 333, $week['total_minutes'] );
	}

	public function test_nothing_learned_yet() {
		$week = Learning_Time::shape( array(), 0, gmmktime( 9, 0, 0, 11, 11, 2026 ) );
		$this->assertCount( 7, $week['days'] );
		$this->assertSame( 0, $week['week_minutes'] );
		$this->assertSame( 0, $week['total_minutes'] );
	}
}
