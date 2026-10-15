<?php
/**
 * 33 The page blocks whose content the owner writes: slider, quick links, testimonials,
 * questions, countdown, contact, opening hours, social links, team, numbers, notice.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Rich_Blocks;
use Yallapp\Pages\Translator;

class RichBlocksTest extends TestCase {

	const NOW = 1791800000; // 2026-10-12.

	/**
	 * Follows page and screen actions, like a site whose LMS opens courses only.
	 *
	 * @param mixed $raw Action.
	 * @return array|null
	 */
	public static function action( $raw ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		if ( 'page' === ( $raw['type'] ?? null ) ) {
			return array(
				'type'      => 'page',
				'page_slug' => $raw['page_slug'],
			);
		}
		if ( 'screen' === ( $raw['type'] ?? null ) && 'cart' !== ( $raw['screen'] ?? null ) ) {
			return array(
				'type'   => 'screen',
				'screen' => $raw['screen'],
			);
		}
		return null;
	}

	private function fields( $type, array $raw, $now = self::NOW ) {
		return Rich_Blocks::fields( $type, $raw, array( __CLASS__, 'action' ), $now );
	}

	public function test_handles_the_new_types_only() {
		$this->assertTrue( Rich_Blocks::handles( 'slider' ) );
		$this->assertTrue( Rich_Blocks::handles( 'notice' ) );
		$this->assertFalse( Rich_Blocks::handles( 'map' ) );
		$this->assertFalse( Rich_Blocks::handles( 'banner' ) );
		$this->assertNull( $this->fields( 'map', array() ) );
	}

	public function test_slider_keeps_slides_with_an_image_or_heading_and_actions_it_can_follow() {
		$fields = $this->fields(
			'slider',
			array(
				'slides' => array(
					array(
						'heading' => 'Autumn <b>sale</b>',
						'action'  => array(
							'type'      => 'page',
							'page_slug' => 'offers',
						),
					),
					array( 'image_url' => 'javascript:alert(1)' ),
					array(
						'image_url' => 'https://cdn.test/a.jpg',
						'action'    => array(
							'type'   => 'screen',
							'screen' => 'cart',
						),
					),
					'not an entry',
				),
			)
		);
		$this->assertTrue( $fields['auto_advance'] );
		$this->assertSame(
			array(
				array(
					'image_url'  => null,
					'heading'    => 'Autumn sale',
					'subheading' => null,
					'action'     => array(
						'type'      => 'page',
						'page_slug' => 'offers',
					),
				),
				array(
					'image_url'  => 'https://cdn.test/a.jpg',
					'heading'    => null,
					'subheading' => null,
				),
			),
			$fields['slides']
		);
		$this->assertNull( $this->fields( 'slider', array( 'slides' => array( array( 'heading' => '' ) ) ) ) );
		$this->assertFalse( $this->fields( 'slider', array( 'auto_advance' => false, 'slides' => array( array( 'heading' => 'x' ) ) ) )['auto_advance'] );
	}

	public function test_quick_links_drop_tiles_the_site_cannot_open() {
		$fields = $this->fields(
			'quick_links',
			array(
				'style' => 'row',
				'links' => array(
					array(
						'icon'   => 'school',
						'label'  => 'Courses',
						'action' => array(
							'type'   => 'screen',
							'screen' => 'courses',
						),
					),
					array(
						'icon'   => 'shopping_cart',
						'label'  => 'Cart',
						'action' => array(
							'type'   => 'screen',
							'screen' => 'cart',
						),
					),
					array(
						'icon'   => 'Bad Icon',
						'label'  => 'Bad',
						'action' => array(
							'type'   => 'screen',
							'screen' => 'courses',
						),
					),
				),
			)
		);
		$this->assertSame( 'row', $fields['style'] );
		$this->assertSame( array( 'Courses' ), array_column( $fields['links'], 'label' ) );
		$this->assertNull( $this->fields( 'quick_links', array( 'links' => array() ) ) );
	}

	public function test_testimonials_faq_team_and_numbers() {
		$quotes = $this->fields(
			'testimonials',
			array(
				'quotes' => array(
					array(
						'text'   => "Great\nteachers",
						'name'   => 'Leyla',
						'rating' => 9,
					),
					array( 'text' => 'No name' ),
				),
			)
		);
		$this->assertSame(
			array(
				array(
					'text'      => "Great\nteachers",
					'name'      => 'Leyla',
					'role'      => null,
					'photo_url' => null,
					'rating'    => null,
				),
			),
			$quotes['quotes']
		);
		$faq = $this->fields(
			'faq',
			array(
				'questions' => array(
					array(
						'question' => 'How?',
						'answer'   => "Line one\nLine two<script>x</script>",
					),
					array( 'question' => 'No answer' ),
				),
			)
		);
		$this->assertSame(
			array(
				array(
					'question' => 'How?',
					'answer'   => "Line one\nLine two",
				),
			),
			$faq['questions']
		);
		$team = $this->fields(
			'team',
			array(
				'layout' => 'sideways',
				'people' => array(
					array(
						'name'   => 'Dr. Aya',
						'role'   => 'Dentist',
						'action' => array( 'type' => 'course' ),
					),
				),
			)
		);
		$this->assertSame( 'carousel', $team['layout'] );
		$this->assertSame(
			array(
				'name'      => 'Dr. Aya',
				'role'      => 'Dentist',
				'bio'       => null,
				'photo_url' => null,
			),
			$team['people'][0]
		);
		$one = array(
			'value' => '12k+',
			'label' => 'Students',
		);
		$this->assertNull( $this->fields( 'stats', array( 'stats' => array( $one ) ) ) );
		$this->assertCount( 4, $this->fields( 'stats', array( 'stats' => array( $one, $one, $one, $one, $one ) ) )['stats'] );
	}

	public function test_countdown_hides_after_the_end_unless_it_says_so() {
		$raw = array(
			'heading' => 'Sale ends in',
			'ends_at' => '2026-12-01T18:00:00.000Z',
			'label'   => 'Shop',
			'action'  => array(
				'type'   => 'screen',
				'screen' => 'courses',
			),
		);
		$this->assertSame(
			array(
				'heading'    => 'Sale ends in',
				'subheading' => null,
				'ends_at'    => '2026-12-01T18:00:00Z',
				'ended_text' => null,
				'label'      => 'Shop',
				'action'     => array(
					'type'   => 'screen',
					'screen' => 'courses',
				),
			),
			$this->fields( 'countdown', $raw )
		);
		$after = strtotime( '2026-12-02T00:00:00Z' );
		$this->assertNull( $this->fields( 'countdown', $raw, $after ) );
		$this->assertSame( 'It ended.', $this->fields( 'countdown', $raw + array( 'ended_text' => 'It ended.' ), $after )['ended_text'] );
		$this->assertNull( $this->fields( 'countdown', array( 'heading' => 'x', 'ends_at' => 'someday' ) ) );
	}

	public function test_contact_keeps_valid_ways_only() {
		$fields = $this->fields(
			'contact',
			array(
				'phone'     => '+20 100 123 4567',
				'whatsapp'  => 'call me',
				'email'     => 'not-an-email',
				'website'   => 'https://nile.test',
				'address'   => '12 Road 9',
				'latitude'  => '30.0444',
				'longitude' => 200,
			)
		);
		$this->assertSame(
			array(
				'phone'     => '+20 100 123 4567',
				'whatsapp'  => null,
				'email'     => null,
				'website'   => 'https://nile.test',
				'address'   => '12 Road 9',
				'latitude'  => null,
				'longitude' => null,
			),
			$fields
		);
		$this->assertNull( $this->fields( 'contact', array( 'email' => 'nope' ) ) );
	}

	public function test_hours_monday_first_and_social_once_per_network() {
		$hours = $this->fields(
			'hours',
			array(
				'hours'        => array(
					array(
						'day'    => 'sat',
						'opens'  => '10:00',
						'closes' => '14:00',
					),
					array(
						'day'    => 'mon',
						'opens'  => '13:00',
						'closes' => '18:00',
					),
					array(
						'day'    => 'mon',
						'opens'  => '09:00',
						'closes' => '12:00',
					),
					array(
						'day'    => 'funday',
						'opens'  => '09:00',
						'closes' => '12:00',
					),
					array(
						'day'    => 'tue',
						'opens'  => '9am',
						'closes' => '12:00',
					),
				),
				'closed_dates' => array( '2026-12-31', 'soon', '2026-12-25', '2026-12-31' ),
			)
		);
		$this->assertSame( array( 'mon 09:00', 'mon 13:00', 'sat 10:00' ), array_map( function ( $h ) { return $h['day'] . ' ' . $h['opens']; }, $hours['hours'] ) ); // phpcs:ignore
		$this->assertSame( array( '2026-12-25', '2026-12-31' ), $hours['closed_dates'] );
		$this->assertNull( $this->fields( 'hours', array( 'hours' => array() ) ) );
		$social = $this->fields(
			'social',
			array(
				'profiles' => array(
					array(
						'network' => 'instagram',
						'url'     => 'https://instagram.com/nile',
					),
					array(
						'network' => 'instagram',
						'url'     => 'https://instagram.com/other',
					),
					array(
						'network' => 'myspace',
						'url'     => 'https://myspace.com/nile',
					),
					array(
						'network' => 'x',
						'url'     => 'http://x.com/nile',
					),
				),
			)
		);
		$this->assertSame(
			array(
				array(
					'network' => 'instagram',
					'url'     => 'https://instagram.com/nile',
				),
			),
			$social['profiles']
		);
	}

	public function test_notice_with_a_link_it_can_follow() {
		$this->assertSame(
			array(
				'tone' => 'info',
				'text' => 'Closed Friday.',
			),
			$this->fields(
				'notice',
				array(
					'tone'   => 'loud',
					'text'   => 'Closed Friday.',
					'label'  => 'Cart',
					'action' => array(
						'type'   => 'screen',
						'screen' => 'cart',
					),
				)
			)
		);
		$this->assertNull( $this->fields( 'notice', array( 'text' => '' ) ) );
	}

	public function test_entry_translations_are_applied_and_removed() {
		$block = Translator::apply(
			array(
				'id'           => 'n',
				'type'         => 'notice',
				'text'         => 'Closed Friday.',
				'translations' => array( 'ar' => array( 'text' => 'مغلق يوم الجمعة' ) ),
				'quotes'       => array(
					array(
						'text'         => 'Great',
						'name'         => 'Leyla',
						'translations' => array(
							'ar' => array(
								'text' => 'رائع',
								'name' => '',
								'html' => '<b>x</b>',
							),
						),
					),
				),
			),
			'ar'
		);
		$this->assertSame( 'مغلق يوم الجمعة', $block['text'] );
		$this->assertSame(
			array(
				'text' => 'رائع',
				'name' => 'Leyla',
			),
			$block['quotes'][0]
		);
		$this->assertArrayNotHasKey( 'translations', $block );
	}
}
