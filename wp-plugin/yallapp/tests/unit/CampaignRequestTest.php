<?php
/**
 * 85.4 Yallapp's campaigns are signed with the license key, on the body as sent.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\Campaign_Request;

class CampaignRequestTest extends TestCase {

	const KEY      = 'YALL-7K2D-9QWE-4MNB';
	const NOW      = 1792000000;
	const CAMPAIGN = '{"send_id":42,"title":"Weekend sale","body":"Everything is 20% off until Sunday.","link":"https://academy.test/a/page/offers","image_url":"https://yallapp.com.tr/m/abc123"}';

	/**
	 * The body exactly as the platform sends it.
	 *
	 * @param string $campaign  Campaign JSON.
	 * @param int    $timestamp Timestamp.
	 * @param string $key       Key it is signed with.
	 * @return string
	 */
	private static function body( $campaign = self::CAMPAIGN, $timestamp = self::NOW, $key = self::KEY ) {
		return '{"timestamp":' . $timestamp . ',"signature":"' . Campaign_Request::sign( $key, $timestamp, $campaign ) . '","campaign":' . $campaign . '}';
	}

	public function test_the_signature_matches_the_platforms() {
		// The same value platform/web/tests/unit/campaign-site.test.ts expects from campaignSignature().
		$this->assertSame( '5d51b207cf109361788fd8b4eafc5533d9d317b5301223cb58fdbe33613a5518', Campaign_Request::sign( self::KEY, self::NOW, self::CAMPAIGN ) );
		$this->assertSame( Campaign_Request::sign( self::KEY, self::NOW, self::CAMPAIGN ), Campaign_Request::sign( ' yall-7k2d-9qwe-4mnb ', self::NOW, self::CAMPAIGN ) );
	}

	public function test_a_signed_campaign_is_read() {
		$this->assertSame(
			array(
				'send_id'   => 42,
				'title'     => 'Weekend sale',
				'body'      => 'Everything is 20% off until Sunday.',
				'link'      => 'https://academy.test/a/page/offers',
				'image_url' => 'https://yallapp.com.tr/m/abc123',
			),
			Campaign_Request::verify( self::KEY, self::body(), self::NOW + 200 )
		);
		// Nothing to open and no picture, in Arabic.
		$plain = '{"send_id":7,"title":"عروض الأسبوع","body":"خصم 20% حتى الأحد.","link":null,"image_url":null}';
		$read  = Campaign_Request::verify( self::KEY, self::body( $plain ), self::NOW );
		$this->assertSame( 'عروض الأسبوع', $read['title'] );
		$this->assertNull( $read['link'] );
		$this->assertNull( $read['image_url'] );
	}

	public function test_anything_else_is_refused() {
		$this->assertNull( Campaign_Request::verify( 'YALL-AAAA-BBBB-CCCC', self::body(), self::NOW ) );
		$this->assertNull( Campaign_Request::verify( self::KEY, self::body(), self::NOW + 301 ) );
		$this->assertNull( Campaign_Request::verify( self::KEY, str_replace( '20%', '50%', self::body() ), self::NOW ) );
		$this->assertNull( Campaign_Request::verify( '', self::body( self::CAMPAIGN, self::NOW, '' ), self::NOW ) );
		$this->assertNull( Campaign_Request::verify( self::KEY, 'not json', self::NOW ) );
		// Fields that aren't the platform's: an http link, a script address, no send, an empty title.
		foreach ( array(
			'{"send_id":42,"title":"A","body":"B","link":"http://academy.test/x","image_url":null}',
			'{"send_id":42,"title":"A","body":"B","link":"javascript:alert(1)","image_url":null}',
			'{"send_id":0,"title":"A","body":"B","link":null,"image_url":null}',
			'{"send_id":42,"title":" ","body":"B","link":null,"image_url":null}',
		) as $campaign ) {
			$this->assertNull( Campaign_Request::verify( self::KEY, self::body( $campaign ), self::NOW ), $campaign );
		}
	}

	public function test_long_words_are_cut_to_the_contracts_limits() {
		$campaign = Campaign_Request::campaign(
			array(
				'send_id'   => 3,
				'title'     => str_repeat( 'a', 80 ),
				'body'      => str_repeat( 'b', 300 ),
				'link'      => null,
				'image_url' => null,
			)
		);
		$this->assertSame( 65, mb_strlen( $campaign['title'] ) );
		$this->assertSame( 240, mb_strlen( $campaign['body'] ) );
	}
}
