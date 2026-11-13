<?php
/**
 * 124.15 The launch screen chosen in Yallapp Studio, from the license check.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Studio_Screens;

class LaunchScreen12415Test extends TestCase {

	public function test_keeps_the_launch_screen_as_designed() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'launch' => array(
						'look'            => 'cinema',
						'background'      => array(
							'type'       => 'gradient',
							'from'       => '#112233',
							'to'         => '#aabbcc',
							'direction'  => 'radial',
							'text_color' => '#ffffff',
						),
						'background_dark' => array(
							'type'      => 'photo',
							'image_url' => 'https://yallapp.test/m/night.jpg',
							'overlay'   => 62,
						),
						'logo'            => 'picture',
						'logo_url'        => 'https://yallapp.test/m/mark.png',
						'logo_size'       => 'xl',
						'logo_shape'      => 'as_is',
						'title'           => array(
							'en' => ' Ufuq Academy ',
							'ar' => 'أكاديمية أفق',
						),
						'subtitle'        => array( 'en' => 'Learn what changes your path.' ),
						'loader'          => 'none',
						'theme'           => 'dark',
						'main_color'      => '#1d2b4f',
						'second_color'    => '#B8893A',
					),
				),
			)
		);
		$launch = $screens['launch'];
		$this->assertSame( 'cinema', $launch['look'] );
		$this->assertSame(
			array(
				'type'       => 'gradient',
				'color'      => null,
				'from'       => '#112233',
				'to'         => '#AABBCC',
				'direction'  => 'radial',
				'image_url'  => null,
				'overlay'    => null,
				'text_color' => '#FFFFFF',
			),
			$launch['background']
		);
		$this->assertSame( 'photo', $launch['background_dark']['type'] );
		$this->assertSame( 'https://yallapp.test/m/night.jpg', $launch['background_dark']['image_url'] );
		$this->assertSame( 62, $launch['background_dark']['overlay'] );
		$this->assertSame( 'picture', $launch['logo'] );
		$this->assertSame( 'https://yallapp.test/m/mark.png', $launch['logo_url'] );
		$this->assertSame( 'xl', $launch['logo_size'] );
		$this->assertSame( 'as_is', $launch['logo_shape'] );
		$this->assertSame(
			array(
				'en' => 'Ufuq Academy',
				'ar' => 'أكاديمية أفق',
			),
			$launch['title']
		);
		$this->assertSame( 'none', $launch['loader'] );
		$this->assertSame( 'dark', $launch['theme'] );
		$this->assertSame( '#1D2B4F', $launch['main_color'] );
		$this->assertSame( '#B8893A', $launch['second_color'] );
	}

	public function test_unknown_values_become_the_looks_own_and_bad_ones_are_left_out() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'launch' => array(
						'look'            => 'editorial',
						'background'      => array(
							'type'       => 'video',
							'color'      => 'red',
							'direction'  => 'spiral',
							'image_url'  => 'http://insecure.test/a.jpg',
							'overlay'    => 95,
							'text_color' => '#12345',
						),
						'background_dark' => 'dark',
						'logo'            => 'picture',
						'logo_url'        => 'javascript:alert(1)',
						'logo_size'       => 'huge',
						'logo_shape'      => 'star',
						'title'           => array( 'en' => str_repeat( 'x', 60 ) ),
						'subtitle'        => array( 'en' => '<b>Hi</b>' ),
						'loader'          => 'spinner',
						'theme'           => 'sepia',
						'main_color'      => 'navy',
					),
				),
			)
		);
		$launch = $screens['launch'];
		$this->assertSame( 'photo', $launch['background']['type'] );
		$this->assertNull( $launch['background']['color'] );
		$this->assertSame( 'diagonal', $launch['background']['direction'] );
		$this->assertNull( $launch['background']['image_url'] );
		$this->assertNull( $launch['background']['overlay'] );
		$this->assertNull( $launch['background']['text_color'] );
		$this->assertNull( $launch['background_dark'] );
		// A picture without an address shows the logo.
		$this->assertSame( 'logo', $launch['logo'] );
		$this->assertNull( $launch['logo_url'] );
		$this->assertSame( 'l', $launch['logo_size'] );
		$this->assertSame( 'rounded', $launch['logo_shape'] );
		$this->assertSame( 40, mb_strlen( $launch['title']['en'] ) );
		$this->assertSame( 'Hi', $launch['subtitle']['en'] );
		$this->assertSame( 'steps', $launch['loader'] );
		$this->assertSame( 'system', $launch['theme'] );
		$this->assertNull( $launch['main_color'] );
	}

	public function test_each_look_has_its_own_loading_sign_and_an_unknown_look_is_left_out() {
		foreach ( array(
			'signature' => 'bar',
			'cinema'    => 'bar',
			'aurora'    => 'dots',
			'editorial' => 'steps',
			'monogram'  => 'ring',
		) as $look => $loader ) {
			$screens = Studio_Screens::of_status( array( 'screens' => array( 'launch' => array( 'look' => $look ) ) ) );
			$this->assertSame( $loader, $screens['launch']['loader'] );
			$this->assertSame( in_array( $look, array( 'cinema', 'editorial' ), true ) ? 'photo' : 'color', $screens['launch']['background']['type'] );
		}
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => array( 'launch' => array( 'look' => 'vapor' ) ) ) ) );
	}
}
