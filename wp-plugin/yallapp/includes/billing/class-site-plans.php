<?php
/**
 * The website's membership plans the app may sell through the stores.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

/**
 * 100.4 Plans for the catalog (`POST /billing/catalog`) and the access a plan gives: Paid
 * Memberships Pro levels (`pmpro:<level>`), LearnDash groups (`ld_group:<group>`) and
 * WooCommerce Subscriptions products (`wcs:<product>`) that renew every month or year. Levels
 * hidden from sign-up, groups and products not published, and other cycles aren't sold in the
 * app.
 */
class Site_Plans {

	/**
	 * The LearnDash group post type.
	 */
	const LD_GROUP = 'groups';

	/**
	 * Every plan the website sells by the month or year, with the courses it opens.
	 *
	 * @param string $course_type The LMS's course post type ('' without an LMS).
	 * @return array[] Each id, title, price, period and course_ids.
	 */
	public static function all( $course_type ) {
		return array_merge( self::pmpro_plans( $course_type ), self::ld_group_plans(), self::wcs_plans( $course_type ) );
	}

	/**
	 * The plan IDs of the Paid Memberships Pro levels that open a course (its "Require
	 * membership"), from pmpro_has_membership_access()'s answer. Pure.
	 *
	 * @param mixed $result array( has access, level IDs, level names ), or a bool.
	 * @return string[]
	 */
	public static function pmpro_plan_ids( $result ) {
		if ( ! is_array( $result ) || empty( $result[1] ) ) {
			return array();
		}
		$ids = array();
		foreach ( (array) $result[1] as $level_id ) {
			if ( is_numeric( $level_id ) && (int) $level_id > 0 ) {
				$ids[] = 'pmpro:' . (int) $level_id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * The plans that open a course: the Paid Memberships Pro levels it requires.
	 *
	 * @param int $course_id Course.
	 * @return string[]
	 */
	public static function course_plan_ids( $course_id ) {
		if ( ! function_exists( 'pmpro_has_membership_access' ) ) {
			return array();
		}
		return self::pmpro_plan_ids( pmpro_has_membership_access( (int) $course_id, 0, true ) );
	}

	/**
	 * A plan's name on the website, or '' when it isn't there.
	 *
	 * @param string $plan_id Plan ID.
	 * @return string
	 */
	public static function title( $plan_id ) {
		$source = Store_Billing::plan_source( $plan_id );
		if ( ! $source ) {
			return '';
		}
		if ( 'pmpro' === $source['source'] ) {
			$level = function_exists( 'pmpro_getLevel' ) ? pmpro_getLevel( $source['id'] ) : null;
			return is_object( $level ) ? (string) $level->name : '';
		}
		$title = get_the_title( $source['id'] );
		return html_entity_decode( (string) $title, ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Paid Memberships Pro levels open to sign-up that renew every month or year.
	 *
	 * @param string $course_type Course post type.
	 * @return array[]
	 */
	private static function pmpro_plans( $course_type ) {
		if ( ! function_exists( 'pmpro_getAllLevels' ) ) {
			return array();
		}
		$plans = array();
		foreach ( (array) pmpro_getAllLevels( false, false ) as $level ) {
			if ( ! is_object( $level ) || empty( $level->id ) ) {
				continue;
			}
			$period = Store_Billing::period( $level->cycle_number ?? 0, $level->cycle_period ?? '' );
			$price  = Store_Billing::price_text( (string) ( $level->billing_amount ?? '' ) );
			if ( null === $period || null === $price ) {
				continue;
			}
			$plans[] = array(
				'id'         => 'pmpro:' . (int) $level->id,
				'title'      => (string) $level->name,
				'price'      => $price,
				'period'     => $period,
				'course_ids' => self::pmpro_courses( (int) $level->id, $course_type ),
			);
		}
		return $plans;
	}

	/**
	 * The courses that require a Paid Memberships Pro level.
	 *
	 * @param int    $level_id    Level.
	 * @param string $course_type Course post type.
	 * @return int[]
	 */
	private static function pmpro_courses( $level_id, $course_type ) {
		global $wpdb;
		if ( '' === $course_type || empty( $wpdb->pmpro_memberships_pages ) ) {
			return array();
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Paid Memberships Pro's table; read when the catalog is sent.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT mp.page_id FROM {$wpdb->pmpro_memberships_pages} mp INNER JOIN {$wpdb->posts} p ON p.ID = mp.page_id WHERE mp.membership_id = %d AND p.post_type = %s AND p.post_status = 'publish' LIMIT 1000", (int) $level_id, $course_type ) );
		return array_values( array_map( 'intval', (array) $ids ) );
	}

	/**
	 * LearnDash groups sold as a subscription every month or year.
	 *
	 * @return array[]
	 */
	private static function ld_group_plans() {
		if ( ! function_exists( 'learndash_get_setting' ) || ! function_exists( 'ld_update_group_access' ) ) {
			return array();
		}
		$plans = array();
		foreach (
			get_posts(
				array(
					'post_type'      => self::LD_GROUP,
					'post_status'    => 'publish',
					'posts_per_page' => 100,
					'orderby'        => 'ID',
					'order'          => 'ASC',
					'fields'         => 'ids',
				)
			) as $group_id
		) {
			if ( 'subscribe' !== (string) learndash_get_setting( (int) $group_id, 'group_price_type' ) ) {
				continue;
			}
			$period = Store_Billing::period( learndash_get_setting( (int) $group_id, 'group_price_billing_p3' ), learndash_get_setting( (int) $group_id, 'group_price_billing_t3' ) );
			$price  = Store_Billing::price_text( (string) preg_replace( '/[^0-9.]/', '', str_replace( ',', '.', (string) learndash_get_setting( (int) $group_id, 'group_price' ) ) ) );
			if ( null === $period || null === $price ) {
				continue;
			}
			$courses = function_exists( 'learndash_group_enrolled_courses' ) ? (array) learndash_group_enrolled_courses( (int) $group_id ) : array();
			$plans[] = array(
				'id'         => 'ld_group:' . (int) $group_id,
				'title'      => html_entity_decode( (string) get_the_title( (int) $group_id ), ENT_QUOTES, 'UTF-8' ),
				'price'      => $price,
				'period'     => $period,
				'course_ids' => array_values( array_map( 'intval', $courses ) ),
			);
		}
		return $plans;
	}

	/**
	 * WooCommerce Subscriptions products (simple subscriptions) that renew every month or year.
	 *
	 * @param string $course_type Course post type.
	 * @return array[]
	 */
	private static function wcs_plans( $course_type ) {
		if ( ! function_exists( 'wc_get_products' ) || ! class_exists( '\WC_Subscriptions_Product' ) || ! function_exists( 'wcs_create_subscription' ) ) {
			return array();
		}
		$plans = array();
		foreach (
			(array) wc_get_products(
				array(
					'type'    => array( 'subscription' ),
					'status'  => 'publish',
					'limit'   => 100,
					'orderby' => 'ID',
					'order'   => 'ASC',
				)
			) as $product
		) {
			if ( ! is_object( $product ) ) {
				continue;
			}
			$period = Store_Billing::period( \WC_Subscriptions_Product::get_interval( $product ), \WC_Subscriptions_Product::get_period( $product ) );
			$price  = Store_Billing::price_text( (string) \WC_Subscriptions_Product::get_price( $product ) );
			if ( null === $period || null === $price ) {
				continue;
			}
			$plans[] = array(
				'id'         => 'wcs:' . (int) $product->get_id(),
				'title'      => (string) $product->get_name(),
				'price'      => $price,
				'period'     => $period,
				'course_ids' => self::wcs_courses( (int) $product->get_id(), $course_type ),
			);
		}
		return $plans;
	}

	/**
	 * The courses a WooCommerce product opens, where the LMS says: Tutor LMS's and Sensei's
	 * course product, LearnDash for WooCommerce's related courses.
	 *
	 * @param int    $product_id  Product.
	 * @param string $course_type Course post type.
	 * @return int[]
	 */
	private static function wcs_courses( $product_id, $course_type ) {
		if ( '' === $course_type ) {
			return array();
		}
		$ids = array_map( 'intval', (array) get_post_meta( $product_id, '_related_course', true ) );
		foreach ( array( '_tutor_course_product_id', '_course_woocommerce_product' ) as $key ) {
			$ids = array_merge(
				$ids,
				get_posts(
					array(
						'post_type'      => $course_type,
						'post_status'    => 'publish',
						'posts_per_page' => 1000, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- Read when the catalog is sent only.
						'fields'         => 'ids',
						// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Read when the catalog is sent only.
						'meta_query'     => array(
							array(
								'key'   => $key,
								'value' => (string) $product_id,
							),
						),
					)
				)
			);
		}
		return array_values( array_unique( array_filter( array_map( 'intval', $ids ) ) ) );
	}
}
