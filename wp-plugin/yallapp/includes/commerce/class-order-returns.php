<?php
/**
 * Returns asked for in the app.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

use Yallapp\Plugin;
use Yallapp\Push\Inbox;

/**
 * 91.3 A customer asks in the app to return a completed WooCommerce order, within the
 * shop's days (`store_return_days`, counted from when it was completed). The request is
 * kept on the order (`_yallapp_return`), noted on it and emailed to the shop; the shop
 * answers on the order's screen (approve or decline, with a reply), and the customer is
 * told (`order_update`). The refund stays WooCommerce's.
 */
class Order_Returns {

	/**
	 * The order meta that keeps the request.
	 */
	const META = '_yallapp_return';

	/**
	 * The reasons the app offers.
	 */
	const REASONS = array( 'damaged', 'wrong_item', 'not_as_described', 'no_longer_needed', 'other' );

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

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
		add_action( 'woocommerce_admin_order_data_after_shipping_address', array( $this, 'admin_box' ), 20 );
		add_action( 'woocommerce_process_shop_order_meta', array( $this, 'admin_save' ), 50 );
	}

	/**
	 * The shop's return days, 0 when it takes no returns from the app.
	 *
	 * @param mixed $setting The setting.
	 * @return int
	 */
	public static function days( $setting ) {
		$days = (int) $setting;
		return $days < 1 ? 0 : min( 365, $days );
	}

	/**
	 * Whether a return can be asked for now.
	 *
	 * @param string   $status       WooCommerce status, without wc-.
	 * @param bool     $physical     The order has something to send back.
	 * @param int|null $completed_at When it was completed (Unix time), or null.
	 * @param bool     $asked        A return was asked for already.
	 * @param int      $days         The shop's days.
	 * @param int      $now          Now (Unix time).
	 * @return bool
	 */
	public static function allowed( $status, $physical, $completed_at, $asked, $days, $now ) {
		if ( $days < 1 || 'completed' !== $status || ! $physical || $asked || ! $completed_at ) {
			return false;
		}
		return $now - $completed_at <= $days * DAY_IN_SECONDS;
	}

	/**
	 * The app's request: a reason, and a note (needed with "other").
	 *
	 * @param mixed $reason Reason.
	 * @param mixed $note   Note.
	 * @return array{reason: string, note: string|null}|\WP_Error
	 */
	public static function parse( $reason, $note ) {
		if ( ! is_string( $reason ) || ! in_array( $reason, self::REASONS, true ) ) {
			return new \WP_Error( 'invalid_request', __( 'Choose why you want to return it.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$text = is_string( $note ) ? trim( preg_replace( '/[ \t]+/', ' ', $note ) ) : '';
		if ( mb_strlen( $text ) > 500 ) {
			return new \WP_Error( 'invalid_request', __( 'Keep the note under 500 characters.', 'yallapp' ), array( 'status' => 400 ) );
		}
		if ( 'other' === $reason && '' === $text ) {
			return new \WP_Error( 'invalid_request', __( 'Tell the shop why you want to return it.', 'yallapp' ), array( 'status' => 400 ) );
		}
		return array(
			'reason' => $reason,
			'note'   => '' !== $text ? $text : null,
		);
	}

	/**
	 * The order's `return_request`, or null.
	 *
	 * @param \WC_Order $order Order.
	 * @return array|null
	 */
	public static function json( $order ) {
		$saved = $order->get_meta( self::META, true );
		if ( ! is_array( $saved ) || empty( $saved['status'] ) ) {
			return null;
		}
		return array(
			'status'       => (string) $saved['status'],
			'reason'       => (string) ( $saved['reason'] ?? 'other' ),
			'note'         => isset( $saved['note'] ) ? (string) $saved['note'] : null,
			'requested_at' => (string) ( $saved['requested_at'] ?? '' ),
			'decided_at'   => isset( $saved['decided_at'] ) ? (string) $saved['decided_at'] : null,
			'reply'        => isset( $saved['reply'] ) ? (string) $saved['reply'] : null,
		);
	}

	/**
	 * Whether the customer may ask to return the order now.
	 *
	 * @param \WC_Order $order Order.
	 * @param int       $days  The shop's days.
	 * @return bool
	 */
	public static function can_return( $order, $days ) {
		$physical = false;
		foreach ( $order->get_items() as $item ) {
			$product = $item instanceof \WC_Order_Item_Product ? $item->get_product() : null;
			if ( ! $product || ! $product->is_virtual() ) {
				$physical = true;
				break;
			}
		}
		$completed = $order->get_date_completed();
		return self::allowed( (string) $order->get_status(), $physical, $completed ? $completed->getTimestamp() : null, null !== self::json( $order ), $days, time() );
	}

	/**
	 * The customer asks to return one of their orders.
	 *
	 * @param \WC_Order $order Order (the customer's).
	 * @param mixed     $reason Reason.
	 * @param mixed     $note   Note.
	 * @return true|\WP_Error
	 */
	public function request( $order, $reason, $note ) {
		$days = self::days( $this->plugin->settings()->get( 'store_return_days' ) );
		if ( null !== self::json( $order ) ) {
			return new \WP_Error( 'conflict', __( 'You already asked to return this order.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( ! $days ) {
			return new \WP_Error( 'feature_disabled', __( "This shop doesn't take returns in the app. Contact the shop.", 'yallapp' ), array( 'status' => 403 ) );
		}
		$input = self::parse( $reason, $note );
		if ( is_wp_error( $input ) ) {
			return $input;
		}
		if ( ! self::can_return( $order, $days ) ) {
			return new \WP_Error( 'forbidden', __( "This order can't be returned from the app. Contact the shop.", 'yallapp' ), array( 'status' => 403 ) );
		}
		$order->update_meta_data(
			self::META,
			array(
				'status'       => 'requested',
				'reason'       => $input['reason'],
				'note'         => $input['note'],
				'requested_at' => gmdate( 'Y-m-d\TH:i:s\Z' ),
				'decided_at'   => null,
				'reply'        => null,
			)
		);
		$order->save_meta_data();
		$line = sprintf(
			/* translators: 1: reason, 2: the customer's note. */
			__( 'Return asked for in the app: %1$s. %2$s', 'yallapp' ),
			self::reason_label( $input['reason'] ),
			(string) $input['note']
		);
		$order->add_order_note( trim( $line ) );
		$to = get_option( 'admin_email' );
		if ( is_email( $to ) ) {
			wp_mail(
				$to,
				/* translators: %s: order number. */
				sprintf( __( 'Return asked for order #%s', 'yallapp' ), $order->get_order_number() ),
				trim( $line ) . "\n\n" . __( 'Approve or decline it on the order in WooCommerce › Orders; the customer is told in the app.', 'yallapp' ) . "\n" . admin_url( 'post.php?post=' . (int) $order->get_id() . '&action=edit' )
			);
		}
		return true;
	}

	/**
	 * The shop's answer: saved and told to the customer. False when there's nothing to answer.
	 *
	 * @param \WC_Order $order    Order.
	 * @param string    $decision approved or declined.
	 * @param string    $reply    The shop's reply.
	 * @return bool
	 */
	public function decide( $order, $decision, $reply ) {
		$saved = $order->get_meta( self::META, true );
		if ( ! is_array( $saved ) || 'requested' !== ( $saved['status'] ?? '' ) || ! in_array( $decision, array( 'approved', 'declined' ), true ) ) {
			return false;
		}
		$reply               = trim( preg_replace( '/\s+/', ' ', (string) $reply ) );
		$saved['status']     = $decision;
		$saved['decided_at'] = gmdate( 'Y-m-d\TH:i:s\Z' );
		$saved['reply']      = '' !== $reply ? mb_substr( $reply, 0, 500 ) : null;
		$order->update_meta_data( self::META, $saved );
		$order->save_meta_data();
		$user_id = (int) $order->get_customer_id();
		if ( $user_id ) {
			$text = self::decision_text( (string) $order->get_order_number(), $decision, (string) $saved['reply'] );
			$this->plugin->inbox()->add( 'order_update', Inbox::AUDIENCE_USER, $user_id, $text['title'], $text['body'], 0, 0, 0, 0, (int) $order->get_id() );
			$push = $this->plugin->push();
			if ( $push->is_configured() ) {
				$push->queue(
					array( $user_id ),
					'',
					$text,
					array(
						'type'     => 'order_update',
						'order_id' => (string) $order->get_id(),
					)
				);
			}
		}
		return true;
	}

	/**
	 * What the customer reads about the answer.
	 *
	 * @param string $number   Order number.
	 * @param string $decision approved or declined.
	 * @param string $reply    The shop's reply.
	 * @return array{title: string, body: string}
	 */
	public static function decision_text( $number, $decision, $reply ) {
		$body = 'approved' === $decision ? __( 'Your return was approved.', 'yallapp' ) : __( 'Your return was declined.', 'yallapp' );
		return array(
			/* translators: %s: order number. */
			'title' => sprintf( __( 'Order #%s', 'yallapp' ), $number ),
			'body'  => '' !== trim( $reply ) ? $body . ' ' . trim( $reply ) : $body,
		);
	}

	/**
	 * A reason in words.
	 *
	 * @param string $reason Reason.
	 * @return string
	 */
	public static function reason_label( $reason ) {
		$labels = array(
			'damaged'          => __( 'It arrived damaged', 'yallapp' ),
			'wrong_item'       => __( 'Wrong item', 'yallapp' ),
			'not_as_described' => __( 'Not as described', 'yallapp' ),
			'no_longer_needed' => __( 'No longer needed', 'yallapp' ),
			'other'            => __( 'Another reason', 'yallapp' ),
		);
		return $labels[ $reason ] ?? $labels['other'];
	}

	/**
	 * The request and the answer on the order's screen.
	 *
	 * @param \WC_Order $order Order.
	 * @return void
	 */
	public function admin_box( $order ) {
		$request = $order instanceof \WC_Order ? self::json( $order ) : null;
		if ( ! $request ) {
			return;
		}
		echo '<div class="yallapp-return"><h3>' . esc_html__( 'Return asked for in the app', 'yallapp' ) . '</h3>';
		echo '<p><strong>' . esc_html( self::reason_label( $request['reason'] ) ) . '</strong>';
		if ( $request['note'] ) {
			echo '<br>' . esc_html( $request['note'] );
		}
		echo '</p>';
		if ( 'requested' === $request['status'] ) {
			wp_nonce_field( 'yallapp_return', 'yallapp_return_nonce' );
			echo '<p><label for="yallapp_return_reply">' . esc_html__( 'Your reply to the customer (optional)', 'yallapp' ) . '</label><br>';
			echo '<textarea id="yallapp_return_reply" name="yallapp_return_reply" rows="2" maxlength="500" style="width:100%"></textarea></p>';
			echo '<p><label for="yallapp_return_decision">' . esc_html__( 'Answer', 'yallapp' ) . '</label> ';
			echo '<select id="yallapp_return_decision" name="yallapp_return_decision">';
			echo '<option value="">' . esc_html__( 'Not yet', 'yallapp' ) . '</option>';
			echo '<option value="approved">' . esc_html__( 'Approve the return', 'yallapp' ) . '</option>';
			echo '<option value="declined">' . esc_html__( 'Decline the return', 'yallapp' ) . '</option>';
			echo '</select></p><p class="description">' . esc_html__( 'Saved with the order; the customer is told in the app. Refund it with WooCommerce when you get it back.', 'yallapp' ) . '</p>';
		} else {
			$label = 'approved' === $request['status'] ? __( 'Approved', 'yallapp' ) : __( 'Declined', 'yallapp' );
			echo '<p>' . esc_html( $label );
			if ( $request['reply'] ) {
				echo ': ' . esc_html( $request['reply'] );
			}
			echo '</p>';
		}
		echo '</div>';
	}

	/**
	 * Saves the answer from the order's screen.
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	public function admin_save( $order_id ) {
		// WooCommerce registers edit_shop_orders for the roles that manage orders.
		if ( ! isset( $_POST['yallapp_return_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['yallapp_return_nonce'] ) ), 'yallapp_return' ) || ! current_user_can( 'edit_shop_orders' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown
			return;
		}
		$decision = isset( $_POST['yallapp_return_decision'] ) ? sanitize_key( wp_unslash( $_POST['yallapp_return_decision'] ) ) : '';
		if ( '' === $decision ) {
			return;
		}
		$reply = isset( $_POST['yallapp_return_reply'] ) ? sanitize_textarea_field( wp_unslash( $_POST['yallapp_return_reply'] ) ) : '';
		$order = wc_get_order( $order_id );
		if ( $order instanceof \WC_Order ) {
			$this->decide( $order, $decision, $reply );
		}
	}
}
