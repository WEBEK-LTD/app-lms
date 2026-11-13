<?php
/**
 * 129.21–129.24 A map header's premium looks on a WordPress site: its style and markers'
 * look, the person's dot, labelled pins, words on the map and a route reach the app with
 * known parts only; a map without them is served as before.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioMapLooks12921Test extends TestCase {

	/**
	 * The map served.
	 *
	 * @param array $drawing The map's drawing.
	 * @return array
	 */
	private function served( array $drawing ) {
		$plugin   = ( new ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
		$resolver = new Block_Resolver( $plugin );
		$page     = $resolver->studio(
			array(
				'body' => array(
					'id'       => 'root',
					'type'     => 'column',
					'children' => array(
						array(
							'id'          => 'map',
							'type'        => 'map_header',
							'map_drawing' => $drawing,
						),
					),
				),
			),
			'android',
			0,
			'en'
		);
		return $page['body']['children'][0]['map_drawing'] ?? array();
	}

	public function test_serves_the_premium_looks_with_known_parts() {
		$drawing = $this->served(
			array(
				'style'   => 'two_ink',
				'marker'  => 'sign',
				'sign'    => 'TAXI CAB 2000',
				'me_at'   => array(
					'x' => 140,
					'y' => 40.04,
				),
				'places'  => array(
					array(
						'x'     => 20,
						'y'     => 30,
						'label' => ' Home ',
						'icon'  => 'home',
					),
					array(
						'x'     => 20,
						'y'     => 30,
						'label' => '',
					),
				),
				'labels'  => array(
					array(
						'x'    => 10,
						'y'    => 90,
						'text' => '<b>Maadi</b>',
					),
				),
				'route'   => array(
					'points'     => array(
						array(
							'x' => 80,
							'y' => 30,
						),
						array(
							'x' => 40,
							'y' => 60,
						),
					),
					'at'         => 140,
					'eta'        => '3 min',
					'color'      => '#0f766c',
					'dark_color' => 'teal',
					'moving'     => true,
					'live'       => 'ride',
				),
				'unknown' => 'x',
			)
		);
		$this->assertSame( 'two_ink', $drawing['style'] );
		$this->assertSame( 'sign', $drawing['marker'] );
		$this->assertSame( 'TAXI CAB', $drawing['sign'] );
		$this->assertSame(
			array(
				'x' => 100.0,
				'y' => 40.0,
			),
			$drawing['me_at']
		);
		$this->assertCount( 1, $drawing['places'] );
		$this->assertSame( 'Home', $drawing['places'][0]['label'] );
		$this->assertSame( 'home', $drawing['places'][0]['icon'] );
		$this->assertSame( 'Maadi', $drawing['labels'][0]['text'] );
		$this->assertSame( 100.0, $drawing['route']['at'] );
		$this->assertSame( '#0F766C', $drawing['route']['color'] );
		$this->assertArrayNotHasKey( 'dark_color', $drawing['route'] );
		$this->assertTrue( $drawing['route']['moving'] );
		$this->assertSame( 'ride', $drawing['route']['live'] );
		$this->assertArrayNotHasKey( 'unknown', $drawing );
	}

	public function test_leaves_out_unknown_looks_and_short_routes() {
		$drawing = $this->served(
			array(
				'markers' => array(
					array(
						'x' => 10,
						'y' => 20,
					),
				),
				'style'   => 'satellite',
				'marker'  => 'balloon',
				'route'   => array(
					'points' => array(
						array(
							'x' => 10,
							'y' => 20,
						),
					),
				),
			)
		);
		$this->assertSame(
			array(
				'markers' => array(
					array(
						'x' => 10.0,
						'y' => 20.0,
					),
				),
			),
			$drawing
		);
	}
}
