<?php
/**
 * 159 Sizes set by hand in Studio reach the app: an element's `manual_size` (the
 * automatic sizes a size by hand replaced) is served with it, so the app keeps the
 * owner's width for a cover's top bar sized by hand, and spans the cover with one
 * that isn't. Bad values are none; an element without it is served as before.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioAutoSize159Test extends TestCase {

	/**
	 * The page's elements as served.
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

	public function test_serves_a_size_set_by_hand_with_the_automatic_one_it_replaced() {
		$nodes = $this->served(
			array(
				array(
					'id'          => 'top',
					'type'        => 'row',
					'width'       => 324,
					'height'      => 68,
					'manual_size' => array(
						'width'  => 'fill',
						'height' => 68,
					),
				),
				array(
					'id'          => 'word',
					'type'        => 'text',
					'text'        => 'KechFlora',
					'width'       => 'hug',
					'manual_size' => array(
						'width'  => 'wide',
						'height' => '12',
					),
				),
				array(
					'id'    => 'plain',
					'type'  => 'text',
					'text'  => 'Same day',
					'width' => 120,
				),
			)
		);
		$this->assertSame( 324.0, $nodes[0]['width'] );
		$this->assertSame(
			array(
				'width'  => 'fill',
				'height' => 68.0,
			),
			$nodes[0]['manual_size']
		);
		// What isn't a size is none.
		$this->assertSame(
			array(
				'width'  => null,
				'height' => null,
			),
			$nodes[1]['manual_size']
		);
		// Automatic, as before: nothing more.
		$this->assertArrayNotHasKey( 'manual_size', $nodes[2] );
		$this->assertSame( 120.0, $nodes[2]['width'] );
	}

}
