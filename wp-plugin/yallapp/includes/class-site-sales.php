<?php
/**
 * The shop's totals of the last days (roadmap 86.4).
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce's paid orders and refunds per day, in the site's time zone,
 * sent with the license check (`SiteInfo.sales`, docs/api/platform.yaml) so
 * the dashboard's Analytics and the weekly summary show what the shop sold.
 * Totals only: never an order, a customer or a product.
 */
class Site_Sales {

	/** The days reported: the last week and today. */
	const DAYS = 8;

	/** Most orders and refunds read a check (a busy shop's week). */
	const MAX_READ = 2000;

	/** Paid, whatever happened since (the platform's own orders count the same). */
	const PAID_STATUSES = array( 'processing', 'completed', 'refunded', 'cancelled' );

	/**
	 * The report, or null without WooCommerce (or when it can't be read).
	 *
	 * @return array|null
	 */
	public static function report() {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return null;
		}
		try {
			$zone  = wp_timezone();
			$today = new \DateTimeImmutable( 'today', $zone );
			$start = $today->modify( '-' . ( self::DAYS - 1 ) . ' days' );
			$paid  = array();
			foreach ( (array) wc_get_orders(
				array(
					'type'      => 'shop_order',
					'status'    => self::PAID_STATUSES,
					'date_paid' => '>=' . $start->getTimestamp(),
					'limit'     => self::MAX_READ,
				)
			) as $order ) {
				$date = $order->get_date_paid();
				if ( $date ) {
					$paid[] = array(
						'at'       => $date->getTimestamp(),
						'currency' => (string) $order->get_currency(),
						'total'    => (float) $order->get_total(),
						'refunded' => (float) $order->get_total_refunded(),
					);
				}
			}
			$refunds = array();
			foreach ( (array) wc_get_orders(
				array(
					'type'         => 'shop_order_refund',
					'date_created' => '>=' . $start->getTimestamp(),
					'limit'        => self::MAX_READ,
				)
			) as $refund ) {
				$date = $refund->get_date_created();
				if ( $date ) {
					$refunds[] = array(
						'at'       => $date->getTimestamp(),
						'currency' => (string) $refund->get_currency(),
						'amount'   => abs( (float) $refund->get_amount() ),
					);
				}
			}
			return self::totals( $paid, $refunds, $today );
		} catch ( \Throwable $e ) {
			return null;
		}
	}

	/**
	 * The days from `$today` back, oldest first: each day's paid orders and what they
	 * brought in less what was refunded of them, and the refunds made that day. Amounts
	 * in the currency's smallest unit (kuruş, cents).
	 *
	 * @param array              $paid    Orders: at (Unix seconds), currency, total, refunded.
	 * @param array              $refunds Refunds: at, currency, amount.
	 * @param \DateTimeImmutable $today   Midnight today, in the site's time zone.
	 * @return array
	 */
	public static function totals( array $paid, array $refunds, \DateTimeImmutable $today ) {
		$days = array();
		for ( $i = self::DAYS - 1; $i >= 0; $i-- ) {
			$day          = $today->modify( '-' . $i . ' days' )->format( 'Y-m-d' );
			$days[ $day ] = array(
				'orders'   => 0,
				'revenue'  => array(),
				'refunds'  => 0,
				'refunded' => array(),
			);
		}
		$day_of = static function ( $at ) use ( $today ) {
			return ( new \DateTimeImmutable( '@' . (int) $at ) )->setTimezone( $today->getTimezone() )->format( 'Y-m-d' );
		};
		foreach ( $paid as $order ) {
			$day = $day_of( $order['at'] );
			if ( isset( $days[ $day ] ) && self::is_currency( $order['currency'] ) ) {
				++$days[ $day ]['orders'];
				self::add( $days[ $day ]['revenue'], $order['currency'], max( 0, $order['total'] - $order['refunded'] ) );
			}
		}
		foreach ( $refunds as $refund ) {
			$day = $day_of( $refund['at'] );
			if ( isset( $days[ $day ] ) && self::is_currency( $refund['currency'] ) ) {
				++$days[ $day ]['refunds'];
				self::add( $days[ $day ]['refunded'], $refund['currency'], $refund['amount'] );
			}
		}
		$out = array();
		foreach ( $days as $day => $totals ) {
			$out[] = array(
				'day'      => $day,
				'orders'   => $totals['orders'],
				'revenue'  => self::amounts( $totals['revenue'] ),
				'refunds'  => $totals['refunds'],
				'refunded' => self::amounts( $totals['refunded'] ),
			);
		}
		return $out;
	}

	/**
	 * Adds an amount to its currency's sum, in cents.
	 *
	 * @param array  $sums     Cents by currency.
	 * @param string $currency The currency.
	 * @param float  $amount   In the currency's main unit.
	 */
	private static function add( array &$sums, $currency, $amount ) {
		$sums[ $currency ] = ( isset( $sums[ $currency ] ) ? $sums[ $currency ] : 0 ) + (int) round( $amount * 100 );
	}

	/**
	 * Sums per currency as the contract lists them, at most 10.
	 *
	 * @param array $sums Cents by currency.
	 * @return array
	 */
	private static function amounts( array $sums ) {
		ksort( $sums );
		$out = array();
		foreach ( array_slice( $sums, 0, 10, true ) as $currency => $cents ) {
			$out[] = array(
				'currency' => $currency,
				'cents'    => $cents,
			);
		}
		return $out;
	}

	/**
	 * A three-letter currency code.
	 *
	 * @param mixed $code The order's currency.
	 * @return bool
	 */
	private static function is_currency( $code ) {
		return is_string( $code ) && 1 === preg_match( '/^[A-Z]{3}$/', $code );
	}
}
