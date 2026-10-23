<?php
/**
 * Shared helpers for booking plugin adapters.
 *
 * @package Yallapp
 */

namespace Yallapp\Bookings;

defined( 'ABSPATH' ) || exit;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

/**
 * Shapes prices, people and appointments the same way for every booking plugin.
 *
 * Appointment rows from adapters carry local times; Bookings_Controller turns them
 * into the contract's Appointment.
 */
abstract class Base_Adapter implements Booking_Adapter {

	/**
	 * 83.4 This adapter's version: the third number for a fix, the second for something new it sends
	 * the app, the first when the app must change too (docs/CONNECTORS.md).
	 */
	const ADAPTER_VERSION = '1.0.0';

	/**
	 * The business's time zone (the site's).
	 *
	 * @return DateTimeZone
	 */
	public static function timezone() {
		return wp_timezone();
	}

	/**
	 * A local "Y-m-d H:i" (or "Y-m-d H:i:s") time in the business's time zone, or null.
	 *
	 * @param string $local Local time.
	 * @return DateTimeImmutable|null
	 */
	public static function local( $local ) {
		try {
			$time = new DateTimeImmutable( (string) $local, self::timezone() );
		} catch ( Exception $e ) {
			return null;
		}
		return $time;
	}

	/**
	 * A UTC "Y-m-d H:i:s" database time as local "Y-m-d H:i".
	 *
	 * @param string $utc UTC time.
	 * @return string
	 */
	public static function utc_to_local( $utc ) {
		try {
			$time = new DateTimeImmutable( (string) $utc, new DateTimeZone( 'UTC' ) );
		} catch ( Exception $e ) {
			return '';
		}
		return $time->setTimezone( self::timezone() )->format( 'Y-m-d H:i' );
	}

	/**
	 * A local "Y-m-d H:i" time as UTC "Y-m-d H:i:s".
	 *
	 * @param string $local Local time.
	 * @return string
	 */
	public static function local_to_utc( $local ) {
		$time = self::local( $local );
		return $time ? $time->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' ) : '';
	}

	/**
	 * A BookingPrice.
	 *
	 * @param float  $amount    Amount.
	 * @param string $currency  ISO currency.
	 * @param string $formatted As the plugin shows it.
	 * @return array
	 */
	public static function price( $amount, $currency, $formatted ) {
		$amount = (float) $amount;
		return array(
			'amount'    => number_format( $amount, 2, '.', '' ),
			'currency'  => (string) $currency,
			'formatted' => html_entity_decode( wp_strip_all_tags( (string) $formatted ), ENT_QUOTES, 'UTF-8' ),
			'free'      => $amount <= 0.0,
		);
	}

	/**
	 * An amount with a currency symbol, for plugins without their own formatter.
	 *
	 * @param float  $amount   Amount.
	 * @param string $symbol   Currency symbol.
	 * @param string $position before or after.
	 * @param int    $decimals Decimals.
	 * @return string
	 */
	public static function money( $amount, $symbol, $position = 'before', $decimals = 2 ) {
		$number = number_format_i18n( (float) $amount, max( 0, (int) $decimals ) );
		return 'after' === $position ? $number . $symbol : $symbol . $number;
	}

	/**
	 * A StaffMember.
	 *
	 * @param int         $id    ID.
	 * @param string      $name  Name.
	 * @param string|null $image Image URL.
	 * @param string|null $title Short description.
	 * @param array|null  $price Their own price for a service.
	 * @return array
	 */
	public static function person( $id, $name, $image = null, $title = null, $price = null ) {
		return array(
			'id'        => (int) $id,
			'name'      => trim( (string) $name ),
			'image_url' => $image ? (string) $image : null,
			'title'     => '' !== trim( (string) $title ) ? wp_strip_all_tags( (string) $title ) : null,
			'price'     => $price,
		);
	}

	/**
	 * The WordPress user's name split for plugins that store first and last names.
	 *
	 * @param \WP_User $user User.
	 * @return array{0: string, 1: string}
	 */
	public static function names( $user ) {
		$first = trim( (string) $user->first_name );
		$last  = trim( (string) $user->last_name );
		if ( '' === $first ) {
			$parts = preg_split( '/\s+/', trim( (string) $user->display_name ), 2 );
			$first = isset( $parts[0] ) ? $parts[0] : '';
			$last  = isset( $parts[1] ) ? $parts[1] : $last;
		}
		return array( '' !== $first ? $first : 'Customer', $last );
	}

	/**
	 * The phone number the app signed the user in with.
	 *
	 * @param int $user_id User.
	 * @return string
	 */
	public static function phone( $user_id ) {
		foreach ( array( \Yallapp\Otp\Digits_Adapter::META_FULL, 'billing_phone' ) as $key ) {
			$phone = (string) get_user_meta( $user_id, $key, true );
			if ( '' !== $phone ) {
				return $phone;
			}
		}
		return '';
	}
}
