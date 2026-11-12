<?php
/**
 * The student's saved cards.
 *
 * @package Yallapp
 */

namespace Yallapp\Commerce;

defined( 'ABSPATH' ) || exit;

/**
 * 123 The cards a customer saved with the site's payment gateway (WooCommerce's saved payment
 * methods, `GET /me/cards`): the brand, the last four digits and when it expires. The card
 * numbers stay with the gateway; the app sends a card's ID with the checkout link and the
 * checkout opens with it chosen.
 */
class Saved_Cards {

	const SESSION = 'yallapp_card';

	/**
	 * The customer's cards of the gateways the site takes now, the default first.
	 *
	 * @param int $user_id Customer.
	 * @return array[] SavedCard shapes.
	 */
	public static function of( $user_id ) {
		if ( ! $user_id || ! class_exists( '\WC_Payment_Tokens' ) || ! function_exists( 'WC' ) ) {
			return array();
		}
		$enabled = self::enabled_gateways();
		$cards   = array();
		foreach ( \WC_Payment_Tokens::get_customer_tokens( (int) $user_id ) as $token ) {
			if ( ! $token instanceof \WC_Payment_Token_CC || ! in_array( $token->get_gateway_id(), $enabled, true ) ) {
				continue;
			}
			$cards[] = self::shape( $token );
		}
		usort(
			$cards,
			static function ( $a, $b ) {
				return (int) $b['default'] - (int) $a['default'];
			}
		);
		return $cards;
	}

	/**
	 * One of the customer's cards, or null.
	 *
	 * @param int    $user_id Customer.
	 * @param string $id      The card's ID.
	 * @return \WC_Payment_Token_CC|null
	 */
	public static function find( $user_id, $id ) {
		if ( ! $user_id || '' === (string) $id || ! ctype_digit( (string) $id ) || ! class_exists( '\WC_Payment_Tokens' ) ) {
			return null;
		}
		$token = \WC_Payment_Tokens::get( (int) $id );
		if ( ! $token instanceof \WC_Payment_Token_CC || (int) $token->get_user_id() !== (int) $user_id ) {
			return null;
		}
		return $token;
	}

	/**
	 * The card the checkout link chose shows chosen on the checkout: its gateway first and it the
	 * gateway's default for this visit (nothing is saved).
	 *
	 * @param array  $tokens      The customer's tokens.
	 * @param int    $customer_id Customer.
	 * @param string $gateway_id  The gateway asking, or ''.
	 * @return array
	 */
	public static function choose( $tokens, $customer_id, $gateway_id ) {
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return $tokens;
		}
		$chosen = (int) WC()->session->get( self::SESSION );
		if ( ! $chosen || ! is_array( $tokens ) || ! isset( $tokens[ $chosen ] ) ) {
			return $tokens;
		}
		$gateway = $tokens[ $chosen ]->get_gateway_id();
		foreach ( $tokens as $id => $token ) {
			if ( $token->get_gateway_id() === $gateway ) {
				$token->set_default( (int) $id === $chosen );
			}
		}
		unset( $customer_id, $gateway_id );
		return $tokens;
	}

	/**
	 * A card as the app reads it. Pure.
	 *
	 * @param \WC_Payment_Token_CC $token Token.
	 * @return array
	 */
	public static function shape( $token ) {
		return array(
			'id'        => (string) $token->get_id(),
			'brand'     => strtolower( (string) $token->get_card_type() ),
			'last4'     => (string) $token->get_last4(),
			'exp_month' => (int) $token->get_expiry_month(),
			'exp_year'  => (int) $token->get_expiry_year(),
			'default'   => (bool) $token->is_default(),
		);
	}

	/**
	 * The IDs of the gateways the site takes payments with.
	 *
	 * @return string[]
	 */
	private static function enabled_gateways() {
		$ids = array();
		foreach ( WC()->payment_gateways()->payment_gateways() as $id => $gateway ) {
			if ( 'yes' === $gateway->enabled ) {
				$ids[] = (string) $id;
			}
		}
		return $ids;
	}
}
