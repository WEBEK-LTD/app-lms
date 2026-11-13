<?php
/**
 * 129.1 to 129.8 Studio's premium motion and media on a WordPress site: the
 * slider's looks, stories, a ticker, the video and parallax banners, a
 * gallery and before and after reach the app as the contract says.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Plugin;

class StudioPremiumMotion129Test extends TestCase {

	/**
	 * The page's elements served, in a language.
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

	public function test_keeps_the_slider_looks() {
		$served = $this->served(
			array(
				array(
					'id'        => 'hero',
					'type'      => 'slider',
					'indicator' => 'pill',
					'ken_burns' => true,
					'children'  => array(),
				),
				array(
					'id'        => 'odd',
					'type'      => 'slider',
					'indicator' => 'stars',
					'ken_burns' => 'yes',
					'children'  => array(),
				),
			)
		);
		$this->assertSame( 'pill', $served[0]['indicator'] );
		$this->assertTrue( $served[0]['ken_burns'] );
		$this->assertArrayNotHasKey( 'indicator', $served[1] );
		$this->assertArrayNotHasKey( 'ken_burns', $served[1] );
	}

	public function test_serves_the_stories_in_the_language_asked_for() {
		$stories = array(
			'id'          => 'st',
			'type'        => 'stories',
			'interval_ms' => 60000,
			'stories'     => array( 'size' => 300 ),
			'slides'      => array(
				array(
					'image_url'    => 'https://cdn.example.com/a.jpg',
					'heading'      => 'New',
					'subheading'   => 'This week',
					'action'       => array(
						'type' => 'url',
						'url'  => 'https://example.com/new',
					),
					'translations' => array( 'ar' => array( 'heading' => 'جديد' ) ),
				),
				array( 'heading' => '' ),
				'odd',
			),
		);
		$served  = $this->served( array( $stories, array( 'id' => 'none', 'type' => 'stories', 'slides' => array() ) ) );
		$this->assertCount( 1, $served );
		$this->assertSame( 15000, $served[0]['interval_ms'] );
		$this->assertSame( array( 'size' => 96 ), $served[0]['stories'] );
		$this->assertSame(
			array(
				'image_url'  => 'https://cdn.example.com/a.jpg',
				'heading'    => 'New',
				'subheading' => 'This week',
				'action'     => array(
					'type'    => 'url',
					'url'     => 'https://example.com/new',
					'open_in' => 'in_app',
				),
			),
			$served[0]['slides'][0]
		);
		$this->assertCount( 1, $served[0]['slides'] );
		$arabic = $this->served( array( $stories ), 'ar' );
		$this->assertSame( 'جديد', $arabic[0]['slides'][0]['heading'] );
		$this->assertArrayNotHasKey( 'translations', $arabic[0]['slides'][0] );
	}

	public function test_serves_the_banners_with_what_lies_over_them() {
		$served = $this->served(
			array(
				array(
					'id'        => 'vid',
					'type'      => 'video_hero',
					'video_url' => 'https://cdn.example.com/loop.mp4',
					'image_url' => 'https://cdn.example.com/poster.jpg',
					'autoplay'  => true,
					'glass'     => true,
					'scrim'     => array(
						'color'  => '#000000',
						'from'   => 0.2,
						'middle' => 0.05,
						'at'     => 40,
						'to'     => 3,
					),
					'children'  => array(
						array(
							'id'   => 'vt',
							'type' => 'text',
							'text' => 'In motion',
						),
					),
				),
				array(
					'id'        => 'par',
					'type'      => 'parallax_banner',
					'image_url' => 'https://cdn.example.com/photo.jpg',
					'autoplay'  => true,
					'video_url' => 'http://cdn.example.com/plain.mp4',
					'parallax'  => array( 'speed' => 5 ),
					'scrim'     => array( 'color' => 'black' ),
					'children'  => array(),
				),
			)
		);
		$this->assertSame( 'https://cdn.example.com/loop.mp4', $served[0]['video_url'] );
		$this->assertSame( 'https://cdn.example.com/poster.jpg', $served[0]['image_url'] );
		$this->assertTrue( $served[0]['autoplay'] );
		$this->assertTrue( $served[0]['glass'] );
		$this->assertSame(
			array(
				'color'  => '#000000',
				'from'   => 0.2,
				'to'     => 1.0,
				'middle' => 0.05,
				'at'     => 40.0,
			),
			$served[0]['scrim']
		);
		$this->assertSame( 'In motion', $served[0]['children'][0]['text'] );
		$this->assertSame( array( 'speed' => 0.9 ), $served[1]['parallax'] );
		$this->assertArrayNotHasKey( 'autoplay', $served[1] );
		$this->assertArrayNotHasKey( 'scrim', $served[1] );
		$this->assertSame( array(), $served[1]['children'] );
	}

	public function test_serves_the_gallery_and_before_and_after() {
		$photo  = static function ( $name, $caption = null ) {
			return array_filter(
				array(
					'image_url' => 'https://cdn.example.com/' . $name . '.jpg',
					'caption'   => $caption,
				)
			);
		};
		$served = $this->served(
			array(
				array(
					'id'      => 'gal',
					'type'    => 'gallery',
					'columns' => 6,
					'gallery' => array(
						'layout'   => 'masonry',
						'radius'   => 90,
						'captions' => true,
					),
					'images'  => array( $photo( 'one', 'Garden' ), $photo( 'two' ) ),
				),
				array(
					'id'      => 'odd',
					'type'    => 'gallery',
					'gallery' => array( 'layout' => 'carousel' ),
					'images'  => array( $photo( 'one' ) ),
				),
				array(
					'id'      => 'ba',
					'type'    => 'before_after',
					'compare' => array( 'at' => 3 ),
					'images'  => array( $photo( 'b', 'Before' ), $photo( 'a', 'After' ), $photo( 'x' ) ),
				),
				array(
					'id'     => 'half',
					'type'   => 'before_after',
					'images' => array( $photo( 'b' ) ),
				),
			)
		);
		$this->assertSame( array( 'gal', 'ba' ), array_column( $served, 'id' ) );
		$this->assertSame(
			array(
				'layout'   => 'masonry',
				'radius'   => 40,
				'captions' => true,
			),
			$served[0]['gallery']
		);
		$this->assertSame( 3, $served[0]['columns'] );
		$this->assertSame( array( $photo( 'one', 'Garden' ), $photo( 'two' ) ), $served[0]['images'] );
		$this->assertSame( array( 'at' => 5 ), $served[1]['compare'] );
		$this->assertSame( array( $photo( 'b', 'Before' ), $photo( 'a', 'After' ) ), $served[1]['images'] );
	}

	public function test_serves_the_ticker_with_its_words_and_pictures() {
		$ticker = array(
			'id'           => 'tick',
			'type'         => 'marquee',
			'text'         => "Free delivery\nNew",
			'translations' => array( 'ar' => array( 'text' => "توصيل مجاني\nجديد" ) ),
			'icon'         => 'star',
			'images'       => array(
				array(
					'image_url'    => 'https://cdn.example.com/logo.png',
					'caption'      => 'Logo',
					'translations' => array( 'ar' => array( 'caption' => 'الشعار' ) ),
				),
				array( 'image_url' => 'http://cdn.example.com/plain.png' ),
			),
			'marquee'      => array(
				'speed'          => 900,
				'direction'      => 'end',
				'pause_on_press' => false,
				'size'           => 'big',
			),
		);
		$served = $this->served( array( $ticker, array( 'id' => 'empty', 'type' => 'marquee' ) ) );
		$this->assertCount( 1, $served );
		$this->assertSame( "Free delivery\nNew", $served[0]['text'] );
		$this->assertSame( 'star', $served[0]['icon'] );
		$this->assertSame(
			array(
				array(
					'image_url' => 'https://cdn.example.com/logo.png',
					'caption'   => 'Logo',
				),
			),
			$served[0]['images']
		);
		$this->assertSame(
			array(
				'speed'          => 200,
				'direction'      => 'end',
				'pause_on_press' => false,
			),
			$served[0]['marquee']
		);
		$arabic = $this->served( array( $ticker ), 'ar' );
		$this->assertSame( "توصيل مجاني\nجديد", $arabic[0]['text'] );
		$this->assertSame( 'الشعار', $arabic[0]['images'][0]['caption'] );
	}
}
