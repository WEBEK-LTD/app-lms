<?php
/**
 * 99.4 The cards, gallery, map, divider and form blocks.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;
use Yallapp\Pages\Rich_Blocks;
use Yallapp\Pages\Translator;

class PageBlocks994Test extends TestCase {

	const NOW = 1793000000; // 2026-10-26.

	/**
	 * Follows page and screen actions, except the cart.
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

	private function fields( $type, array $raw ) {
		return Rich_Blocks::fields( $type, $raw, array( __CLASS__, 'action' ), self::NOW );
	}

	public function test_handles_the_new_types() {
		foreach ( array( 'cards', 'gallery', 'map', 'divider', 'form' ) as $type ) {
			$this->assertTrue( Rich_Blocks::handles( $type ), $type );
		}
	}

	public function test_cards_need_a_title_and_keep_https_pictures_and_actions_the_site_can_follow() {
		$fields = $this->fields(
			'cards',
			array(
				'columns' => 3,
				'cards'   => array(
					array(
						'title'     => ' Yoga <b>class</b> ',
						'text'      => "Mornings\nat eight",
						'image_url' => 'https://cdn.test/yoga.jpg',
						'action'    => array(
							'type'      => 'page',
							'page_slug' => 'yoga',
						),
					),
					array(
						'title'     => 'Pilates',
						'image_url' => 'http://cdn.test/pilates.jpg',
						'action'    => array(
							'type'   => 'screen',
							'screen' => 'cart',
						),
					),
					array( 'text' => 'No title' ),
					'not a card',
				),
			)
		);
		$this->assertSame( 3, $fields['columns'] );
		$this->assertSame(
			array(
				array(
					'title'     => 'Yoga class',
					'text'      => 'Mornings at eight',
					'image_url' => 'https://cdn.test/yoga.jpg',
					'action'    => array(
						'type'      => 'page',
						'page_slug' => 'yoga',
					),
				),
				array(
					'title'     => 'Pilates',
					'text'      => null,
					'image_url' => null,
				),
			),
			$fields['cards']
		);
	}

	public function test_cards_default_to_two_columns_take_twelve_and_leave_out_an_empty_list() {
		$cards  = array_fill( 0, 15, array( 'title' => 'Card' ) );
		$fields = $this->fields(
			'cards',
			array(
				'columns' => 4,
				'cards'   => $cards,
			)
		);
		$this->assertSame( 2, $fields['columns'] );
		$this->assertCount( 12, $fields['cards'] );
		$this->assertSame( 3, $this->fields( 'cards', array( 'columns' => '3', 'cards' => $cards ) )['columns'] );
		$this->assertSame( 2, $this->fields( 'cards', array( 'columns' => true, 'cards' => $cards ) )['columns'] );
		$this->assertNull( $this->fields( 'cards', array( 'cards' => array() ) ) );
		$this->assertNull( $this->fields( 'cards', array( 'cards' => array( array( 'title' => '  ' ) ) ) ) );
		$this->assertNull( $this->fields( 'cards', array() ) );
	}

	public function test_gallery_keeps_https_photos_with_their_captions() {
		$fields = $this->fields(
			'gallery',
			array(
				'images' => array(
					array(
						'image_url' => 'https://cdn.test/1.jpg',
						'caption'   => ' The <i>garden</i> ',
					),
					array( 'image_url' => 'http://cdn.test/2.jpg' ),
					array( 'image_url' => 'javascript:alert(1)' ),
					array( 'caption' => 'No photo' ),
					array( 'image_url' => 'https://cdn.test/3.jpg' ),
				),
			)
		);
		$this->assertSame( 3, $fields['columns'] );
		$this->assertSame(
			array(
				array(
					'image_url' => 'https://cdn.test/1.jpg',
					'caption'   => 'The garden',
				),
				array(
					'image_url' => 'https://cdn.test/3.jpg',
					'caption'   => null,
				),
			),
			$fields['images']
		);
		$this->assertSame( 2, $this->fields( 'gallery', array( 'columns' => 2 ) + array( 'images' => $fields['images'] ) )['columns'] );
		$this->assertCount( 24, $this->fields( 'gallery', array( 'images' => array_fill( 0, 30, array( 'image_url' => 'https://cdn.test/x.jpg' ) ) ) )['images'] );
		$this->assertNull( $this->fields( 'gallery', array( 'images' => array( array( 'image_url' => 'http://cdn.test/2.jpg' ) ) ) ) );
		$this->assertNull( $this->fields( 'gallery', array( 'images' => array() ) ) );
	}

	public function test_map_needs_a_latitude_and_longitude_in_range() {
		$this->assertSame(
			array(
				'latitude'  => 40.987654,
				'longitude' => 29.0284,
				'name'      => 'Moda branch',
				'address'   => 'Moda Cd. 1, Kadıköy',
				'label'     => null,
			),
			$this->fields(
				'map',
				array(
					'latitude'  => 40.98765432,
					'longitude' => '29.0284',
					'name'      => ' Moda branch ',
					'address'   => 'Moda Cd. 1, Kadıköy',
					'label'     => '',
				)
			)
		);
		$this->assertSame( -90.0, $this->fields( 'map', array( 'latitude' => -90, 'longitude' => 180 ) )['latitude'] );
		$this->assertNull( $this->fields( 'map', array( 'latitude' => 91, 'longitude' => 29 ) ) );
		$this->assertNull( $this->fields( 'map', array( 'latitude' => 41, 'longitude' => -180.5 ) ) );
		$this->assertNull( $this->fields( 'map', array( 'latitude' => 'north', 'longitude' => 29 ) ) );
		$this->assertNull( $this->fields( 'map', array( 'latitude' => 41 ) ) );
	}

	public function test_divider_style() {
		$this->assertSame( array( 'style' => 'dots' ), $this->fields( 'divider', array( 'style' => 'dots' ) ) );
		$this->assertSame( array( 'style' => 'dashed' ), $this->fields( 'divider', array( 'style' => 'dashed' ) ) );
		$this->assertSame( array( 'style' => 'line' ), $this->fields( 'divider', array( 'style' => 'wavy' ) ) );
		$this->assertSame( array( 'style' => 'line' ), $this->fields( 'divider', array() ) );
	}

	public function test_form_keeps_the_fields_it_can_check() {
		$fields = $this->fields(
			'form',
			array(
				'send_to'      => 'email',
				'submit_label' => ' Send <b>it</b> ',
				'success_text' => 'Thanks!',
				'fields'       => array(
					array(
						'id'       => 'name',
						'kind'     => 'text',
						'label'    => 'Your name',
						'required' => true,
						'options'  => array( 'ignored', 'too' ),
					),
					array(
						'id'       => 'size',
						'kind'     => 'choice',
						'label'    => 'Size',
						'required' => 'yes',
						'options'  => array( 'S', ' M ', 'S', '', 5, 'L' ),
					),
					array(
						'id'      => 'one',
						'kind'    => 'choice',
						'label'   => 'One option',
						'options' => array( 'Only' ),
					),
					array(
						'id'      => 'many',
						'kind'    => 'choice',
						'label'   => 'Too many',
						'options' => array( 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k' ),
					),
					array(
						'id'    => 'bad id!',
						'kind'  => 'text',
						'label' => 'Bad id',
					),
					array(
						'id'    => 'date',
						'kind'  => 'date',
						'label' => 'Unknown kind',
					),
					array(
						'id'   => 'nolabel',
						'kind' => 'text',
					),
					array(
						'id'    => 'name',
						'kind'  => 'email',
						'label' => 'Same id',
					),
				),
			)
		);
		$this->assertSame( 'email', $fields['send_to'] );
		$this->assertSame( 'Send it', $fields['submit_label'] );
		$this->assertSame( 'Thanks!', $fields['success_text'] );
		$this->assertSame(
			array(
				array(
					'id'       => 'name',
					'kind'     => 'text',
					'label'    => 'Your name',
					'required' => true,
					'options'  => null,
				),
				array(
					'id'       => 'size',
					'kind'     => 'choice',
					'label'    => 'Size',
					'required' => false,
					'options'  => array( 'S', 'M', 'L' ),
				),
			),
			$fields['fields']
		);
	}

	public function test_form_is_left_out_without_fields_or_a_place_to_send_to() {
		$field = array(
			'id'    => 'msg',
			'kind'  => 'long_text',
			'label' => 'Message',
		);
		$this->assertSame( 'chat', $this->fields( 'form', array( 'send_to' => 'chat', 'fields' => array( $field ) ) )['send_to'] );
		$this->assertNull( $this->fields( 'form', array( 'send_to' => 'sms', 'fields' => array( $field ) ) ) );
		$this->assertNull( $this->fields( 'form', array( 'fields' => array( $field ) ) ) );
		$this->assertNull( $this->fields( 'form', array( 'send_to' => 'email', 'fields' => array() ) ) );
		$this->assertNull( $this->fields( 'form', array( 'send_to' => 'email', 'fields' => array( array( 'id' => 'x' ) ) ) ) );
		$many = array();
		for ( $i = 0; $i < 12; $i++ ) {
			$many[] = array( 'id' => 'f' . $i ) + $field;
		}
		$this->assertCount( 10, $this->fields( 'form', array( 'send_to' => 'email', 'fields' => $many ) )['fields'] );
	}

	public function test_entry_translations_of_cards_images_and_fields_are_applied_and_removed() {
		$block = Translator::apply(
			array(
				'id'           => 'f',
				'type'         => 'form',
				'submit_label' => 'Send',
				'success_text' => 'Thanks',
				'name'         => 'Moda',
				'translations' => array(
					'tr' => array(
						'submit_label' => 'Gönder',
						'success_text' => 'Teşekkürler',
						'name'         => 'Moda şubesi',
					),
				),
				'cards'        => array(
					array(
						'title'        => 'Yoga',
						'text'         => 'Mornings',
						'translations' => array(
							'tr' => array(
								'title' => 'Yoga dersi',
								'text'  => '',
							),
						),
					),
				),
				'images'       => array(
					array(
						'image_url'    => 'https://cdn.test/1.jpg',
						'caption'      => 'Garden',
						'translations' => array( 'tr' => array( 'caption' => 'Bahçe' ) ),
					),
				),
				'fields'       => array(
					array(
						'id'           => 'name',
						'label'        => 'Name',
						'translations' => array(
							'tr' => array(
								'label' => 'Ad',
								'id'    => 'other',
							),
						),
					),
				),
			),
			'tr'
		);
		$this->assertSame( 'Gönder', $block['submit_label'] );
		$this->assertSame( 'Teşekkürler', $block['success_text'] );
		$this->assertSame( 'Moda şubesi', $block['name'] );
		$this->assertSame(
			array(
				'title' => 'Yoga dersi',
				'text'  => 'Mornings',
			),
			$block['cards'][0]
		);
		$this->assertSame(
			array(
				'image_url' => 'https://cdn.test/1.jpg',
				'caption'   => 'Bahçe',
			),
			$block['images'][0]
		);
		$this->assertSame(
			array(
				'id'    => 'name',
				'label' => 'Ad',
			),
			$block['fields'][0]
		);
		$this->assertArrayNotHasKey( 'translations', $block );
	}

	public function test_a_forms_visibility_is_checked_like_the_page() {
		$this->assertTrue( Block_Resolver::visible_to( 'everyone', 0 ) );
		$this->assertTrue( Block_Resolver::visible_to( 'signed_in', 7 ) );
		$this->assertFalse( Block_Resolver::visible_to( 'signed_in', 0 ) );
		$this->assertTrue( Block_Resolver::visible_to( 'signed_out', 0 ) );
		$this->assertFalse( Block_Resolver::visible_to( 'signed_out', 7 ) );
		$this->assertFalse( Block_Resolver::visible_to( 'admins', 7 ) );
	}
}
