<?php
/**
 * 121 A Yallapp Studio project's sign-in screen and account menu, from the license check.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Studio_Screens;

class StudioScreens121Test extends TestCase {

	public function test_keeps_the_sign_in_screen_and_the_menu_as_designed() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'sign_in'      => array(
						'style'     => 'photo',
						'image_url' => 'https://yallapp.test/m/hero.jpg',
						'title'     => array(
							'en' => ' Welcome back ',
							'ar' => 'أهلا بعودتك',
						),
						'subtitle'  => array( 'en' => 'Sign in to keep learning.' ),
						'show_logo' => false,
					),
					'account_menu' => array(
						'header' => 'night',
						'accent' => '#d9b36c',
						'items'  => array(
							array(
								'key'    => 'certificates',
								'hidden' => false,
								'label'  => array( 'en' => 'My certificates' ),
								'icon'   => 'workspace_premium',
							),
							array(
								'key'    => 'link',
								'hidden' => false,
								'label'  => array( 'en' => 'Our blog' ),
								'icon'   => null,
								'url'    => 'https://academy.test/blog',
							),
						),
					),
				),
			)
		);
		$this->assertSame( 'photo', $screens['sign_in']['style'] );
		$this->assertSame( 'https://yallapp.test/m/hero.jpg', $screens['sign_in']['image_url'] );
		$this->assertSame(
			array(
				'en' => 'Welcome back',
				'ar' => 'أهلا بعودتك',
			),
			$screens['sign_in']['title']
		);
		$this->assertFalse( $screens['sign_in']['show_logo'] );
		$this->assertSame( 'night', $screens['account_menu']['header'] );
		$this->assertSame( '#D9B36C', $screens['account_menu']['accent'] );
		$this->assertSame( array( 'certificates', 'link' ), array_column( $screens['account_menu']['items'], 'key' ) );
		$this->assertSame( 'https://academy.test/blog', $screens['account_menu']['items'][1]['url'] );
	}

	public function test_leaves_out_what_isnt_well_formed_and_sends_nothing_without_screens() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'sign_in'      => array(
						'style'     => 'hologram',
						'image_url' => 'https://x.test/a.jpg',
					),
					'account_menu' => array(
						'header' => 'cover',
						'accent' => 'gold',
						'items'  => array(
							array( 'key' => 'teleport' ),
							array(
								'key' => 'link',
								'url' => 'javascript:alert(1)',
							),
							array(
								'key'   => 'settings',
								'icon'  => '<b>',
								'label' => array( 'en' => '<script>x</script>Settings' ),
							),
						),
					),
				),
			)
		);
		$this->assertArrayNotHasKey( 'sign_in', $screens );
		$this->assertArrayNotHasKey( 'accent', $screens['account_menu'] );
		$this->assertSame( array( 'settings' ), array_column( $screens['account_menu']['items'], 'key' ) );
		$this->assertNull( $screens['account_menu']['items'][0]['icon'] );
		$this->assertStringNotContainsString( '<', $screens['account_menu']['items'][0]['label']['en'] );
		$this->assertNull( Studio_Screens::of_status( array() ) );
		// 122 The courses' card: known looks and facts only.
		$card = Studio_Screens::of_status(
			array(
				'screens' => array(
					'course_card' => array(
						'style'  => 'cover',
						'radius' => 20,
						'hide'   => array( 'lessons', 'teleport', 'lessons' ),
					),
				),
			)
		);
		$this->assertSame(
			array(
				'style'  => 'cover',
				'hide'   => array( 'lessons' ),
				'radius' => 20,
			),
			$card['course_card']
		);
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => array( 'course_card' => array( 'style' => 'hologram' ) ) ) ) );
		// 122 A course's page.
		$page = Studio_Screens::of_status(
			array(
				'screens' => array(
					'course_page' => array(
						'cover'     => 'full',
						'bar'       => 'neon',
						'first_tab' => 'curriculum',
						'hide'      => array( 'reviews', 'x' ),
					),
				),
			)
		);
		$this->assertSame(
			array(
				'cover'     => 'full',
				'bar'       => 'classic',
				'hide'      => array( 'reviews' ),
				'first_tab' => 'curriculum',
			),
			$page['course_page']
		);
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => 'none' ) ) );
		// 123 The screens' own looks: the known ones with their one look.
		$looks = Studio_Screens::of_status(
			array(
				'screens' => array(
					'course_card' => array( 'style' => 'premium' ),
					'looks'       => array(
						'catalog'    => 'explore',
						'my_courses' => 'premium',
						'lesson'     => 'neon',
						'teleport'   => 'premium',
					),
				),
			)
		);
		$this->assertSame( 'premium', $looks['course_card']['style'] );
		$this->assertSame(
			array(
				'catalog'    => 'explore',
				'my_courses' => 'premium',
			),
			$looks['looks']
		);
	}
}
