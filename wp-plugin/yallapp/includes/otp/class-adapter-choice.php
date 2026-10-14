<?php
/**
 * Which provider sends sign-in codes.
 *
 * @package Yallapp
 */

namespace Yallapp\Otp;

defined( 'ABSPATH' ) || exit;

/**
 * Picks the code provider from the saved choice and what works on this site. When the
 * saved choice can't send codes, another one that can is used and the settings page says
 * so. Pure: the caller says which providers are available.
 */
class Adapter_Choice {

	const YALLAPP = 'yallapp';
	const DIGITS  = 'digits';
	const DEV     = 'dev';

	/**
	 * Providers to try, in order, when the saved one can't send codes.
	 */
	const FALLBACKS = array(
		self::YALLAPP => array( self::DIGITS, self::DEV ),
		self::DIGITS  => array( self::YALLAPP, self::DEV ),
		self::DEV     => array( self::YALLAPP, self::DIGITS ),
	);

	/**
	 * The provider to use.
	 *
	 * @param string $saved     Saved choice (`yallapp`, `digits` or `dev`); anything else means `yallapp`.
	 * @param array  $available Provider ID => whether it can send codes now.
	 * @return array{id: string, saved: string, fallback: bool, available: bool} `fallback`: another provider
	 *         replaces the saved one; `available`: the provider used can send codes.
	 */
	public static function resolve( $saved, array $available ) {
		$saved = isset( self::FALLBACKS[ $saved ] ) ? $saved : self::YALLAPP;
		if ( ! empty( $available[ $saved ] ) ) {
			return array(
				'id'        => $saved,
				'saved'     => $saved,
				'fallback'  => false,
				'available' => true,
			);
		}
		foreach ( self::FALLBACKS[ $saved ] as $id ) {
			if ( ! empty( $available[ $id ] ) ) {
				return array(
					'id'        => $id,
					'saved'     => $saved,
					'fallback'  => true,
					'available' => true,
				);
			}
		}
		// Nothing works: keep the saved one, so its own error explains what's missing.
		return array(
			'id'        => $saved,
			'saved'     => $saved,
			'fallback'  => false,
			'available' => false,
		);
	}
}
