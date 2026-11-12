<?php
/**
 * 123 An academy's Studio pages: the greeting header and the student's own cards.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioLearning123Test extends TestCase {

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

	public function test_keeps_the_greeting_header_and_the_cards_it_knows() {
		$page = $this->served(
			array(
				'header' => array(
					'type'    => 'greeting',
					'buttons' => array( 'search', 'notifications' ),
				),
				'body'   => array(
					'id'       => 'root',
					'type'     => 'column',
					'children' => array(
						array(
							'id'       => 'go-on',
							'type'     => 'learning',
							'learning' => array( 'section' => 'continue' ),
							'radius'   => 30,
						),
						array(
							'id'       => 'streak',
							'type'     => 'learning',
							'learning' => array( 'section' => 'streak' ),
						),
						array(
							'id'       => 'unknown',
							'type'     => 'learning',
							'learning' => array( 'section' => 'horoscope' ),
						),
						array(
							'id'   => 'bare',
							'type' => 'learning',
						),
					),
				),
			)
		);
		$this->assertSame( 'greeting', $page['header']['type'] );
		$this->assertSame( array( 'search', 'notifications' ), $page['header']['buttons'] );
		$nodes = $page['body']['children'];
		$this->assertSame( array( 'go-on', 'streak' ), array_column( $nodes, 'id' ) );
		$this->assertSame( array( 'section' => 'continue' ), $nodes[0]['learning'] );
	}
}
