<?php
/**
 * Courses sold as WooCommerce products.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * 123 What an LMS adapter tells the course cart (`POST /courses/cart`) when the site sells its
 * courses with WooCommerce: several of them then go in one checkout. Separate from Lms_Adapter
 * so adapters other plugins add keep working; without it the app buys course by course.
 */
interface Woo_Course_Products {

	/**
	 * Whether the courses are sold with WooCommerce on this site now.
	 *
	 * @return bool
	 */
	public function sells_with_woocommerce();

	/**
	 * The WooCommerce product that sells a course; 0 when none does.
	 *
	 * @param int $course_id Course ID.
	 * @return int
	 */
	public function course_product_id( $course_id );
}
