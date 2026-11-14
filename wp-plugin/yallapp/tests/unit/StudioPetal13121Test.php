<?php
/**
 * 131.21–131.25 Leqaa's signature chrome on a WordPress site, for every app: the `petal`
 * header style (its line, photo and collapse), the `petal` bar, the `petal` system screens'
 * look and the store's `gift` checkout look reach the app as the contract says; any other
 * value is left out, as before.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Pages\Pages;
use Yallapp\Pages\Studio_Screens;
use Yallapp\Plugin;

class StudioPetal13121Test extends TestCase {

	/**
	 * The header served for a page with this header.
	 *
	 * @param array $header The page's header as stored.
	 * @return array|null
	 */
	private function header( array $header ) {
		$plugin   = ( new ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
		$resolver = new Block_Resolver( $plugin );
		$page     = $resolver->studio(
			array(
				'header' => $header,
				'body'   => array(
					'id'       => 'root',
					'type'     => 'column',
					'children' => array(),
				),
			),
			'android',
			0,
			'en'
		);
		return $page['header'];
	}

	public function test_serves_the_petal_header() {
		$header = $this->header(
			array(
				'type'      => 'logo_center',
				'style'     => 'petal',
				'title'     => 'Leqaa',
				'subtitle'  => 'Flowers for every moment',
				'image_url' => 'https://shop.test/bouquet.jpg',
				'collapse'  => false,
				'buttons'   => array( 'search', 'cart' ),
			)
		);
		$this->assertSame( 'petal', $header['style'] );
		$this->assertSame( 'Flowers for every moment', $header['subtitle'] );
		$this->assertSame( 'https://shop.test/bouquet.jpg', $header['image_url'] );
		$this->assertFalse( $header['collapse'] );
	}

	public function test_serves_the_petal_bar() {
		$bar = Pages::tab_bar(
			array(
				'design' => 'petal',
				'center' => 'cart',
			)
		);
		$this->assertSame( 'petal', $bar['design'] );
		$this->assertArrayNotHasKey( 'design', (array) Pages::tab_bar( array( 'design' => 'bloom' ) ) );
	}

	public function test_keeps_the_petal_system_look_and_the_gift_checkout() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'system'   => array(
						'look'    => 'petal',
						'screens' => array( 'sign_in' => 'photo' ),
					),
					'checkout' => array(
						'look'        => 'gift',
						'accent'      => '#8e2445',
						'dark_accent' => 'pink',
					),
				),
			)
		);
		$this->assertSame( 'petal', $screens['system']['look'] );
		$this->assertSame( array( 'sign_in' => 'photo' ), $screens['system']['screens'] );
		$this->assertSame(
			// 131.25 The premium gift look is the gift checkout too.
			array(
				'look'   => 'gift',
				'mode'   => 'gift',
				'accent' => '#8E2445',
			),
			$screens['checkout']
		);
	}

	public function test_an_unknown_checkout_look_is_left_out() {
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => array( 'checkout' => array( 'look' => 'express' ) ) ) ) );
	}

	/**
	 * 131 One checkout look for both sides: the commerce side's fields and the premium gift look
	 * by day and by night, which turns the gift checkout on; unknown values left out.
	 */
	public function test_keeps_one_checkout_look_for_both_sides() {
		$this->assertSame(
			array(
				'look'        => 'gift',
				'mode'        => 'gift',
				'style'       => 'steps',
				'chips'       => 'square',
				'surface'     => 'glass',
				'accent'      => '#2F5D50',
				'dark_accent' => '#B9D9C6',
				'radius'      => 14,
			),
			Studio_Screens::checkout(
				array(
					'look'        => 'gift',
					'style'       => 'steps',
					'chips'       => 'square',
					'surface'     => 'glass',
					'accent'      => '#2f5d50',
					'dark_accent' => '#b9d9c6',
					'radius'      => 14,
				)
			)
		);
		$this->assertSame( array( 'mode' => 'gift' ), Studio_Screens::checkout( array( 'mode' => 'gift' ) ) );
		$this->assertNull( Studio_Screens::checkout( array( 'look' => 'express' ) ) );
	}
}
