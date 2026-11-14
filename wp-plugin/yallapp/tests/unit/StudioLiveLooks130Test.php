<?php
/**
 * 130 The live cards' premium looks on a WordPress site: a live order and a live
 * shipment in their hero, ring, pill or steps looks reach the app with their accent
 * by day and by night; a look or an accent the app doesn't know is left out.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioLiveLooks130Test extends TestCase {

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
				'body' => array(
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

	public function test_serves_the_live_looks_with_their_accent() {
		$nodes = $this->served(
			array(
				array(
					'id'          => 'order',
					'type'        => 'live_status',
					'live_status' => array(
						'source'      => 'food_order',
						'style'       => 'ring',
						'accent'      => '#f4b63f',
						'dark_accent' => '#F4B63F',
					),
				),
				array(
					'id'       => 'parcel',
					'type'     => 'tracking',
					'tracking' => array(
						'kind'   => 'shipment',
						'style'  => 'steps',
						'accent' => '#1F6FB2',
					),
				),
				array(
					'id'          => 'odd',
					'type'        => 'live_status',
					'live_status' => array(
						'source' => 'market_order',
						'style'  => 'spinning',
						'accent' => 'orange',
					),
				),
			)
		);
		$this->assertSame(
			array(
				'source'      => 'food_order',
				'style'       => 'ring',
				'accent'      => '#F4B63F',
				'dark_accent' => '#F4B63F',
			),
			$nodes[0]['live_status']
		);
		$this->assertSame(
			array(
				'kind'   => 'shipment',
				'style'  => 'steps',
				'accent' => '#1F6FB2',
			),
			$nodes[1]['tracking']
		);
		$this->assertSame( array( 'source' => 'market_order' ), $nodes[2]['live_status'] );
	}
}
