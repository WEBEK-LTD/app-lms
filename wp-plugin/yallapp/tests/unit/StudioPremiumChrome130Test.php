<?php
/**
 * 130.20–130.21 Premium chrome on a WordPress site: a Studio page's premium header style
 * (its line, photo and collapse) and the system screens' premium look reach the app with
 * known values only; old headers are served as before.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Pages\Studio_Screens;
use Yallapp\Plugin;

class StudioPremiumChrome130Test extends TestCase {

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

	public function test_serves_the_premium_header_style() {
		$header = $this->header(
			array(
				'type'      => 'title',
				'style'     => 'photo',
				'title'     => 'Orders',
				'subtitle'  => 'Tonight',
				'image_url' => 'https://shop.test/cover.jpg',
				'collapse'  => false,
				'buttons'   => array( 'notifications', 'account' ),
			)
		);
		$this->assertSame( 'photo', $header['style'] );
		$this->assertSame( 'Tonight', $header['subtitle'] );
		$this->assertSame( 'https://shop.test/cover.jpg', $header['image_url'] );
		$this->assertFalse( $header['collapse'] );
		$this->assertSame( array( 'notifications', 'account' ), $header['buttons'] );
	}

	public function test_an_unknown_style_and_an_old_header_are_served_as_before() {
		$header = $this->header(
			array(
				'type'      => 'logo_center',
				'style'     => 'neon',
				'subtitle'  => 'x',
				'image_url' => 'https://shop.test/cover.jpg',
			)
		);
		$this->assertSame( 'logo_center', $header['type'] );
		$this->assertArrayNotHasKey( 'style', $header );
		$this->assertArrayNotHasKey( 'subtitle', $header );
		$this->assertArrayNotHasKey( 'image_url', $header );
		$this->assertArrayNotHasKey( 'collapse', $header );
	}

	public function test_keeps_the_system_screens_look() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'system' => array(
						'look'      => 'glass',
						'screens'   => array(
							'account' => 'classic',
							'sign_in' => 'photo',
							'lists'   => 'glass',
							'nope'    => 'brand',
							'code'    => 'neon',
						),
						'image_url' => 'https://shop.test/hero.jpg',
					),
				),
			)
		);
		$this->assertSame(
			array(
				'look'      => 'glass',
				'screens'   => array(
					'account' => 'classic',
					'sign_in' => 'photo',
				),
				'image_url' => 'https://shop.test/hero.jpg',
			),
			$screens['system']
		);
	}

	public function test_an_unknown_system_look_is_left_out() {
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => array( 'system' => array( 'look' => 'neon' ) ) ) ) );
	}
}
