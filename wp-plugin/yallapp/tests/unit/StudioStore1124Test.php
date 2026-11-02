<?php
/**
 * 112.4 A store's Studio pages: a coupon's code, a slider's way of showing where it
 * is, spots on a picture, how categories look and products seen lately.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioStore1124Test extends TestCase {

	/**
	 * The page served, its body's elements.
	 *
	 * @param array[] $children Elements of the page's body.
	 * @return array[]
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

	public function test_a_coupon_keeps_a_code_of_letters_and_numbers_only() {
		$nodes = $this->served(
			array(
				array(
					'id'   => 'ok',
					'type' => 'coupon',
					'code' => ' WELCOME15 ',
				),
				array(
					'id'   => 'arabic',
					'type' => 'coupon',
					'code' => 'خصم10',
				),
				array(
					'id'   => 'spaces',
					'type' => 'coupon',
					'code' => 'TWO WORDS',
				),
				array(
					'id'   => 'none',
					'type' => 'coupon',
				),
			)
		);
		$this->assertSame( array( 'ok', 'arabic' ), array_column( $nodes, 'id' ) );
		$this->assertSame( 'WELCOME15', $nodes[0]['code'] );
		$this->assertSame( 'خصم10', $nodes[1]['code'] );
	}

	public function test_a_slider_keeps_how_it_shows_where_it_is_and_its_shape() {
		$nodes = $this->served(
			array(
				array(
					'id'           => 'hero',
					'type'         => 'slider',
					'indicator'    => 'progress',
					'aspect_ratio' => 0.8,
					'autoplay'     => true,
					'children'     => array(),
				),
				array(
					'id'        => 'other',
					'type'      => 'slider',
					'indicator' => 'stars',
					'children'  => array(),
				),
			)
		);
		$this->assertSame( 'progress', $nodes[0]['indicator'] );
		$this->assertEquals( 0.8, $nodes[0]['aspect_ratio'] );
		$this->assertArrayNotHasKey( 'indicator', $nodes[1] );
	}

	public function test_a_spot_on_a_picture_keeps_its_place_in_percent() {
		$nodes = $this->served(
			array(
				array(
					'id'       => 'look',
					'type'     => 'stack',
					'children' => array(
						array(
							'id'    => 'spot',
							'type'  => 'icon',
							'icon'  => 'add',
							'place' => array(
								'x' => 50.04,
								'y' => 140,
							),
						),
					),
				),
			)
		);
		$this->assertEquals(
			array(
				'x' => 50,
				'y' => 100,
			),
			$nodes[0]['children'][0]['place']
		);
	}

	public function test_products_seen_lately_are_left_out_without_a_shop() {
		$nodes = $this->served(
			array(
				array(
					'id'     => 'seen',
					'type'   => 'items',
					'source' => 'products',
					'recent' => true,
					'query'  => array( 'limit' => 10 ),
				),
				array(
					'id'   => 'after',
					'type' => 'text',
					'text' => 'After',
				),
			)
		);
		$this->assertSame( array( 'after' ), array_column( $nodes, 'id' ) );
	}
}
