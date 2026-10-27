<?php
/**
 * Courses and memberships bought in the app through Google Play and the App Store.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

/**
 * 100.4 What the app sells through the stores, from the license status
 * (`LicenseStatus.store_billing`, docs/api/platform.yaml): where Yallapp's Store billing API is,
 * the platforms that sell in the app and the store products ready to sell, each with what it
 * sells on the site. The plugin serves it as `Config.store_billing` (`session: site`), puts
 * the store products on the course pages and sends its catalog. Pure.
 */
class Store_Billing {

	/**
	 * The license feature.
	 */
	const FEATURE = 'store_billing';

	/**
	 * The most store products kept from the license status (1,000 courses and 50 plans).
	 */
	const MAX_PRODUCTS = 1050;

	/**
	 * The store product ID of a course or plan, as Yallapp makes it (platform/web
	 * src/lib/store-billing/products.ts, productIdFor): `course_<id>`, or `plan_` and the plan's ID
	 * in lowercase letters, digits and underscores, at most 40 characters.
	 *
	 * @param string     $kind course|membership.
	 * @param int|string $id   Course ID or plan ID.
	 * @return string
	 */
	public static function product_id( $kind, $id ) {
		if ( 'course' === $kind ) {
			return 'course_' . (int) $id;
		}
		$slug = trim( (string) preg_replace( '/[^a-z0-9]+/', '_', strtolower( (string) $id ) ), '_' );
		return substr( 'plan_' . $slug, 0, 40 );
	}

	/**
	 * Where a plan ID comes from: `pmpro:<level>`, `ld_group:<group>` or `wcs:<product>`.
	 *
	 * @param string $plan_id Plan ID.
	 * @return array{source: string, id: int}|null
	 */
	public static function plan_source( $plan_id ) {
		if ( ! is_string( $plan_id ) || 1 !== preg_match( '/^(pmpro|ld_group|wcs):([1-9]\d{0,18})$/', $plan_id, $match ) ) {
			return null;
		}
		return array(
			'source' => $match[1],
			'id'     => (int) $match[2],
		);
	}

	/**
	 * `LicenseStatus.store_billing`, checked: null when the plan doesn't sell in the app, no
	 * store is connected, or the platform sends something else (an older one sends nothing).
	 *
	 * @param array $result License status from the platform.
	 * @return array{base_url: string, platforms: string[], products: array[]}|null
	 */
	public static function of_status( array $result ) {
		$billing = $result['store_billing'] ?? null;
		if ( ! is_array( $billing ) || ! is_string( $billing['base_url'] ?? null ) ) {
			return null;
		}
		$url    = trim( $billing['base_url'] );
		$scheme = strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) );
		if ( ! in_array( $scheme, array( 'https', 'http' ), true ) || '' === (string) wp_parse_url( $url, PHP_URL_HOST ) || strlen( $url ) > 500 || '' === esc_url_raw( $url ) ) {
			return null;
		}
		$platforms = array_values( array_intersect( array( 'android', 'ios' ), is_array( $billing['platforms'] ?? null ) ? $billing['platforms'] : array() ) );
		$products  = array();
		foreach ( is_array( $billing['products'] ?? null ) ? $billing['products'] : array() as $product ) {
			$product = self::product_of( $product );
			if ( null !== $product && count( $products ) < self::MAX_PRODUCTS ) {
				$products[] = $product;
			}
		}
		return array(
			'base_url'  => untrailingslashit( esc_url_raw( $url ) ),
			'platforms' => $platforms,
			'products'  => $products,
		);
	}

	/**
	 * One store product of the license status, or null when it isn't one.
	 *
	 * @param mixed $product Product.
	 * @return array{product_id: string, kind: string, course_id: int|null, plan_id: string|null}|null
	 */
	private static function product_of( $product ) {
		if ( ! is_array( $product ) || ! is_string( $product['product_id'] ?? null ) || 1 !== preg_match( '/^[a-z0-9_.]{1,100}$/', $product['product_id'] ) ) {
			return null;
		}
		$kind = $product['kind'] ?? null;
		if ( 'course' === $kind ) {
			$course_id = $product['course_id'] ?? null;
			return is_int( $course_id ) && $course_id > 0 ? array(
				'product_id' => $product['product_id'],
				'kind'       => 'course',
				'course_id'  => $course_id,
				'plan_id'    => null,
			) : null;
		}
		if ( 'membership' === $kind ) {
			$plan_id = $product['plan_id'] ?? null;
			return is_string( $plan_id ) && '' !== $plan_id && strlen( $plan_id ) <= 64 ? array(
				'product_id' => $product['product_id'],
				'kind'       => 'membership',
				'course_id'  => null,
				'plan_id'    => $plan_id,
			) : null;
		}
		return null;
	}

	/**
	 * `Config.store_billing` on a platform: the stored status's address with `session: site`,
	 * or null when the app doesn't sell in the app there.
	 *
	 * @param array|null $billing  `of_status()`.
	 * @param string     $platform android|ios.
	 * @return array{base_url: string, session: string}|null
	 */
	public static function config( $billing, $platform ) {
		if ( ! is_array( $billing ) || ! in_array( $platform, (array) ( $billing['platforms'] ?? array() ), true ) ) {
			return null;
		}
		return array(
			'base_url' => (string) $billing['base_url'],
			'session'  => 'site',
		);
	}

	/**
	 * The store product that sells a course, or null when it has none ready.
	 *
	 * @param array|null $billing   `of_status()`.
	 * @param int        $course_id Course.
	 * @return string|null
	 */
	public static function course_product( $billing, $course_id ) {
		foreach ( is_array( $billing ) ? (array) $billing['products'] : array() as $product ) {
			if ( 'course' === $product['kind'] && (int) $course_id === $product['course_id'] ) {
				return $product['product_id'];
			}
		}
		return null;
	}

	/**
	 * The store products of some plans (`pmpro:3`, …), in the products' order.
	 *
	 * @param array|null $billing  `of_status()`.
	 * @param string[]   $plan_ids Plan IDs.
	 * @return string[]
	 */
	public static function plan_products( $billing, array $plan_ids ) {
		$ids = array();
		foreach ( is_array( $billing ) ? (array) $billing['products'] : array() as $product ) {
			if ( 'membership' === $product['kind'] && in_array( $product['plan_id'], $plan_ids, true ) && ! in_array( $product['product_id'], $ids, true ) ) {
				$ids[] = $product['product_id'];
			}
		}
		return $ids;
	}

	/**
	 * The course page's button when the app sells in the app on this platform: a paid course the
	 * student isn't in is bought through the store (`store`) when its product is ready, and not
	 * in the app otherwise (never the website's checkout, as the stores ask).
	 *
	 * @param string      $action   The action without the store (Purchase_Rules::action()).
	 * @param bool        $paid     Whether the course is paid.
	 * @param bool        $enrolled Whether the student is enrolled.
	 * @param bool        $store_on Whether `Config.store_billing` is sent on this platform.
	 * @param string|null $product  The course's store product.
	 * @return string
	 */
	public static function course_action( $action, $paid, $enrolled, $store_on, $product ) {
		if ( ! $store_on || $enrolled || ! $paid || ! in_array( $action, array( 'checkout', 'none' ), true ) ) {
			return $action;
		}
		return null !== $product && '' !== $product ? 'store' : 'none';
	}

	/**
	 * A price as the catalog sends it: a decimal string with two places, or null when it isn't a
	 * positive amount Yallapp accepts (`^\d{1,7}(\.\d{1,2})?$`).
	 *
	 * @param mixed $value Price.
	 * @return string|null
	 */
	public static function price_text( $value ) {
		if ( is_string( $value ) ) {
			$value = trim( $value );
			if ( 1 !== preg_match( '/^\d+(\.\d+)?$/', $value ) ) {
				return null;
			}
		} elseif ( ! is_int( $value ) && ! is_float( $value ) ) {
			return null;
		}
		$amount = round( (float) $value, 2 );
		if ( ! is_finite( $amount ) || $amount <= 0 || $amount >= 10000000 ) {
			return null;
		}
		return number_format( $amount, 2, '.', '' );
	}

	/**
	 * A plan's period from its billing cycle: every 1 month (or 12) or every 1 year; null for
	 * any other cycle (the stores' subscriptions here are monthly or yearly).
	 *
	 * @param mixed $interval Every how many units.
	 * @param mixed $unit     Month, Year, M, Y, month, year (Paid Memberships Pro, LearnDash, WooCommerce Subscriptions).
	 * @return string|null month|year
	 */
	public static function period( $interval, $unit ) {
		$unit     = strtolower( trim( (string) $unit ) );
		$interval = is_numeric( $interval ) ? (int) $interval : 0;
		if ( in_array( $unit, array( 'year', 'y', 'years' ), true ) && 1 === $interval ) {
			return 'year';
		}
		if ( in_array( $unit, array( 'month', 'm', 'months' ), true ) ) {
			return 1 === $interval ? 'month' : ( 12 === $interval ? 'year' : null );
		}
		return null;
	}

	/**
	 * The catalog's body (without SiteInfo): the paid courses and plans, each checked, at most
	 * 1,000 courses and 50 plans; null without a currency.
	 *
	 * @param string $currency ISO code.
	 * @param array  $courses  Each id, title and price.
	 * @param array  $plans    Each id, title, price, period and course_ids.
	 * @return array{currency: string, courses: array[], plans: array[]}|null
	 */
	public static function catalog( $currency, array $courses, array $plans ) {
		$currency = strtoupper( trim( (string) $currency ) );
		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			return null;
		}
		$out_courses = array();
		$seen        = array();
		foreach ( $courses as $course ) {
			$id    = (int) ( $course['id'] ?? 0 );
			$title = self::title( $course['title'] ?? '' );
			$price = self::price_text( $course['price'] ?? null );
			if ( $id < 1 || '' === $title || null === $price || isset( $seen[ $id ] ) || count( $out_courses ) >= 1000 ) {
				continue;
			}
			$seen[ $id ]   = true;
			$out_courses[] = array(
				'id'    => $id,
				'title' => $title,
				'price' => $price,
			);
		}
		$out_plans = array();
		$seen      = array();
		foreach ( $plans as $plan ) {
			$id     = (string) ( $plan['id'] ?? '' );
			$title  = self::title( $plan['title'] ?? '' );
			$price  = self::price_text( $plan['price'] ?? null );
			$period = $plan['period'] ?? null;
			if ( null === self::plan_source( $id ) || '' === $title || null === $price || ! in_array( $period, array( 'month', 'year' ), true ) || isset( $seen[ $id ] ) || count( $out_plans ) >= 50 ) {
				continue;
			}
			$seen[ $id ] = true;
			$course_ids  = array_values( array_unique( array_filter( array_map( 'intval', (array) ( $plan['course_ids'] ?? array() ) ) ) ) );
			$out_plans[] = array(
				'id'         => $id,
				'title'      => $title,
				'price'      => $price,
				'period'     => $period,
				'course_ids' => array_slice(
					array_values(
						array_filter(
							$course_ids,
							static function ( $course_id ) {
								return $course_id > 0;
							}
						)
					),
					0,
					1000
				),
			);
		}
		return array(
			'currency' => $currency,
			'courses'  => $out_courses,
			'plans'    => $out_plans,
		);
	}

	/**
	 * A title as plain text, at most 200 characters.
	 *
	 * @param mixed $title Title.
	 * @return string
	 */
	private static function title( $title ) {
		$title = trim( (string) preg_replace( '/\s+/u', ' ', html_entity_decode( wp_strip_all_tags( (string) $title ), ENT_QUOTES, 'UTF-8' ) ) );
		return function_exists( 'mb_substr' ) ? trim( mb_substr( $title, 0, 200 ) ) : trim( substr( $title, 0, 200 ) );
	}
}
