<?php
/**
 * 130.52 Studio's course screens on a WordPress site: the look and each course screen's
 * options reach the app from the license check as the contract says; anything else is left
 * out, and the Studio pages around the course screens keep their screen.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Pages\Studio_Screens;
use Yallapp\Plugin;

class StudioCourseScreens13052Test extends TestCase {

	public function test_keeps_the_look_and_every_screens_options() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'courses' => array(
						'look'       => 'index',
						'accent'     => '#b8893a',
						'card'       => array(
							'layout' => 'poster',
							'ratio'  => 'tall',
							'scrim'  => 65,
							'radius' => 18,
							'hide'   => array( 'price', 'progress' ),
						),
						'page'       => array(
							'hero' => 'split',
							'bar'  => 'floating',
							'hide' => array( 'about' ),
							'cta'  => array(
								'en' => ' Join the class ',
								'ar' => 'انضم إلى الصف',
							),
						),
						'lesson'     => array(
							'player'   => 'framed',
							'progress' => 'segments',
							'hide'     => array( 'up_next' ),
						),
						'my_courses' => array(
							'layout'   => 'grid',
							'progress' => 'rings',
							'hide'     => array( 'week' ),
							'headline' => array( 'en' => 'Pick up where you left off.' ),
						),
					),
				),
			)
		);
		$courses = $screens['courses'];
		$this->assertSame( 'index', $courses['look'] );
		$this->assertSame( '#B8893A', $courses['accent'] );
		$this->assertSame(
			array(
				'layout' => 'poster',
				'ratio'  => 'tall',
				'hide'   => array( 'price', 'progress' ),
				'scrim'  => 65,
				'radius' => 18,
			),
			$courses['card']
		);
		$this->assertSame( 'split', $courses['page']['hero'] );
		$this->assertSame( 'floating', $courses['page']['bar'] );
		$this->assertSame( array( 'about' ), $courses['page']['hide'] );
		$this->assertSame(
			array(
				'en' => 'Join the class',
				'ar' => 'انضم إلى الصف',
			),
			$courses['page']['cta']
		);
		$this->assertSame(
			array(
				'player'   => 'framed',
				'progress' => 'segments',
				'hide'     => array( 'up_next' ),
			),
			$courses['lesson']
		);
		$this->assertSame( 'grid', $courses['my_courses']['layout'] );
		$this->assertSame( array( 'week' ), $courses['my_courses']['hide'] );
		$this->assertSame( array( 'en' => 'Pick up where you left off.' ), $courses['my_courses']['headline'] );
	}

	public function test_leaves_out_what_the_app_does_not_know() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'courses' => array(
						'look'   => 'cinema',
						'accent' => 'gold',
						'card'   => array(
							'layout' => 'carousel',
							'scrim'  => 120,
							'radius' => '12',
							'hide'   => array( 'teacher', 'sparkles' ),
						),
						'lesson' => 'framed',
						'page'   => array(
							'bar' => 'sticky',
							'cta' => array( 'en' => str_repeat( 'x', 40 ) ),
						),
					),
				),
			)
		);
		$courses = $screens['courses'];
		$this->assertSame( 'cinema', $courses['look'] );
		$this->assertArrayNotHasKey( 'accent', $courses );
		$this->assertSame( array( 'hide' => array( 'teacher' ) ), $courses['card'] );
		$this->assertArrayNotHasKey( 'lesson', $courses );
		$this->assertArrayNotHasKey( 'bar', $courses['page'] );
		$this->assertSame( 24, mb_strlen( $courses['page']['cta']['en'] ) );
	}

	public function test_an_unknown_look_leaves_the_screens_as_before() {
		$screens = Studio_Screens::of_status(
			array(
				'screens' => array(
					'courses'     => array( 'look' => 'neon' ),
					'course_card' => array(
						'style' => 'premium',
						'hide'  => array(),
					),
				),
			)
		);
		$this->assertArrayNotHasKey( 'courses', $screens );
		$this->assertSame( 'premium', $screens['course_card']['style'] );
		$this->assertNull( Studio_Screens::of_status( array( 'screens' => array( 'courses' => array( 'look' => 'neon' ) ) ) ) );
	}

	public function test_the_pages_around_the_course_screens_keep_their_screen() {
		$plugin   = ( new ReflectionClass( Plugin::class ) )->newInstanceWithoutConstructor();
		$resolver = new Block_Resolver( $plugin );
		foreach ( array( 'courses', 'course', 'lesson', 'my_courses' ) as $screen ) {
			$page = $resolver->studio(
				array(
					'screen' => $screen,
					'body'   => array(
						'id'       => 'root',
						'type'     => 'column',
						'children' => array(),
					),
				),
				'android',
				0,
				'en'
			);
			$this->assertSame( $screen, $page['screen'] );
		}
	}
}
