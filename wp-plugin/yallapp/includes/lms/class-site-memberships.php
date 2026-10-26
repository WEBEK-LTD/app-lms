<?php
/**
 * Memberships and subscriptions from the website.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 90.3 Access the website gives through memberships: Paid Memberships Pro levels (a course
 * set to "Require membership"), WooCommerce Subscriptions and LearnDash groups. The app
 * shows the student's (GET /me/subscriptions) and which plans open a course; a course that
 * needs a plan the student doesn't have can't be joined from the app, and a student with one
 * joins it in one tap. Sold and managed on the website only: never from the app.
 *
 * The shaping and the decisions are pure, for the unit tests; the rest reads the plugins.
 */
class Site_Memberships {

	/** WooCommerce Subscriptions statuses that still give access. */
	const LIVE_STATUSES = array( 'active', 'on-hold', 'pending-cancel' );

	/**
	 * Whether the website has any of the three.
	 *
	 * @return bool
	 */
	public static function available() {
		return function_exists( 'pmpro_has_membership_access' ) || function_exists( 'wcs_get_users_subscriptions' ) || function_exists( 'learndash_get_users_group_ids' );
	}

	/**
	 * The plans that open a course, and whether the user has one; null when it needs none.
	 *
	 * @param int $course_id Course.
	 * @param int $user_id   User, or 0.
	 * @return array{has_access: bool, plans: string[]}|null
	 */
	public static function course( $course_id, $user_id ) {
		if ( ! function_exists( 'pmpro_has_membership_access' ) ) {
			return null;
		}
		return self::from_pmpro_access( pmpro_has_membership_access( (int) $course_id, (int) $user_id, true ) );
	}

	/**
	 * Paid Memberships Pro's answer (with its levels) as `CourseDetail.membership`.
	 *
	 * @param mixed $result array( has access, level IDs, level names ), or a bool.
	 * @return array{has_access: bool, plans: string[]}|null
	 */
	public static function from_pmpro_access( $result ) {
		if ( ! is_array( $result ) || empty( $result[1] ) ) {
			return null;
		}
		$names = array_values( array_filter( array_map( 'strval', (array) ( $result[2] ?? array() ) ), 'strlen' ) );
		return array(
			'has_access' => ! empty( $result[0] ),
			'plans'      => array_values( array_unique( $names ) ),
		);
	}

	/**
	 * The course page's button with the course's membership: none without a plan, joining
	 * (as for a free course) with one.
	 *
	 * @param string     $action          The action without memberships.
	 * @param array|null $membership      `course()`.
	 * @param bool       $enrolled        Whether the student is enrolled.
	 * @param bool       $free_enrollment "Free courses: enroll in the app" setting.
	 * @return string
	 */
	public static function action( $action, $membership, $enrolled, $free_enrollment ) {
		if ( ! $membership || $enrolled ) {
			return $action;
		}
		if ( ! $membership['has_access'] ) {
			return 'none';
		}
		return $free_enrollment ? 'enroll_free' : 'none';
	}

	/**
	 * The student's memberships, subscriptions and groups, newest first within each source.
	 *
	 * @param int $user_id User.
	 * @return array[]
	 */
	public static function subscriptions( $user_id ) {
		$user_id = (int) $user_id;
		if ( $user_id <= 0 ) {
			return array();
		}
		$items = array();
		if ( function_exists( 'pmpro_getMembershipLevelsForUser' ) ) {
			foreach ( (array) pmpro_getMembershipLevelsForUser( $user_id ) as $level ) {
				if ( is_object( $level ) ) {
					$items[] = self::pmpro_item( $level, self::pmpro_next_payment( $user_id, $level ) );
				}
			}
		}
		if ( function_exists( 'wcs_get_users_subscriptions' ) ) {
			foreach ( (array) wcs_get_users_subscriptions( $user_id ) as $subscription ) {
				$item = is_object( $subscription ) ? self::wcs_item( self::wcs_data( $subscription ) ) : null;
				if ( $item ) {
					$items[] = $item;
				}
			}
		}
		if ( function_exists( 'learndash_get_users_group_ids' ) ) {
			foreach ( (array) learndash_get_users_group_ids( $user_id ) as $group_id ) {
				$courses = function_exists( 'learndash_group_enrolled_courses' ) ? (array) learndash_group_enrolled_courses( (int) $group_id ) : null;
				$items[] = self::group_item( (int) $group_id, (string) get_the_title( (int) $group_id ), null === $courses ? null : count( $courses ) );
			}
		}
		return $items;
	}

	/**
	 * A Paid Memberships Pro level of the user (as pmpro_getMembershipLevelsForUser gives it).
	 *
	 * @param object   $level        Level: id, name, startdate and enddate (Unix times, 0 or null for none).
	 * @param int|null $next_payment Next payment (Unix time), for a level that renews.
	 * @return array
	 */
	public static function pmpro_item( $level, $next_payment ) {
		return array(
			'id'           => 'pmpro-' . (int) ( $level->id ?? 0 ),
			'source'       => 'paid_memberships_pro',
			'name'         => (string) ( $level->name ?? '' ),
			'status'       => 'active',
			'started_at'   => self::from_unix( $level->startdate ?? null ),
			'ends_at'      => self::from_unix( $level->enddate ?? null ),
			'renews_at'    => self::from_unix( $next_payment ),
			'course_count' => null,
		);
	}

	/**
	 * A WooCommerce subscription, when it still gives access.
	 *
	 * @param array $data id, status (without "wc-"), names (its products), start, end and
	 *                    next_payment (GMT MySQL dates, 0 or '' for none).
	 * @return array|null
	 */
	public static function wcs_item( array $data ) {
		$status = (string) ( $data['status'] ?? '' );
		if ( ! in_array( $status, self::LIVE_STATUSES, true ) ) {
			return null;
		}
		$names = array_values( array_filter( array_map( 'strval', (array) ( $data['names'] ?? array() ) ), 'strlen' ) );
		return array(
			'id'           => 'wcs-' . (int) ( $data['id'] ?? 0 ),
			'source'       => 'woocommerce_subscriptions',
			'name'         => implode( ', ', array_unique( $names ) ),
			'status'       => str_replace( '-', '_', $status ),
			'started_at'   => self::from_gmt( $data['start'] ?? null ),
			'ends_at'      => self::from_gmt( $data['end'] ?? null ),
			// A cancelled subscription doesn't renew.
			'renews_at'    => 'pending-cancel' === $status ? null : self::from_gmt( $data['next_payment'] ?? null ),
			'course_count' => null,
		);
	}

	/**
	 * A LearnDash group the user is in.
	 *
	 * @param int      $group_id Group.
	 * @param string   $title    Its title.
	 * @param int|null $courses  Courses it opens, when known.
	 * @return array
	 */
	public static function group_item( $group_id, $title, $courses ) {
		return array(
			'id'           => 'ld-group-' . (int) $group_id,
			'source'       => 'learndash_group',
			'name'         => (string) $title,
			'status'       => 'active',
			'started_at'   => null,
			'ends_at'      => null,
			'renews_at'    => null,
			'course_count' => null === $courses ? null : (int) $courses,
		);
	}

	/**
	 * ISO 8601 UTC from a Unix time; null for none.
	 *
	 * @param mixed $time Unix time.
	 * @return string|null
	 */
	public static function from_unix( $time ) {
		return is_numeric( $time ) && (int) $time > 0 ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $time ) : null;
	}

	/**
	 * ISO 8601 UTC from a GMT MySQL date; null for none.
	 *
	 * @param mixed $gmt Date.
	 * @return string|null
	 */
	public static function from_gmt( $gmt ) {
		if ( ! is_string( $gmt ) || '' === $gmt || '0' === $gmt || '0000-00-00 00:00:00' === $gmt ) {
			return null;
		}
		$time = strtotime( $gmt . ' UTC' );
		return false === $time ? null : gmdate( 'Y-m-d\TH:i:s\Z', $time );
	}

	/**
	 * When a recurring Paid Memberships Pro level is paid next (PMPro 3's subscriptions, or
	 * pmpro_next_payment before them).
	 *
	 * @param int    $user_id User.
	 * @param object $level   Level.
	 * @return int|null
	 */
	private static function pmpro_next_payment( $user_id, $level ) {
		if ( class_exists( '\PMPro_Subscription' ) && method_exists( '\PMPro_Subscription', 'get_subscriptions_for_user' ) ) {
			foreach ( (array) \PMPro_Subscription::get_subscriptions_for_user( $user_id, (int) ( $level->id ?? 0 ) ) as $subscription ) {
				$next = is_object( $subscription ) && method_exists( $subscription, 'get_next_payment_date' ) ? $subscription->get_next_payment_date() : null;
				if ( is_numeric( $next ) && (int) $next > 0 ) {
					return (int) $next;
				}
			}
			return null;
		}
		if ( function_exists( 'pmpro_isLevelRecurring' ) && function_exists( 'pmpro_next_payment' ) && pmpro_isLevelRecurring( $level ) ) {
			$next = pmpro_next_payment( $user_id );
			return is_numeric( $next ) && (int) $next > 0 ? (int) $next : null;
		}
		return null;
	}

	/**
	 * What `wcs_item()` reads from a WC_Subscription.
	 *
	 * @param object $subscription WC_Subscription.
	 * @return array
	 */
	private static function wcs_data( $subscription ) {
		$names = array();
		foreach ( (array) $subscription->get_items() as $item ) {
			if ( is_object( $item ) && method_exists( $item, 'get_name' ) ) {
				$names[] = (string) $item->get_name();
			}
		}
		return array(
			'id'           => (int) $subscription->get_id(),
			'status'       => (string) $subscription->get_status(),
			'names'        => $names,
			'start'        => (string) $subscription->get_date( 'start' ),
			'end'          => (string) $subscription->get_date( 'end' ),
			'next_payment' => (string) $subscription->get_date( 'next_payment' ),
		);
	}
}
