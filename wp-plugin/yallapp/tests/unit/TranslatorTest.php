<?php
/**
 * Page languages: picking from Accept-Language and applying translations.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Translator;

class TranslatorTest extends TestCase {

	private $languages = array(
		'default'   => 'en',
		'available' => array( 'en', 'ar' ),
	);

	/**
	 * @dataProvider headers
	 */
	public function test_language_from_accept_language( $expected, $header ) {
		$this->assertSame( $expected, Translator::pick( $header, $this->languages ) );
	}

	public function headers() {
		return array(
			'exact'                  => array( 'ar', 'ar' ),
			'region'                 => array( 'ar', 'ar-EG' ),
			'list, first available'  => array( 'ar', 'fr-FR, ar;q=0.8, en;q=0.5' ),
			'quality decides'        => array( 'en', 'ar;q=0.4, en;q=0.9' ),
			'upper case'             => array( 'ar', 'AR_eg' ),
			'not turned on: default' => array( 'en', 'tr' ),
			'refused with q=0'       => array( 'en', 'ar;q=0' ),
			'empty: default'         => array( 'en', '' ),
			'wildcard: default'      => array( 'en', '*' ),
		);
	}

	public function test_default_language_when_not_english() {
		$this->assertSame( 'ar', Translator::pick( 'de', array( 'default' => 'ar', 'available' => array( 'ar', 'en' ) ) ) );
	}

	public function test_languages_keep_known_codes_and_the_default() {
		$this->assertSame( array( 'default' => 'en', 'available' => array( 'en' ) ), Translator::languages( null ) );
		$this->assertSame(
			array( 'default' => 'en', 'available' => array( 'en', 'ar' ) ),
			Translator::languages( array( 'default' => 'en', 'available' => array( 'en', 'ar', 'xx', 'ar' ) ) )
		);
		$this->assertSame(
			array( 'default' => 'tr', 'available' => array( 'tr', 'ar' ) ),
			Translator::languages( array( 'default' => 'tr', 'available' => array( 'ar' ) ) )
		);
		$this->assertSame( 'en', Translator::languages( array( 'default' => 'fr', 'available' => array( 'fr' ) ) )['default'] );
	}

	public function test_translations_override_text_fields_with_fallback() {
		$block = array(
			'id'           => 'hero',
			'type'         => 'banner',
			'heading'      => 'Learn faster',
			'subheading'   => 'New courses every week',
			'image_url'    => 'https://example.org/hero.jpg',
			'translations' => array(
				'ar' => array(
					'heading'    => 'تعلم أسرع',
					'subheading' => '   ',
					'image_url'  => 'https://example.org/other.jpg',
				),
			),
		);
		$ar    = Translator::apply( $block, 'ar' );
		$this->assertSame( 'تعلم أسرع', $ar['heading'] );
		$this->assertSame( 'New courses every week', $ar['subheading'], 'Blank translations fall back.' );
		$this->assertSame( 'https://example.org/hero.jpg', $ar['image_url'], 'Only text fields are translated.' );
		$this->assertArrayNotHasKey( 'translations', $ar );

		$tr = Translator::apply( $block, 'tr' );
		$this->assertSame( 'Learn faster', $tr['heading'] );
		$this->assertArrayNotHasKey( 'translations', $tr );
	}
}
