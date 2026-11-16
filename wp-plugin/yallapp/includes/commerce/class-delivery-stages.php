<?php
/**
 * Delivery stages as WooCommerce order statuses.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * 132 Where a store order's delivery is, as WooCommerce statuses the shop
 * chooses on the order's page: Shipped, Delivery postponed, Delivery failed
 * and Returned to shop (Completed is delivered). The app follows them (the
 * order's `stage`, still `processing` for apps that don't know stages) and
 * the customer is told (Order_Updates). The shop's latest note to the
 * customer, written after the change, is the short reason the app shows.
 */
class Delivery_Stages {

	/**
	 * The statuses, without the wc- prefix, to the app's stage.
	 */
	const STAGES = array(
		'shipped'         => 'shipped',
		'postponed'       => 'postponed',
		'failed-delivery' => 'failed',
		'returned'        => 'returned',
	);

	/**
	 * A reason shown to the customer is kept short.
	 */
	const REASON_LENGTH = 140;

	/**
	 * 132 The order meta that flags a paid order cancelled after a failed delivery: it needs a refund.
	 */
	const REFUND_META = '_yallapp_refund_due';

	/**
	 * Hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_statuses' ) );
		add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'on_cancelled' ), 20, 3 );
		add_filter( 'wc_order_statuses', array( __CLASS__, 'order_statuses' ) );
		// Paid orders all of them: reports, downloads and stock count them as WooCommerce's own processing.
		add_filter( 'woocommerce_order_is_paid_statuses', array( __CLASS__, 'paid_statuses' ) );
		add_filter( 'woocommerce_reports_order_statuses', array( __CLASS__, 'paid_statuses' ) );
	}

	/**
	 * The statuses' names in the shop's language.
	 *
	 * @return array<string, string> Slug without the prefix => name.
	 */
	public static function names() {
		return array(
			'shipped'         => __( 'Shipped', 'yallapp' ),
			'postponed'       => __( 'Delivery postponed', 'yallapp' ),
			'failed-delivery' => __( 'Delivery failed', 'yallapp' ),
			'returned'        => __( 'Returned to shop', 'yallapp' ),
		);
	}

	/**
	 * Registers the statuses with WordPress (orders stored as posts and HPOS alike).
	 *
	 * @return void
	 */
	public function register_statuses() {
		foreach ( self::names() as $slug => $name ) {
			register_post_status(
				'wc-' . $slug,
				array(
					'label'                     => $name,
					'public'                    => false,
					'exclude_from_search'       => false,
					'show_in_admin_all_list'    => true,
					'show_in_admin_status_list' => true,
					/* translators: %s: number of orders. */
					'label_count'               => _n_noop( $name . ' <span class="count">(%s)</span>', $name . ' <span class="count">(%s)</span>', 'yallapp' ), // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralSingular, WordPress.WP.I18n.NonSingularStringLiteralPlural
				)
			);
		}
	}

	/**
	 * The order page's status list: the stages after Processing.
	 *
	 * @param array<string, string> $statuses WooCommerce's statuses.
	 * @return array<string, string>
	 */
	public static function order_statuses( $statuses ) {
		$out = array();
		foreach ( (array) $statuses as $key => $name ) {
			$out[ $key ] = $name;
			if ( 'wc-processing' === $key ) {
				foreach ( self::names() as $slug => $stage ) {
					$out[ 'wc-' . $slug ] = $stage;
				}
			}
		}
		foreach ( self::names() as $slug => $stage ) {
			if ( ! isset( $out[ 'wc-' . $slug ] ) ) {
				$out[ 'wc-' . $slug ] = $stage;
			}
		}
		return $out;
	}

	/**
	 * WooCommerce's paid statuses with the stages.
	 *
	 * @param string[] $statuses Statuses without the prefix.
	 * @return string[]
	 */
	public static function paid_statuses( $statuses ) {
		return array_values( array_unique( array_merge( (array) $statuses, array_keys( self::STAGES ) ) ) );
	}

	/**
	 * The app's stage for a WooCommerce status (with or without the wc- prefix), or null.
	 *
	 * @param string $status Status.
	 * @return string|null
	 */
	public static function stage_of( $status ) {
		$status = (string) preg_replace( '/^wc-/', '', (string) $status );
		return self::STAGES[ $status ] ?? null;
	}

	/**
	 * Whether a status (with or without the prefix) is one of the stages.
	 *
	 * @param string $status Status.
	 * @return bool
	 */
	public static function is_stage( $status ) {
		return null !== self::stage_of( $status );
	}

	/**
	 * A note to the customer as the stage's short reason: one line, cut at a word.
	 *
	 * @param string|null $note Note.
	 * @return string|null
	 */
	public static function reason( $note ) {
		$text = trim( (string) preg_replace( '/\s+/u', ' ', wp_strip_all_tags( (string) $note ) ) );
		if ( '' === $text ) {
			return null;
		}
		if ( function_exists( 'mb_strlen' ) && mb_strlen( $text ) > self::REASON_LENGTH ) {
			$cut  = mb_substr( $text, 0, self::REASON_LENGTH );
			$last = mb_strrpos( $cut, ' ' );
			$text = rtrim( false !== $last && $last > self::REASON_LENGTH / 2 ? mb_substr( $cut, 0, $last ) : $cut, ' ,.;:-' ) . '…';
		}
		return $text;
	}

	/**
	 * The order's `stage` in the app's Order shape, or null when its status isn't one.
	 *
	 * @param string      $status Status (without the prefix).
	 * @param string      $label  The status's name.
	 * @param int|null    $at     When it changed (Unix time), null: unknown.
	 * @param string|null $note   The shop's note to the customer after it changed.
	 * @return array|null
	 */
	public static function stage_json( $status, $label, $at, $note ) {
		$stage = self::stage_of( $status );
		if ( null === $stage ) {
			return null;
		}
		return array(
			'code'         => $stage,
			'label'        => (string) $label,
			'at'           => null !== $at ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $at ) : null,
			'reason'       => self::reason( $note ),
			'date'         => null,
			'slot'         => null,
			'next_step'    => null,
			'courier'      => null,
			'tracking_url' => null,
		);
	}

	/**
	 * A WooCommerce order's stage: its status, when it changed and the shop's note to the customer since.
	 *
	 * @param \WC_Order $order Order.
	 * @return array|null
	 */
	public static function of_order( $order ) {
		$status = (string) $order->get_status();
		if ( ! self::is_stage( $status ) ) {
			return null;
		}
		$changed = $order->get_date_modified();
		$at      = $changed ? (int) $changed->getTimestamp() : null;
		return self::stage_json( $status, (string) wc_get_order_status_name( $status ), $at, self::customer_note_since( $order, $at ) );
	}

	/**
	 * The newest note to the customer written since the status changed, or null.
	 *
	 * @param \WC_Order $order Order.
	 * @param int|null  $since Unix time.
	 * @return string|null
	 */
	private static function customer_note_since( $order, $since ) {
		if ( ! function_exists( 'wc_get_order_notes' ) ) {
			return null;
		}
		$notes = wc_get_order_notes(
			array(
				'order_id' => (int) $order->get_id(),
				'type'     => 'customer',
				'limit'    => 1,
				'orderby'  => 'date_created_gmt',
				'order'    => 'DESC',
			)
		);
		$note  = $notes ? $notes[0] : null;
		if ( ! $note || ! isset( $note->content ) ) {
			return null;
		}
		$written = isset( $note->date_created ) && $note->date_created ? (int) $note->date_created->getTimestamp() : 0;
		// A note from before the change was about something else; a minute's leeway for saving both at once.
		if ( null !== $since && $written < $since - 60 ) {
			return null;
		}
		return (string) $note->content;
	}

	/**
	 * 132 Whether a status change ends a failed delivery with the order cancelled (the owner's rule:
	 * the customer's money goes back).
	 *
	 * @param string $from Old status (with or without the prefix).
	 * @param string $to   New status (with or without the prefix).
	 * @return bool
	 */
	public static function refund_due_after( $from, $to ) {
		$from = (string) preg_replace( '/^wc-/', '', (string) $from );
		$to   = (string) preg_replace( '/^wc-/', '', (string) $to );
		return 'cancelled' === $to && in_array( $from, array( 'failed-delivery', 'returned' ), true );
	}

	/**
	 * 132 A paid order cancelled after a failed delivery: WooCommerce refunds it (its own Refund
	 * button), and the order says it needs one until it is refunded.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $from     Old status.
	 * @param string $to       New status.
	 * @return void
	 */
	public static function on_cancelled( $order_id, $from, $to ) {
		if ( ! self::refund_due_after( $from, $to ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order || ! $order->get_date_paid() || (float) $order->get_remaining_refund_amount() <= 0 ) {
			return;
		}
		$order->update_meta_data( self::REFUND_META, '1' );
		$order->save_meta_data();
		$order->add_order_note( __( 'Needs a refund: the delivery failed and the order was cancelled. Refund the customer with WooCommerce\'s Refund button on this order.', 'yallapp' ) );
	}

	/**
	 * What the customer reads when the order reaches a stage.
	 *
	 * @param string      $number Order number.
	 * @param string      $status Status without the prefix.
	 * @param string|null $note   The shop's note to the customer.
	 * @return array{title: string, body: string}|null
	 */
	public static function text( $number, $status, $note = null ) {
		$stage = self::stage_of( $status );
		if ( null === $stage ) {
			return null;
		}
		/* translators: %s: order number. */
		$title  = sprintf( __( 'Order #%s', 'yallapp' ), $number );
		$reason = self::reason( $note );
		switch ( $stage ) {
			case 'shipped':
				$body = __( 'Your order is on its way.', 'yallapp' ) . ' ' . __( 'Tap to follow it.', 'yallapp' );
				break;
			case 'postponed':
				$body = __( 'Your delivery was postponed.', 'yallapp' );
				break;
			case 'failed':
				$body = __( "We couldn't deliver your order.", 'yallapp' );
				break;
			default:
				$body = __( 'Your order is back at the shop.', 'yallapp' );
		}
		if ( null !== $reason && 'shipped' !== $stage ) {
			$body .= ' ' . $reason;
		}
		return array(
			'title' => $title,
			'body'  => $body,
		);
	}
}
