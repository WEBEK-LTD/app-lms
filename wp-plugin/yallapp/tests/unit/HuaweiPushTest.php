<?php
/**
 * Tests for Huawei Push Kit (roadmap 36): the provider a device token is stored with,
 * which sender each token goes to, and Push Kit's message and answers.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Auth\Devices;
use Yallapp\Push\Hms_Sender;
use Yallapp\Push\Push_Service;

/**
 * Huawei push.
 */
class HuaweiPushTest extends TestCase {

	/**
	 * Only "hms" is stored as Huawei; everything else (and older apps that send
	 * nothing) is Firebase.
	 */
	public function test_stored_provider() {
		$this->assertSame( 'hms', Devices::provider( 'hms' ) );
		$this->assertSame( 'fcm', Devices::provider( 'fcm' ) );
		$this->assertSame( 'fcm', Devices::provider( null ) );
		$this->assertSame( 'fcm', Devices::provider( 'apns' ) );
	}

	/**
	 * Each token goes to the service it's from; empty tokens are dropped.
	 */
	public function test_tokens_are_split_by_sender() {
		$split = Push_Service::split_targets(
			array(
				array(
					'token'    => 'fcm-1',
					'provider' => 'fcm',
				),
				array(
					'token'    => 'hms-1',
					'provider' => 'hms',
				),
				array( 'token' => 'old-1' ),
				array(
					'token'    => '',
					'provider' => 'hms',
				),
			)
		);
		$this->assertSame(
			array(
				'fcm' => array( 'fcm-1', 'old-1' ),
				'hms' => array( 'hms-1' ),
			),
			$split
		);
	}

	/**
	 * The Push Kit message opens the app and carries the same data as FCM's, as a JSON string.
	 */
	public function test_message() {
		$message = Hms_Sender::message(
			array( 'hms-1', 'hms-2' ),
			array(
				'title' => 'New lesson in Python',
				'body'  => 'Loops',
			),
			array(
				'type'      => 'new_lesson',
				'lesson_id' => 12,
			)
		);
		$this->assertFalse( $message['validate_only'] );
		$this->assertSame( array( 'hms-1', 'hms-2' ), $message['message']['token'] );
		$this->assertSame(
			array(
				'type'      => 'new_lesson',
				'lesson_id' => '12',
			),
			json_decode( $message['message']['data'], true )
		);
		$this->assertSame( 'New lesson in Python', $message['message']['android']['notification']['title'] );
		$this->assertSame( 'Loops', $message['message']['android']['notification']['body'] );
		$this->assertSame( array( 'type' => 3 ), $message['message']['android']['notification']['click_action'] );
	}

	/**
	 * Push Kit's answer codes: all sent, some refused, all invalid, anything else.
	 */
	public function test_answers() {
		$tokens = array( 'a', 'b', 'c' );
		$this->assertSame(
			array(
				'sent'    => 3,
				'invalid' => array(),
			),
			Hms_Sender::result(
				$tokens,
				array(
					'code' => '80000000',
					'msg'  => 'Success',
				)
			)
		);
		$this->assertSame(
			array(
				'sent'    => 2,
				'invalid' => array( 'b' ),
			),
			Hms_Sender::result(
				$tokens,
				array(
					'code' => '80100000',
					'msg'  => '{"success":2,"failure":1,"illegal_tokens":["b"]}',
				)
			)
		);
		$this->assertSame(
			array(
				'sent'    => 0,
				'invalid' => $tokens,
			),
			Hms_Sender::result( $tokens, array( 'code' => '80300007' ) )
		);
		$this->assertSame(
			array(
				'sent'    => 0,
				'invalid' => array(),
			),
			Hms_Sender::result( $tokens, null )
		);
	}
}
