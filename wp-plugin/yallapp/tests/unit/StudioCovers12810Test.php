<?php
/**
 * 128.10 The Studio covers and live elements on a WordPress site: a photo hero and a
 * map header with what they hold, a scrim over a picture, a greeting, and the live
 * elements the app draws from the person's own data reach the app; bad ones don't.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioCovers12810Test extends TestCase {

	/**
	 * The page served.
	 *
	 * @param array $children The page's elements.
	 * @return array
	 */
	private function served( array $children ) {
		$plugin   = ( new ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
		$resolver = new Block_Resolver( $plugin );
		$page     = $resolver->studio(
			array(
				'header' => array( 'type' => 'transparent' ),
				'body'   => array(
					'id'       => 'root',
					'type'     => 'column',
					'children' => $children,
				),
			),
			'android',
			0,
			'en'
		);
		return $page['body']['children'];
	}

	public function test_serves_the_covers_with_what_they_hold() {
		$nodes = $this->served(
			array(
				array(
					'id'        => 'hero',
					'type'      => 'photo_hero',
					'image_url' => 'https://academy.test/hero.jpg',
					'height'    => 300,
					'scrim'     => array(
						'color'  => '#08182c',
						'from'   => 0.5,
						'middle' => 0.1,
						'at'     => 40,
						'to'     => 0.85,
					),
					'overlap'   => 56,
					'children'  => array(
						array(
							'id'   => 'hi',
							'type' => 'greeting',
						),
						array(
							'id'   => 'words',
							'type' => 'text',
							'text' => 'Real teachers.',
						),
					),
				),
				array(
					'id'              => 'map',
					'type'            => 'map_header',
					'background'      => '#ECE8DF',
					'dark_background' => '#151B2B',
					'overlap'         => 900,
					'map_drawing'     => array(
						'markers' => array(
							array(
								'x' => 15.24,
								'y' => 140,
							),
							array( 'x' => 'far' ),
						),
						'icon'    => 'local_taxi',
						'accent'  => '#F5B700',
						'chip'    => 'navy',
						'me'      => true,
						'live'    => 'yes',
					),
					'children'        => array(
						array(
							'id'   => 'sheet',
							'type' => 'column',
						),
					),
				),
				array(
					'id'                   => 'photo',
					'type'                 => 'stack',
					'image_background_url' => 'https://academy.test/library.jpg',
					'scrim'                => array(
						'color' => '#0E221B',
						'from'  => 0.2,
						'to'    => 0.9,
						'angle' => 180,
					),
				),
			)
		);
		$this->assertSame( array( 'hero', 'map', 'photo' ), array_column( $nodes, 'id' ) );
		$hero = $nodes[0];
		$this->assertSame( 'https://academy.test/hero.jpg', $hero['image_url'] );
		$this->assertSame(
			array(
				'color'  => '#08182C',
				'from'   => 0.5,
				'to'     => 0.85,
				'middle' => 0.1,
				'at'     => 40.0,
			),
			$hero['scrim']
		);
		$this->assertSame( 56, $hero['overlap'] );
		$this->assertSame( array( 'greeting', 'text' ), array_column( $hero['children'], 'type' ) );
		$map = $nodes[1];
		$this->assertSame( 400, $map['overlap'] );
		$this->assertSame( '#151B2B', $map['dark_background'] );
		$this->assertSame(
			array(
				'markers' => array(
					array(
						'x' => 15.2,
						'y' => 100.0,
					),
				),
				'icon'    => 'local_taxi',
				'accent'  => '#F5B700',
				'me'      => true,
			),
			$map['map_drawing']
		);
		$this->assertSame( array( 'sheet' ), array_column( $map['children'], 'id' ) );
		// The default angle isn't sent.
		$this->assertSame(
			array(
				'color' => '#0E221B',
				'from'  => 0.2,
				'to'    => 0.9,
			),
			$nodes[2]['scrim']
		);
	}

	public function test_serves_the_live_elements_and_leaves_out_bad_ones() {
		$nodes = $this->served(
			array(
				array(
					'id'       => 'ride',
					'type'     => 'tracking',
					'tracking' => array(
						'kind'  => 'ride',
						'style' => 'driver',
					),
				),
				array(
					'id'       => 'parcel',
					'type'     => 'tracking',
					'tracking' => array(
						'kind'  => 'shipment',
						'style' => 'card',
					),
				),
				array(
					'id'       => 'nothing',
					'type'     => 'tracking',
					'tracking' => array( 'kind' => 'pizza' ),
				),
				array(
					'id'          => 'order',
					'type'        => 'live_status',
					'live_status' => array( 'source' => 'food_order' ),
				),
				array(
					'id'          => 'lost',
					'type'        => 'live_status',
					'live_status' => array( 'source' => 'mail' ),
				),
				array(
					'id'     => 'today',
					'type'   => 'school',
					'school' => array( 'section' => 'today' ),
				),
				array(
					'id'     => 'term',
					'type'   => 'school',
					'school' => array( 'section' => 'term' ),
				),
				array(
					'id'    => 'flat',
					'type'  => 'image',
					'image_url' => 'https://academy.test/a.jpg',
					'scrim' => array(
						'color' => '#000000',
						'from'  => 0,
						'to'    => 0,
					),
				),
				array(
					'id'    => 'odd',
					'type'  => 'image',
					'image_url' => 'https://academy.test/b.jpg',
					'scrim' => array(
						'color' => '#000000',
						'from'  => 2,
						'to'    => 0.5,
					),
				),
			)
		);
		$this->assertSame( array( 'ride', 'parcel', 'order', 'today', 'flat', 'odd' ), array_column( $nodes, 'id' ) );
		$this->assertSame(
			array(
				'kind'  => 'ride',
				'style' => 'driver',
			),
			$nodes[0]['tracking']
		);
		// The card is the default look.
		$this->assertSame( array( 'kind' => 'shipment' ), $nodes[1]['tracking'] );
		$this->assertSame( array( 'source' => 'food_order' ), $nodes[2]['live_status'] );
		$this->assertSame( array( 'section' => 'today' ), $nodes[3]['school'] );
		// A shade of nothing, or out of bounds: the picture without one.
		$this->assertArrayNotHasKey( 'scrim', $nodes[4] );
		$this->assertArrayNotHasKey( 'scrim', $nodes[5] );
	}
}
