<?php
/**
 * An order's shipment, from the tracking plugins' meta.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * 91.2 The `shipment` of a WooCommerce order (Order.shipment), from the tracking that
 * WooCommerce Shipment Tracking or Advanced Shipment Tracking keeps on it
 * (`_wc_shipment_tracking_items`): the latest item's carrier, number and link.
 *
 * Pure but for `of_order()`, which reads the order's meta and the plugins' links.
 */
class Order_Tracking {

	/**
	 * The meta both tracking plugins keep their items in.
	 */
	const META = '_wc_shipment_tracking_items';

	/**
	 * The shipment of an order, or null before it is shipped.
	 *
	 * @param \WC_Order $order Order.
	 * @return array|null
	 */
	public static function of_order( $order ) {
		$items = $order->get_meta( self::META, true );
		if ( ! is_array( $items ) || ! $items ) {
			return null;
		}
		$formatter = null;
		// The plugin's own link for its known carriers ("USPS", "Aras Kargo"...).
		if ( class_exists( '\WC_Shipment_Tracking_Actions' ) && method_exists( '\WC_Shipment_Tracking_Actions', 'get_instance' ) ) {
			$actions = \WC_Shipment_Tracking_Actions::get_instance();
			if ( method_exists( $actions, 'get_formatted_tracking_item' ) ) {
				$order_id  = (int) $order->get_id();
				$formatter = static function ( $item ) use ( $actions, $order_id ) {
					return (array) $actions->get_formatted_tracking_item( $order_id, $item );
				};
			}
		}
		return self::shipment( $items, $formatter );
	}

	/**
	 * The shipment from the tracking items: the latest one with a number or a link.
	 *
	 * @param array         $items     The tracking plugin's items.
	 * @param callable|null $formatter Adds `formatted_tracking_provider` and `formatted_tracking_link` to an item.
	 * @return array|null
	 */
	public static function shipment( array $items, $formatter = null ) {
		$latest = null;
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			if ( '' === trim( (string) ( $item['tracking_number'] ?? '' ) ) && '' === trim( (string) ( $item['custom_tracking_link'] ?? '' ) ) ) {
				continue;
			}
			if ( null === $latest || (int) ( $item['date_shipped'] ?? 0 ) >= (int) ( $latest['date_shipped'] ?? 0 ) ) {
				$latest = $item;
			}
		}
		if ( null === $latest ) {
			return null;
		}
		if ( is_callable( $formatter ) ) {
			$latest = array_merge( $latest, (array) call_user_func( $formatter, $latest ) );
		}
		$carrier = trim( (string) ( $latest['custom_tracking_provider'] ?? '' ) );
		if ( '' === $carrier ) {
			$carrier = trim( (string) ( $latest['formatted_tracking_provider'] ?? '' ) );
		}
		if ( '' === $carrier && '' !== trim( (string) ( $latest['tracking_provider'] ?? '' ) ) ) {
			$carrier = ucwords( str_replace( array( '-', '_' ), ' ', trim( (string) $latest['tracking_provider'] ) ) );
		}
		$link = trim( (string) ( $latest['custom_tracking_link'] ?? '' ) );
		if ( '' === $link ) {
			$link = trim( (string) ( $latest['formatted_tracking_link'] ?? '' ) );
		}
		$number  = trim( (string) ( $latest['tracking_number'] ?? '' ) );
		$shipped = (int) ( $latest['date_shipped'] ?? 0 );
		return array(
			'carrier'         => '' !== $carrier ? mb_substr( $carrier, 0, 100 ) : null,
			'tracking_number' => '' !== $number ? mb_substr( $number, 0, 100 ) : null,
			'tracking_url'    => self::web_link( $link ),
			'waybill'         => null,
			'shipped_at'      => gmdate( 'Y-m-d\TH:i:s\Z', $shipped > 0 ? $shipped : time() ),
		);
	}

	/**
	 * What tells one shipment from another: a new number, carrier or link is a new push.
	 *
	 * @param array|null $shipment Shipment.
	 * @return string Empty without one.
	 */
	public static function fingerprint( $shipment ) {
		if ( ! is_array( $shipment ) ) {
			return '';
		}
		return md5( (string) wp_json_encode( array( $shipment['carrier'], $shipment['tracking_number'], $shipment['tracking_url'] ) ) );
	}

	/**
	 * An http or https address, or null.
	 *
	 * @param string $link Link.
	 * @return string|null
	 */
	private static function web_link( $link ) {
		return preg_match( '#^https?://[^\s]+$#i', $link ) ? mb_substr( $link, 0, 500 ) : null;
	}
}
