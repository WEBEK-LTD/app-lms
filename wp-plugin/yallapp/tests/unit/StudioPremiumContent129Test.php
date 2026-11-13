<?php
/**
 * 129.11–129.20 Studio's premium content, trust and commerce elements on a WordPress site:
 * their lists and options reach the app, known fields only, bounded, in the language asked
 * for; a layout's premium card style too.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioPremiumContent129Test extends TestCase {

	/**
	 * The page's elements served.
	 *
	 * @param array  $children The page's elements.
	 * @param string $language The language asked for.
	 * @return array
	 */
	private function served( array $children, $language = 'en' ) {
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
			$language
		);
		return $page['body']['children'];
	}

	public function test_keeps_the_lists_and_options_in_the_language_asked_for() {
		$nodes = $this->served(
			array(
				array(
					'id'           => 'quotes',
					'type'         => 'testimonials',
					'testimonials' => array(
						'style'   => 'stacked',
						'reviews' => array(
							'source' => 'courses',
							'id'     => '12',
						),
					),
					'entries'      => array(
						array(
							'text'         => 'Great',
							'title'        => 'Mona',
							'value'        => 9,
							'junk'         => 'x',
							'translations' => array( 'ar' => array( 'text' => 'رائع' ) ),
						),
					),
				),
				array(
					'id'      => 'plans',
					'type'    => 'pricing',
					'pricing' => array(
						'currency' => 'EGP',
						'yearly'   => true,
					),
					'entries' => array(
						array(
							'title'     => 'Gold pass',
							'price'     => 45000,
							'highlight' => true,
						),
						array(
							'title' => 'Free',
							'price' => 'a lot',
						),
					),
				),
				array(
					'id'    => 'b',
					'type'  => 'badge_text',
					'text'  => 'New',
					'badge' => array( 'style' => 'gradient' ),
				),
				array(
					'id'   => 'empty',
					'type' => 'stats',
				),
			),
			'ar'
		);
		$this->assertCount( 3, $nodes );
		$this->assertSame(
			array(
				'style'   => 'stacked',
				'reviews' => array(
					'source' => 'courses',
					'id'     => '12',
				),
			),
			$nodes[0]['testimonials']
		);
		$this->assertSame(
			array(
				'title' => 'Mona',
				'text'  => 'رائع',
				'value' => 5.0,
			),
			$nodes[0]['entries'][0]
		);
		$this->assertSame(
			array(
				'currency' => 'EGP',
				'yearly'   => true,
			),
			$nodes[1]['pricing']
		);
		$this->assertSame( 45000, $nodes[1]['entries'][0]['price'] );
		$this->assertTrue( $nodes[1]['entries'][0]['highlight'] );
		$this->assertArrayNotHasKey( 'price', $nodes[1]['entries'][1] );
		$this->assertSame( array( 'style' => 'gradient' ), $nodes[2]['badge'] );
	}

	public function test_keeps_a_profile_card_with_its_elements_and_a_card_style() {
		$nodes = $this->served(
			array(
				array(
					'id'       => 'card',
					'type'     => 'profile_card',
					'title'    => 'Salma',
					'text'     => 'Teacher',
					'profile'  => array(
						'shape'   => 'square',
						'socials' => array(
							array(
								'network' => 'instagram',
								'url'     => 'https://instagram.com/s',
							),
							array(
								'network' => 'instagram',
								'url'     => 'https://instagram.com/t',
							),
							array(
								'network' => 'myspace',
								'url'     => 'https://myspace.com/s',
							),
						),
					),
					'surface'  => array(
						'glass'  => 99,
						'border' => array(
							'from' => '#ffffff',
							'to'   => '#E8B04B',
						),
						'soft'   => 2,
					),
					'children' => array(
						array(
							'id'    => 'b1',
							'type'  => 'badge_text',
							'text'  => 'Top',
							'badge' => array( 'style' => 'neon' ),
						),
					),
				),
			)
		);
		$card = $nodes[0];
		$this->assertSame( 'Salma', $card['title'] );
		$this->assertSame(
			array(
				'shape'   => 'square',
				'socials' => array(
					array(
						'network' => 'instagram',
						'url'     => 'https://instagram.com/s',
					),
				),
			),
			$card['profile']
		);
		$this->assertSame(
			array(
				'glass'  => 40.0,
				'border' => array(
					'from'  => '#FFFFFF',
					'to'    => '#E8B04B',
					'width' => 1.5,
				),
				'soft'   => 2,
			),
			$card['surface']
		);
		// A look it doesn't know: a pill.
		$this->assertSame( array( 'style' => 'pill' ), $card['children'][0]['badge'] );
	}

	public function test_keeps_the_signature_options_bounded() {
		$nodes = $this->served(
			array(
				array(
					'id'       => 'ring',
					'type'     => 'progress',
					'progress' => array(
						'style' => 'rings',
						'size'  => 999,
						'ticks' => 18,
						'knob'  => true,
						'odd'   => 1,
					),
					'entries'  => array(
						array(
							'title' => 'Lesson',
							'value' => 61,
						),
					),
				),
				array(
					'id'       => 'day',
					'type'     => 'timeline',
					'timeline' => array(
						'times' => true,
						'card'  => true,
						'mono'  => 'yes',
					),
					'entries'  => array( array( 'title' => 'Maths' ) ),
				),
				array(
					'id'    => 'sign',
					'type'  => 'cta_bar',
					'text'  => 'Sign',
					'cta'   => array(
						'style' => 'card',
						'lead'  => 'draw',
					),
				),
				array(
					'id'       => 'pass',
					'type'     => 'column',
					'surface'  => array(
						'ticket'  => array( 'at' => 62 ),
						'pattern' => 'grain',
					),
					'children' => array(),
				),
			)
		);
		$this->assertSame(
			array(
				'style' => 'rings',
				'size'  => 320,
				'ticks' => 18,
				'knob'  => true,
			),
			$nodes[0]['progress']
		);
		$this->assertSame(
			array(
				'times' => true,
				'card'  => true,
			),
			$nodes[1]['timeline']
		);
		$this->assertSame(
			array(
				'style' => 'card',
				'lead'  => 'draw',
			),
			$nodes[2]['cta']
		);
		$this->assertSame(
			array(
				'ticket'           => array(
					'at'    => 62,
					'axis'  => 'horizontal',
					'notch' => 10,
				),
				'pattern'          => 'grain',
				'pattern_strength' => 0.08,
			),
			$nodes[3]['surface']
		);
	}
}
