<?php
/**
 * 131 Same-day and next-day delivery, gifts and the gift checkout, and flash sales: the rules.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

/**
 * The flower shop's rules for a WooCommerce store, without WordPress: the delivery
 * day (today until the cut-off, in the site's time zone), the slots (each with an
 * optional capacity and fee), the gift details (the card, the recipient, "send
 * anonymously") and the gift checkout's sender and recipient, checked strictly as the
 * hosted API checks them; and a flash sale's price and `sale` (ProductSale).
 */
class Delivery_Rules {

	const MAX_MESSAGE = 500;
	const MAX_NAME    = 80;
	const MAX_ADDRESS = 300;
	const MAX_EMAIL   = 120;
	const MAX_SLOTS   = 8;

	/**
	 * The slots written in the settings, one a line: `10:00-13:00 | 20 | 25` (from-to, then
	 * optionally how many orders it takes and its extra fee).
	 *
	 * @param string $text Settings text.
	 * @return array<int, array{id: string, start: string, end: string, capacity: int|null, fee: float|null}>
	 */
	public static function parse_slots( $text ) {
		$slots = array();
		$n     = 0;
		foreach ( preg_split( '/[\r\n;]+/', (string) $text ) as $line ) {
			$parts = array_map( 'trim', explode( '|', (string) $line ) );
			if ( ! preg_match( '/^([01][0-9]|2[0-3]):([0-5][0-9])\s*[-–]\s*([01][0-9]|2[0-3]):([0-5][0-9])$/u', $parts[0], $m ) ) {
				continue;
			}
			$start = $m[1] . ':' . $m[2];
			$end   = $m[3] . ':' . $m[4];
			if ( self::minutes( $end ) <= self::minutes( $start ) ) {
				continue;
			}
			$capacity = isset( $parts[1] ) && preg_match( '/^\d{1,5}$/', $parts[1] ) && (int) $parts[1] > 0 ? (int) $parts[1] : null;
			$fee      = isset( $parts[2] ) && is_numeric( str_replace( ',', '.', $parts[2] ) ) && (float) str_replace( ',', '.', $parts[2] ) > 0 ? round( (float) str_replace( ',', '.', $parts[2] ), 2 ) : null;
			++$n;
			$slots[] = array(
				'id'       => 's' . $n,
				'start'    => $start,
				'end'      => $end,
				'capacity' => $capacity,
				'fee'      => $fee,
			);
			if ( count( $slots ) >= self::MAX_SLOTS ) {
				break;
			}
		}
		return $slots;
	}

	/**
	 * Minutes past midnight of HH:MM.
	 *
	 * @param string $time Time.
	 * @return int
	 */
	public static function minutes( $time ) {
		$parts = explode( ':', (string) $time );
		return (int) $parts[0] * 60 + (int) ( $parts[1] ?? 0 );
	}

	/**
	 * Whether the shop delivers on a day.
	 *
	 * @param array              $rules min_days, max_days, closed_weekdays, same_day_cutoff.
	 * @param string             $date  Y-m-d, the site's time zone.
	 * @param \DateTimeImmutable $now   Now, in the site's time zone.
	 * @return string|null Null when it does; else why not: invalid, too_soon, too_far, closed, cutoff.
	 */
	public static function day_problem( array $rules, $date, \DateTimeImmutable $now ) {
		$day = \DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $date, $now->getTimezone() );
		if ( ! $day || $day->format( 'Y-m-d' ) !== $date ) {
			return 'invalid';
		}
		$today = $now->setTime( 0, 0 );
		$days  = (int) $today->diff( $day )->format( '%r%a' );
		if ( $days < (int) $rules['min_days'] ) {
			return 'too_soon';
		}
		if ( $days > (int) $rules['max_days'] ) {
			return 'too_far';
		}
		if ( in_array( (int) $day->format( 'w' ), array_map( 'intval', (array) $rules['closed_weekdays'] ), true ) ) {
			return 'closed';
		}
		$cutoff = isset( $rules['same_day_cutoff'] ) ? (string) $rules['same_day_cutoff'] : '';
		if ( 0 === $days && '' !== $cutoff && self::minutes( $now->format( 'H:i' ) ) >= self::minutes( $cutoff ) ) {
			return 'cutoff';
		}
		return null;
	}

	/**
	 * Whether today's slot has started.
	 *
	 * @param array              $slot Slot.
	 * @param string             $date Y-m-d.
	 * @param \DateTimeImmutable $now  Now, in the site's time zone.
	 * @return bool
	 */
	public static function slot_started( array $slot, $date, \DateTimeImmutable $now ) {
		return $now->format( 'Y-m-d' ) === $date && self::minutes( $now->format( 'H:i' ) ) >= self::minutes( $slot['start'] );
	}

	/**
	 * The customer's message for a day that isn't open.
	 *
	 * @param string $problem Why.
	 * @return string
	 */
	public static function day_message( $problem ) {
		switch ( $problem ) {
			case 'closed':
				return __( 'The shop doesn\'t deliver on that day. Please choose another day.', 'yallapp' );
			case 'cutoff':
				return __( 'Orders for today have closed. Please choose another day.', 'yallapp' );
			case 'too_soon':
				return __( 'That day is too soon. Please choose a later day.', 'yallapp' );
			case 'too_far':
				return __( 'That day is too far ahead. Please choose an earlier day.', 'yallapp' );
			default:
				return __( 'Choose a valid delivery date.', 'yallapp' );
		}
	}

	/**
	 * The delivery day and slot, checked.
	 *
	 * @param array              $rules  StoreConfig.delivery_date, its slots with `fee` as numbers.
	 * @param string             $date   delivery_date, or ''.
	 * @param string             $slot   delivery_slot, or ''.
	 * @param \DateTimeImmutable $now    Now, in the site's time zone.
	 * @param callable           $counts fn( string $date ): array<string, int> Orders by slot.
	 * @return array {date, slot, fee}, or {error, code, status}.
	 */
	public static function check_day( array $rules, $date, $slot, \DateTimeImmutable $now, $counts ) {
		$date = trim( (string) $date );
		$slot = trim( (string) $slot );
		if ( empty( $rules['enabled'] ) ) {
			return array(
				'date' => null,
				'slot' => null,
				'fee'  => 0.0,
			);
		}
		if ( '' === $date ) {
			if ( ! empty( $rules['required'] ) ) {
				return self::problem( __( 'Choose a delivery date.', 'yallapp' ) );
			}
			return array(
				'date' => null,
				'slot' => null,
				'fee'  => 0.0,
			);
		}
		$why = self::day_problem( $rules, $date, $now );
		if ( null !== $why ) {
			return self::problem( self::day_message( $why ) );
		}
		$slots = isset( $rules['slots'] ) ? (array) $rules['slots'] : array();
		if ( ! $slots ) {
			return array(
				'date' => $date,
				'slot' => null,
				'fee'  => 0.0,
			);
		}
		if ( '' === $slot ) {
			return self::problem( __( 'Choose a delivery time.', 'yallapp' ) );
		}
		$chosen = null;
		foreach ( $slots as $candidate ) {
			if ( $candidate['id'] === $slot ) {
				$chosen = $candidate;
			}
		}
		if ( ! $chosen ) {
			return self::problem( __( 'Choose one of the shop\'s delivery times.', 'yallapp' ) );
		}
		if ( self::slot_started( $chosen, $date, $now ) ) {
			return self::problem( __( 'That delivery time has started. Please choose a later one.', 'yallapp' ) );
		}
		if ( null !== $chosen['capacity'] ) {
			$used = (array) call_user_func( $counts, $date );
			if ( (int) ( $used[ $chosen['id'] ] ?? 0 ) >= (int) $chosen['capacity'] ) {
				return self::problem( __( 'That delivery time is full. Please choose another time or day.', 'yallapp' ), 'slot_full', 409 );
			}
		}
		return array(
			'date' => $date,
			'slot' => $chosen,
			'fee'  => null !== $chosen['fee'] ? (float) $chosen['fee'] : 0.0,
		);
	}

	/**
	 * A day's slots with whether each can be chosen (DeliverySlots).
	 *
	 * @param array              $rules  StoreConfig.delivery_date with numeric fees.
	 * @param string             $date   Y-m-d.
	 * @param \DateTimeImmutable $now    Now.
	 * @param array              $counts Orders by slot.
	 * @param callable           $money  fn( float ): string.
	 * @return array
	 */
	public static function slots_json( array $rules, $date, \DateTimeImmutable $now, array $counts, $money ) {
		$why   = self::day_problem( $rules, $date, $now );
		$slots = array();
		foreach ( (array) ( $rules['slots'] ?? array() ) as $slot ) {
			$remaining = null !== $slot['capacity'] ? max( 0, (int) $slot['capacity'] - (int) ( $counts[ $slot['id'] ] ?? 0 ) ) : null;
			$slots[]   = array_merge(
				self::slot_json( $slot, $money ),
				array(
					'available' => null === $why && ! self::slot_started( $slot, $date, $now ) && 0 !== $remaining,
					'full'      => 0 === $remaining,
					'remaining' => $remaining,
				)
			);
		}
		return array(
			'date'   => (string) $date,
			'open'   => null === $why,
			'reason' => $why,
			'slots'  => $slots,
		);
	}

	/**
	 * One slot as the app gets it (DeliverySlot).
	 *
	 * @param array    $slot  Slot.
	 * @param callable $money fn( float ): string.
	 * @return array
	 */
	public static function slot_json( array $slot, $money ) {
		$fee = null !== $slot['fee'] && $slot['fee'] > 0 ? (float) $slot['fee'] : null;
		return array(
			'id'            => $slot['id'],
			'start'         => $slot['start'],
			'end'           => $slot['end'],
			'label'         => $slot['start'] . '–' . $slot['end'],
			'fee'           => null !== $fee ? number_format( $fee, 2, '.', '' ) : null,
			'fee_formatted' => null !== $fee ? (string) call_user_func( $money, $fee ) : null,
			'capacity'      => $slot['capacity'],
		);
	}

	/**
	 * An error for the customer.
	 *
	 * @param string $message Message.
	 * @param string $code    Code.
	 * @param int    $status  HTTP status.
	 * @return array{error: string, code: string, status: int}
	 */
	private static function problem( $message, $code = 'invalid_request', $status = 400 ) {
		return array(
			'error'  => $message,
			'code'   => $code,
			'status' => $status,
		);
	}

	/**
	 * One line of words: no control characters, spaces collapsed.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	public static function line( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		$text = (string) preg_replace( '/[\x00-\x1F\x7F]/u', ' ', $value );
		return trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
	}

	/**
	 * A phone number as `+` and digits, or '' when it isn't one.
	 *
	 * @param mixed $value Value.
	 * @return string
	 */
	public static function phone( $value ) {
		$raw = is_string( $value ) ? trim( $value ) : '';
		if ( ! preg_match( '/^\+?[0-9\s().-]{6,30}$/', $raw ) ) {
			return '';
		}
		$digits = (string) preg_replace( '/[^0-9]/', '', $raw );
		if ( strlen( $digits ) < 6 || strlen( $digits ) > 15 ) {
			return '';
		}
		return ( 0 === strpos( $raw, '+' ) ? '+' : '' ) . $digits;
	}

	/**
	 * Length in characters.
	 *
	 * @param string $text Text.
	 * @return int
	 */
	private static function length( $text ) {
		return function_exists( 'mb_strlen' ) ? mb_strlen( $text, 'UTF-8' ) : strlen( $text );
	}

	/**
	 * The card, the recipient, "send anonymously" and, in the gift checkout, the sender.
	 *
	 * @param array $gift   StoreConfig.gift_message (enabled, max_length, recipient, anonymous).
	 * @param bool  $gifted The gift checkout.
	 * @param array $input  gift_message, gift_anonymous, recipient, sender.
	 * @return array {message, anonymous, recipient, sender} or {error, code, status}.
	 */
	public static function check_gift( array $gift, $gifted, array $input ) {
		$message = '';
		if ( ! empty( $gift['enabled'] ) ) {
			$raw     = isset( $input['gift_message'] ) && is_string( $input['gift_message'] ) ? str_replace( array( "\r\n", "\r" ), "\n", $input['gift_message'] ) : '';
			$message = trim( (string) preg_replace( "/\n{3,}/", "\n\n", (string) preg_replace( '/[\x00-\x09\x0B-\x1F\x7F]/u', '', $raw ) ) );
			$max     = max( 1, min( self::MAX_MESSAGE, (int) ( $gift['max_length'] ?? self::MAX_MESSAGE ) ) );
			if ( self::length( $message ) > $max ) {
				/* translators: %d: the longest a message can be. */
				return self::problem( sprintf( __( 'The card message can be at most %d characters.', 'yallapp' ), $max ) );
			}
		}
		$recipient = null;
		$r         = isset( $input['recipient'] ) && is_array( $input['recipient'] ) ? $input['recipient'] : array();
		if ( $gifted || ( ! empty( $gift['recipient'] ) && ( ! empty( $r['name'] ) || ! empty( $r['phone'] ) ) ) ) {
			$name = self::line( $r['name'] ?? '' );
			if ( self::length( $name ) < 2 || self::length( $name ) > self::MAX_NAME ) {
				return self::problem( __( 'Enter the recipient\'s name.', 'yallapp' ) );
			}
			$phone = self::phone( $r['phone'] ?? '' );
			if ( '' === $phone ) {
				return self::problem( __( 'Enter the recipient\'s phone number.', 'yallapp' ) );
			}
			$address = null;
			if ( $gifted ) {
				$address = self::line( $r['address'] ?? '' );
				if ( self::length( $address ) < 5 ) {
					return self::problem( __( 'Enter the delivery address.', 'yallapp' ) );
				}
				if ( self::length( $address ) > self::MAX_ADDRESS ) {
					/* translators: %d: the longest an address can be. */
					return self::problem( sprintf( __( 'The address can be at most %d characters.', 'yallapp' ), self::MAX_ADDRESS ) );
				}
			}
			$recipient = array(
				'name'    => $name,
				'phone'   => $phone,
				'address' => $address,
				'city'    => self::line( $r['city'] ?? '' ),
				'country' => is_string( $r['country'] ?? null ) && preg_match( '/^[A-Za-z]{2}$/', (string) $r['country'] ) ? strtoupper( (string) $r['country'] ) : '',
			);
		}
		$sender = null;
		if ( $gifted ) {
			$s    = isset( $input['sender'] ) && is_array( $input['sender'] ) ? $input['sender'] : array();
			$name = self::line( $s['name'] ?? '' );
			if ( self::length( $name ) < 2 || self::length( $name ) > self::MAX_NAME ) {
				return self::problem( __( 'Enter your name.', 'yallapp' ) );
			}
			$phone = self::phone( $s['phone'] ?? '' );
			if ( '' === $phone ) {
				return self::problem( __( 'Enter your phone number.', 'yallapp' ) );
			}
			$email = is_string( $s['email'] ?? null ) ? strtolower( trim( (string) $s['email'] ) ) : '';
			if ( strlen( $email ) > self::MAX_EMAIL || ! preg_match( '/^[^\s@<>()\[\]\\\\,;:"]{1,64}@[^\s@<>()\[\]\\\\,;:"]{1,180}\.[A-Za-z]{2,24}$/', $email ) ) {
				return self::problem( __( 'Enter your email address.', 'yallapp' ) );
			}
			$sender = array(
				'name'  => $name,
				'phone' => $phone,
				'email' => $email,
			);
		}
		return array(
			'message'   => '' !== $message ? $message : null,
			'anonymous' => ! empty( $gift['anonymous'] ) && true === ( $input['gift_anonymous'] ?? false ),
			'recipient' => $recipient,
			'sender'    => $sender,
		);
	}

	/**
	 * A flash sale's price of a product costing `$regular`; null when it wouldn't lower it.
	 *
	 * @param array $sale    kind (percent or price), value.
	 * @param float $regular Regular price.
	 * @return float|null
	 */
	public static function flash_price( array $sale, $regular ) {
		$regular = (float) $regular;
		if ( $regular <= 0 ) {
			return null;
		}
		$value = (float) $sale['value'];
		$now   = 'price' === $sale['kind'] ? $value : round( $regular * ( 100 - $value ) / 100, 2 );
		return $now >= 0 && $now < $regular ? $now : null;
	}

	/**
	 * Whether a flash sale is on: turned on, started, not ended, not sold out.
	 *
	 * @param array $sale enabled, starts (timestamp), ends (timestamp), limit, sold.
	 * @param int   $now  Unix time.
	 * @return bool
	 */
	public static function flash_on( array $sale, $now ) {
		return ! empty( $sale['enabled'] ) && (int) $sale['starts'] <= $now && $now < (int) $sale['ends'] && ( empty( $sale['limit'] ) || (int) $sale['sold'] < (int) $sale['limit'] );
	}

	/**
	 * 131 Whether a flash sale has a product: one of its products, or its category's (a sale
	 * on one product is on that one only).
	 *
	 * @param array $sale        product_ids, category_id.
	 * @param int   $product_id  The product (a variation's parent).
	 * @param bool  $in_category Whether the product is in the sale's category.
	 * @return bool
	 */
	public static function flash_covers( array $sale, $product_id, $in_category ) {
		if ( in_array( (int) $product_id, array_map( 'intval', (array) ( $sale['product_ids'] ?? array() ) ), true ) ) {
			return true;
		}
		return (int) ( $sale['category_id'] ?? 0 ) > 0 && (bool) $in_category;
	}

	/**
	 * ProductSale: was and now, the share off, when it ends and the units left.
	 *
	 * @param float    $was       Price before.
	 * @param float    $now       Price now.
	 * @param int|null $ends      Unix time it ends, or null.
	 * @param int|null $remaining Units left, or null.
	 * @param int|null $total     All the units, or null.
	 * @param int|null $starts    Unix time it started, or null.
	 * @param callable $money     fn( float ): string.
	 * @param int|null $sale_id   The plugin's flash sale (1), or null for WooCommerce's own sale price.
	 * @return array
	 */
	public static function sale_json( $was, $now, $ends, $remaining, $total, $starts, $money, $sale_id = null ) {
		$was = (float) $was;
		$now = (float) $now;
		return array(
			'was'           => number_format( $was, 2, '.', '' ),
			'was_formatted' => (string) call_user_func( $money, $was ),
			'now'           => number_format( $now, 2, '.', '' ),
			'now_formatted' => (string) call_user_func( $money, $now ),
			'percent_off'   => $was > 0 ? max( 1, (int) round( ( $was - $now ) * 100 / $was ) ) : 0,
			'starts_at'     => null !== $starts ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $starts ) : null,
			'ends_at'       => null !== $ends ? gmdate( 'Y-m-d\TH:i:s\Z', (int) $ends ) : null,
			'remaining'     => null !== $remaining ? max( 0, (int) $remaining ) : null,
			'total'         => null !== $total ? (int) $total : null,
			'flash_sale_id' => $sale_id,
		);
	}

	/**
	 * The card messages of a license status, kept bounded: strings only, at most 30 occasions
	 * of 12 messages; null when there are none.
	 *
	 * @param mixed $raw LicenseStatus.gift_messages.
	 * @return array|null
	 */
	public static function gift_status( $raw ) {
		if ( ! is_array( $raw ) || ! is_array( $raw['occasions'] ?? null ) ) {
			return null;
		}
		$texts     = static function ( $value, $max ) {
			$out = array();
			foreach ( is_array( $value ) ? $value : array() as $lang => $text ) {
				if ( is_string( $lang ) && preg_match( '/^[a-z]{2,3}$/', $lang ) && is_string( $text ) && '' !== trim( $text ) ) {
					$out[ $lang ] = function_exists( 'mb_substr' ) ? mb_substr( trim( $text ), 0, $max, 'UTF-8' ) : substr( trim( $text ), 0, $max );
				}
			}
			return $out;
		};
		$occasions = array();
		foreach ( array_slice( $raw['occasions'], 0, 30 ) as $occasion ) {
			if ( ! is_array( $occasion ) || ! is_string( $occasion['id'] ?? null ) || ! preg_match( '/^[a-z0-9_]{1,24}$/', $occasion['id'] ) ) {
				continue;
			}
			$templates = array();
			foreach ( array_slice( (array) ( $occasion['templates'] ?? array() ), 0, 12 ) as $template ) {
				if ( is_array( $template ) && is_string( $template['id'] ?? null ) && preg_match( '/^[a-z0-9]{1,8}$/', $template['id'] ) ) {
					$templates[] = array(
						'id'    => $template['id'],
						'texts' => $texts( $template['texts'] ?? null, self::MAX_MESSAGE ),
					);
				}
			}
			$occasions[] = array(
				'id'        => $occasion['id'],
				'icon'      => is_string( $occasion['icon'] ?? null ) && preg_match( '/^[a-z0-9_]{1,40}$/', $occasion['icon'] ) ? $occasion['icon'] : 'redeem',
				'names'     => $texts( $occasion['names'] ?? null, 40 ),
				'templates' => $templates,
			);
		}
		return $occasions ? array(
			'default_language' => is_string( $raw['default_language'] ?? null ) && preg_match( '/^[a-z]{2,3}$/', $raw['default_language'] ) ? $raw['default_language'] : 'en',
			'occasions'        => $occasions,
		) : null;
	}

	/**
	 * The card messages of the license status in the language asked for (GiftMessages).
	 *
	 * @param mixed  $status   LicenseStatus.gift_messages.
	 * @param string $language The app's language.
	 * @return array
	 */
	public static function gift_messages( $status, $language ) {
		$out = array();
		if ( ! is_array( $status ) || ! isset( $status['occasions'] ) || ! is_array( $status['occasions'] ) ) {
			return array( 'occasions' => array() );
		}
		$default = isset( $status['default_language'] ) ? (string) $status['default_language'] : 'en';
		$pick    = static function ( $texts ) use ( $language, $default ) {
			$texts = is_array( $texts ) ? $texts : array();
			foreach ( array( $language, $default, 'en' ) as $lang ) {
				if ( isset( $texts[ $lang ] ) && is_string( $texts[ $lang ] ) && '' !== trim( $texts[ $lang ] ) ) {
					return trim( $texts[ $lang ] );
				}
			}
			foreach ( $texts as $text ) {
				if ( is_string( $text ) && '' !== trim( $text ) ) {
					return trim( $text );
				}
			}
			return '';
		};
		foreach ( $status['occasions'] as $occasion ) {
			if ( ! is_array( $occasion ) || empty( $occasion['id'] ) ) {
				continue;
			}
			$templates = array();
			foreach ( (array) ( $occasion['templates'] ?? array() ) as $template ) {
				$text = is_array( $template ) ? $pick( $template['texts'] ?? array() ) : '';
				if ( '' !== $text && ! empty( $template['id'] ) ) {
					$templates[] = array(
						'id'   => (string) $template['id'],
						'text' => function_exists( 'mb_substr' ) ? mb_substr( $text, 0, self::MAX_MESSAGE, 'UTF-8' ) : substr( $text, 0, self::MAX_MESSAGE ),
					);
				}
			}
			$name = $pick( $occasion['names'] ?? array() );
			if ( '' === $name || ! $templates ) {
				continue;
			}
			$out[] = array(
				'id'        => (string) $occasion['id'],
				'name'      => $name,
				'icon'      => is_string( $occasion['icon'] ?? null ) && preg_match( '/^[a-z0-9_]{1,40}$/', (string) $occasion['icon'] ) ? (string) $occasion['icon'] : 'redeem',
				'templates' => $templates,
			);
		}
		return array( 'occasions' => $out );
	}

	/**
	 * The delivery and the gift as lines for the order's note and screens.
	 *
	 * @param array $d date, slot, sender, recipient, message, anonymous.
	 * @return string[]
	 */
	public static function note_lines( array $d ) {
		$lines = array();
		if ( ! empty( $d['date'] ) ) {
			$lines[] = 'Delivery date: ' . $d['date'] . ( ! empty( $d['slot'] ) ? ', ' . $d['slot']['start'] . '–' . $d['slot']['end'] : '' );
		}
		if ( ! empty( $d['sender'] ) ) {
			$lines[] = 'Sender: ' . $d['sender']['name'] . ', ' . $d['sender']['phone'] . ', ' . $d['sender']['email'];
		}
		if ( ! empty( $d['recipient'] ) ) {
			$lines[] = 'Recipient: ' . $d['recipient']['name'] . ', ' . $d['recipient']['phone'] . ( ! empty( $d['recipient']['address'] ) ? ', ' . $d['recipient']['address'] : '' );
		}
		if ( ! empty( $d['message'] ) ) {
			$lines[] = 'Card message: ' . $d['message'];
		}
		if ( ! empty( $d['anonymous'] ) ) {
			$lines[] = 'Send anonymously: yes';
		}
		return $lines;
	}
}
