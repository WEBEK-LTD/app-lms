<?php
/**
 * WooCommerce orders in the app's Order shape.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * Lists a customer's WooCommerce orders, for LMS adapters whose courses are sold with WooCommerce.
 */
class Woo_Orders {

	/**
	 * WooCommerce statuses (without the wc- prefix) to the API's.
	 */
	const STATUSES = array(
		'pending'        => 'pending',
		'checkout-draft' => 'pending',
		'processing'     => 'processing',
		'on-hold'        => 'on_hold',
		'completed'      => 'completed',
		'cancelled'      => 'cancelled',
		'refunded'       => 'refunded',
		'failed'         => 'failed',
	);

	/**
	 * Whether WooCommerce is active.
	 *
	 * @return bool
	 */
	public static function available() {
		return function_exists( 'wc_get_orders' );
	}

	/**
	 * A customer's orders, newest first.
	 *
	 * @param int      $user_id        Customer.
	 * @param int      $page           Page.
	 * @param int      $per_page       Page size.
	 * @param callable $course_of_item Returns the course ID a product gives access to, or 0.
	 * @return array{items: array[], total: int} Order shapes.
	 */
	public static function for_user( $user_id, $page, $per_page, callable $course_of_item ) {
		if ( ! self::available() || ! $user_id ) {
			return array(
				'items' => array(),
				'total' => 0,
			);
		}
		$result = wc_get_orders(
			array(
				'customer_id' => (int) $user_id,
				'type'        => 'shop_order',
				'paginate'    => true,
				'limit'       => (int) $per_page,
				'page'        => (int) $page,
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);
		$items  = array();
		foreach ( (array) $result->orders as $order ) {
			$items[] = self::shape( $order, $course_of_item );
		}
		return array(
			'items' => $items,
			'total' => (int) $result->total,
		);
	}

	/**
	 * Order shape.
	 *
	 * @param \WC_Order $order          Order.
	 * @param callable  $course_of_item Course for a product ID.
	 * @return array
	 */
	private static function shape( $order, callable $course_of_item ) {
		$status  = (string) $order->get_status();
		$created = $order->get_date_created();
		$lines   = array();
		foreach ( $order->get_items() as $item ) {
			$product_id = $item instanceof \WC_Order_Item_Product ? (int) $item->get_product_id() : 0;
			$course     = $product_id ? (int) call_user_func( $course_of_item, $product_id ) : 0;
			$product    = $item instanceof \WC_Order_Item_Product ? $item->get_product() : null;
			$image_id   = $product ? (int) $product->get_image_id() : 0;
			if ( ! $image_id && $product && $product->get_parent_id() ) {
				$image_id = (int) get_post_thumbnail_id( $product->get_parent_id() );
			}
			$image   = $image_id ? wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : false;
			$lines[] = array(
				'name'       => (string) $item->get_name(),
				'course_id'  => $course ? $course : null,
				'product_id' => $product_id ? $product_id : null,
				'quantity'   => max( 1, (int) $item->get_quantity() ),
				'image_url'  => $image ? $image : null,
			);
		}
		return array(
			'id'           => (int) $order->get_id(),
			'number'       => (string) $order->get_order_number(),
			'status'       => self::STATUSES[ $status ] ?? 'pending',
			'status_label' => (string) wc_get_order_status_name( $status ),
			'total'        => Money::plain( wc_price( (float) $order->get_total(), array( 'currency' => $order->get_currency() ) ) ),
			'created_at'   => $created ? gmdate( 'Y-m-d\TH:i:s\Z', $created->getTimestamp() ) : gmdate( 'Y-m-d\TH:i:s\Z' ),
			'items'        => $lines,
		);
	}
}
