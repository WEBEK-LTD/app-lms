<?php
/**
 * Order updates as notifications.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

use Yallapp\Plugin;
use Yallapp\Push\Inbox;

/**
 * 91.2 Tells a customer about their WooCommerce order in the app: when its tracking is added
 * (WooCommerce Shipment Tracking or Advanced Shipment Tracking), and when it is completed,
 * cancelled or refunded. An `order_update` in their inbox and a push that opens the order,
 * unless their phone turned order updates off. Each shipment is told once.
 */
class Order_Updates {

	/**
	 * The order meta that remembers the shipment last told.
	 */
	const TOLD_META = '_yallapp_shipment_told';

	/**
	 * Statuses that are told, without the wc- prefix.
	 */
	const TOLD_STATUSES = array( 'completed', 'cancelled', 'refunded' );

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Orders being checked now (saving the told meta saves the order again).
	 *
	 * @var array<int, bool>
	 */
	private $checking = array();

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'woocommerce_order_status_changed', array( $this, 'on_status' ), 10, 3 );
		// The tracking plugins save their items on the order (HPOS and posts alike) or as post meta.
		add_action( 'woocommerce_update_order', array( $this, 'on_saved' ), 20, 1 );
		add_action( 'added_post_meta', array( $this, 'on_meta' ), 20, 3 );
		add_action( 'updated_post_meta', array( $this, 'on_meta' ), 20, 3 );
	}

	/**
	 * An order's status changed.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $from     Old status.
	 * @param string $to       New status.
	 * @return void
	 */
	public function on_status( $order_id, $from, $to ) {
		$to = (string) preg_replace( '/^wc-/', '', (string) $to );
		if ( ! in_array( $to, self::TOLD_STATUSES, true ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order || ! (int) $order->get_customer_id() ) {
			return;
		}
		$number = (string) $order->get_order_number();
		if ( 'completed' === $to ) {
			// A completed order with tracking not told yet says both at once.
			$shipment = Order_Tracking::of_order( $order );
			if ( $shipment && Order_Tracking::fingerprint( $shipment ) !== (string) $order->get_meta( self::TOLD_META, true ) ) {
				$this->remember( $order, $shipment );
				$this->tell( $order, self::shipped_text( $number, $shipment ) );
				return;
			}
		}
		$this->tell( $order, self::status_text( $number, $to ) );
	}

	/**
	 * An order was saved: tells a new shipment.
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	public function on_saved( $order_id ) {
		$this->check_shipment( (int) $order_id );
	}

	/**
	 * Post meta was saved: the tracking items of an order stored as a post.
	 *
	 * @param int    $meta_id   Meta ID.
	 * @param int    $object_id Post ID.
	 * @param string $meta_key  Key.
	 * @return void
	 */
	public function on_meta( $meta_id, $object_id, $meta_key ) {
		if ( Order_Tracking::META === $meta_key ) {
			$this->check_shipment( (int) $object_id );
		}
	}

	/**
	 * Tells the order's shipment when it is new.
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	private function check_shipment( $order_id ) {
		if ( ! $order_id || isset( $this->checking[ $order_id ] ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$this->checking[ $order_id ] = true;
		try {
			$order = wc_get_order( $order_id );
			if ( ! $order || ! (int) $order->get_customer_id() ) {
				return;
			}
			$shipment = Order_Tracking::of_order( $order );
			if ( ! $shipment ) {
				return;
			}
			$told  = (string) $order->get_meta( self::TOLD_META, true );
			$again = '' !== $told;
			if ( Order_Tracking::fingerprint( $shipment ) === $told ) {
				return;
			}
			$this->remember( $order, $shipment );
			$this->tell( $order, self::shipped_text( (string) $order->get_order_number(), $shipment, $again ) );
		} finally {
			unset( $this->checking[ $order_id ] );
		}
	}

	/**
	 * Remembers the shipment told.
	 *
	 * @param \WC_Order $order    Order.
	 * @param array     $shipment Shipment.
	 * @return void
	 */
	private function remember( $order, array $shipment ) {
		$order->update_meta_data( self::TOLD_META, Order_Tracking::fingerprint( $shipment ) );
		$order->save_meta_data();
	}

	/**
	 * The inbox entry and the push.
	 *
	 * @param \WC_Order                          $order Order.
	 * @param array{title: string, body: string} $text  Notification.
	 * @return void
	 */
	private function tell( $order, array $text ) {
		$user_id  = (int) $order->get_customer_id();
		$order_id = (int) $order->get_id();
		$this->plugin->inbox()->add( 'order_update', Inbox::AUDIENCE_USER, $user_id, $text['title'], $text['body'], 0, 0, 0, 0, $order_id );
		$push = $this->plugin->push();
		if ( $push->is_configured() ) {
			$push->queue(
				array( $user_id ),
				'orders',
				$text,
				array(
					'type'     => 'order_update',
					'order_id' => (string) $order_id,
				)
			);
		}
	}

	/**
	 * What the customer reads about a shipment.
	 *
	 * @param string $number   Order number.
	 * @param array  $shipment Shipment.
	 * @param bool   $again    The tracking changed after it was told.
	 * @return array{title: string, body: string}
	 */
	public static function shipped_text( $number, array $shipment, $again = false ) {
		/* translators: %s: order number. */
		$title = sprintf( __( 'Order #%s', 'yallapp' ), $number );
		$parts = array_filter( array( $shipment['carrier'] ?? null, $shipment['tracking_number'] ?? null ) );
		$track = $parts ? implode( ' ', $parts ) : '';
		if ( $again ) {
			$body = '' !== $track
				/* translators: %s: carrier and tracking number. */
				? sprintf( __( 'New tracking details: %s.', 'yallapp' ), $track )
				: __( 'Your order has new tracking details.', 'yallapp' );
		} else {
			$body = '' !== $track
				/* translators: %s: carrier and tracking number. */
				? sprintf( __( 'Your order is on its way: %s.', 'yallapp' ), $track )
				: __( 'Your order is on its way.', 'yallapp' );
		}
		return array(
			'title' => $title,
			'body'  => $body . ' ' . __( 'Tap to follow it.', 'yallapp' ),
		);
	}

	/**
	 * What the customer reads about a status.
	 *
	 * @param string $number Order number.
	 * @param string $status completed, cancelled or refunded.
	 * @return array{title: string, body: string}
	 */
	public static function status_text( $number, $status ) {
		/* translators: %s: order number. */
		$title = sprintf( __( 'Order #%s', 'yallapp' ), $number );
		switch ( $status ) {
			case 'cancelled':
				$body = __( 'Your order was cancelled.', 'yallapp' );
				break;
			case 'refunded':
				$body = __( 'Your order was refunded.', 'yallapp' );
				break;
			default:
				$body = __( 'Your order is complete. Thank you!', 'yallapp' );
		}
		return array(
			'title' => $title,
			'body'  => $body,
		);
	}
}
