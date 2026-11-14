<?php
/**
 * 130.61 A Studio photo in black and white on a WordPress site: a picture's,
 * a photo hero's and a parallax banner's `tone` reaches the app as the
 * contract says; any other value is left out.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioPhotoTone13061Test extends TestCase {

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

	public function test_keeps_the_photo_in_black_and_white() {
		$served = $this->served(
			array(
				array(
					'id'        => 'cover',
					'type'      => 'photo_hero',
					'image_url' => 'https://example.com/a.jpg',
					'tone'      => 'mono',
					'children'  => array(),
				),
				array(
					'id'        => 'odd',
					'type'      => 'image',
					'image_url' => 'https://example.com/b.jpg',
					'tone'      => 'sepia',
				),
			)
		);
		$this->assertSame( 'mono', $served[0]['tone'] );
		$this->assertArrayNotHasKey( 'tone', $served[1] );
	}
}
