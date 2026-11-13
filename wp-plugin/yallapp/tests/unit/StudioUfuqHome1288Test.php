<?php
/**
 * 128.8 The premium academy's approved home on a WordPress site: the student's
 * cards on a photo, a card's rating and a border by night reach the app.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioUfuqHome1288Test extends TestCase {

	/**
	 * The page served.
	 *
	 * @param array $page The Studio page.
	 * @return array
	 */
	private function served( array $page ) {
		$plugin   = ( new ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
		$resolver = new Block_Resolver( $plugin );
		return $resolver->studio( $page, 'android', 0, 'en' );
	}

	public function test_keeps_the_photo_look_the_rating_and_the_border_by_night() {
		$page  = $this->served(
			array(
				'header' => array( 'type' => 'greeting' ),
				'body'   => array(
					'id'       => 'root',
					'type'     => 'column',
					'children' => array(
						array(
							'id'       => 'go-on',
							'type'     => 'learning',
							'learning' => array(
								'section' => 'continue',
								'style'   => 'photo',
							),
						),
						array(
							'id'       => 'odd',
							'type'     => 'learning',
							'learning' => array(
								'section' => 'streak',
								'style'   => 'neon',
							),
						),
						array(
							'id'                => 'streak',
							'type'              => 'text',
							'text'              => '·',
							'bind'              => 'rating',
							'border_color'      => '#E3DFD6',
							'dark_border_color' => '#262D48',
							'border_width'      => 1,
						),
					),
				),
			)
		);
		$nodes = $page['body']['children'];
		$this->assertSame(
			array(
				'section' => 'continue',
				'style'   => 'photo',
			),
			$nodes[0]['learning']
		);
		// A look it doesn't know: the card as before.
		$this->assertSame( array( 'section' => 'streak' ), $nodes[1]['learning'] );
		$this->assertSame( 'rating', $nodes[2]['bind'] );
		$this->assertSame( '#262D48', $nodes[2]['dark_border_color'] );
	}
}
