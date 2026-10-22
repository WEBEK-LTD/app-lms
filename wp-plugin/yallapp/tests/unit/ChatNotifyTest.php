<?php
/**
 * 77 Yallapp's chat notifications are signed with the license key, on the body as sent.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\Chat_Notify;
use Yallapp\License\License_Client;

class ChatNotifyTest extends TestCase {

	const KEY          = 'YALL-7K2D-9QWE-4MNB';
	const NOW          = 1792000000;
	const NOTIFICATION = '{"user_ids":[42,7],"title":"Ada Academy","body":"Your certificate is ready.","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}';

	/**
	 * The body exactly as the platform sends it.
	 *
	 * @param string $notification Notification JSON.
	 * @param int    $timestamp    Timestamp.
	 * @param string $key          Key it is signed with.
	 * @return string
	 */
	private static function body( $notification = self::NOTIFICATION, $timestamp = self::NOW, $key = self::KEY ) {
		return '{"timestamp":' . $timestamp . ',"signature":"' . Chat_Notify::sign( $key, $timestamp, $notification ) . '","notification":' . $notification . '}';
	}

	public function test_the_signature_matches_the_platforms() {
		// The same value platform/web/tests/unit/chat.test.ts expects from notifySignature().
		$this->assertSame( '4fdda9c85d5cc549d124dc7421dfc5524047827357bd9c14f709c7150eb67ed2', Chat_Notify::sign( self::KEY, self::NOW, self::NOTIFICATION ) );
		$this->assertSame( Chat_Notify::sign( self::KEY, self::NOW, self::NOTIFICATION ), Chat_Notify::sign( ' yall-7k2d-9qwe-4mnb ', self::NOW, self::NOTIFICATION ) );
	}

	public function test_a_signed_notification_is_read() {
		$this->assertSame(
			array(
				'user_ids'        => array( 42, 7 ),
				'title'           => 'Ada Academy',
				'body'            => 'Your certificate is ready.',
				'conversation_id' => '0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b',
			),
			Chat_Notify::verify( self::KEY, self::body(), self::NOW + 200 )
		);
		// Arabic, escaped or not: the bytes as sent are what is signed.
		$arabic = '{"user_ids":[42],"title":"أكاديمية آدا","body":"شهادتك جاهزة","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}';
		$this->assertSame( 'شهادتك جاهزة', Chat_Notify::verify( self::KEY, self::body( $arabic ), self::NOW )['body'] );
	}

	public function test_anything_else_is_refused() {
		// Another key, an old or future timestamp, a changed notification, no key on the site.
		$this->assertNull( Chat_Notify::verify( 'YALL-AAAA-BBBB-CCCC', self::body(), self::NOW ) );
		$this->assertNull( Chat_Notify::verify( self::KEY, self::body(), self::NOW + 301 ) );
		$this->assertNull( Chat_Notify::verify( self::KEY, self::body(), self::NOW - 301 ) );
		$this->assertNull( Chat_Notify::verify( self::KEY, str_replace( '[42,7]', '[42,8]', self::body() ), self::NOW ) );
		$this->assertNull( Chat_Notify::verify( '', self::body( self::NOTIFICATION, self::NOW, '' ), self::NOW ) );
		// Re-encoded with spaces: not the platform's shape.
		$this->assertNull( Chat_Notify::verify( self::KEY, str_replace( '"notification":', '"notification": ', self::body() ), self::NOW ) );
		$this->assertNull( Chat_Notify::verify( self::KEY, 'not json', self::NOW ) );
	}

	public function test_a_signed_notification_with_wrong_fields_is_refused() {
		$wrong = array(
			'{"user_ids":["42"],"title":"A","body":"B","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}',
			'{"user_ids":[0],"title":"A","body":"B","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}',
			'{"user_ids":[1],"title":"A","body":"B","conversation_id":"not-a-uuid"}',
			'{"user_ids":[1],"body":"B","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}',
			'{"user_ids":' . wp_json_encode( range( 1, 501 ) ) . ',"title":"A","body":"B","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}',
		);
		foreach ( $wrong as $notification ) {
			$this->assertNull( Chat_Notify::verify( self::KEY, self::body( $notification ), self::NOW ), $notification );
		}
	}

	public function test_the_license_status_carries_the_chat_only_when_well_formed() {
		$this->assertSame(
			array(
				'base_url' => 'https://yallapp.com.tr/api/app/00000000-0000-0000-0000-000000000000',
				'groups'   => true,
			),
			License_Client::chat_of(
				array(
					'chat' => array(
						'base_url' => 'https://yallapp.com.tr/api/app/00000000-0000-0000-0000-000000000000/',
						'groups'   => true,
					),
				)
			)
		);
		$this->assertSame( false, License_Client::chat_of( array( 'chat' => array( 'base_url' => 'https://yallapp.com.tr/api/app/x' ) ) )['groups'] );
		$this->assertNull( License_Client::chat_of( array() ) );
		$this->assertNull( License_Client::chat_of( array( 'chat' => null ) ) );
		$this->assertNull( License_Client::chat_of( array( 'chat' => array( 'base_url' => 'javascript:alert(1)' ) ) ) );
		$this->assertNull( License_Client::chat_of( array( 'chat' => array( 'base_url' => 42 ) ) ) );
		$this->assertContains( 'chat', License_Client::FEATURES );
	}
}
