<?php
/**
 * 130.18 The student's cards on a WordPress site: the gold ring and this
 * week's days under a streak reach the app as the contract says; anything
 * else is left out.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioLearningRing13018Test extends TestCase {

	/**
	 * The page's elements served.
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

	public function test_keeps_the_ring_and_the_week_days() {
		$served = $this->served(
			array(
				array(
					'id'       => 'ring',
					'type'     => 'learning',
					'learning' => array(
						'section' => 'continue',
						'style'   => 'ring',
					),
				),
				array(
					'id'       => 'streak',
					'type'     => 'learning',
					'learning' => array(
						'section' => 'streak',
						'style'   => 'photo',
						'days'    => 'letters',
					),
				),
				array(
					'id'       => 'pills',
					'type'     => 'learning',
					'learning' => array(
						'section' => 'streak',
						'days'    => 'pills',
					),
				),
			)
		);
		$this->assertSame(
			array(
				'section' => 'continue',
				'style'   => 'ring',
			),
			$served[0]['learning']
		);
		$this->assertSame(
			array(
				'section' => 'streak',
				'style'   => 'photo',
				'days'    => 'letters',
			),
			$served[1]['learning']
		);
		$this->assertSame( 'pills', $served[2]['learning']['days'] );
	}

	public function test_leaves_out_what_it_doesnt_know() {
		$served = $this->served(
			array(
				array(
					'id'       => 'odd',
					'type'     => 'learning',
					'learning' => array(
						'section' => 'streak',
						'style'   => 'halo',
						'days'    => 'stars',
					),
				),
			)
		);
		$this->assertSame( array( 'section' => 'streak' ), $served[0]['learning'] );
	}
}
