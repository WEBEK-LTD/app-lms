<?php
/**
 * Phone parsing, purchase rules, tokens and push messages.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Auth\Jwt;
use Yallapp\Lms\Purchase_Rules;
use Yallapp\Otp\Phone;
use Yallapp\Push\Push_Service;

class RulesTest extends TestCase {

	public function test_phone_parsing() {
		$this->assertSame( '+905321234567', Phone::parse( '+90', '0532 123 45 67' )->e164() );
		$this->assertSame( '+905321234567', Phone::parse( '90', '(532) 123-4567' )->e164() );
		$this->assertSame( '+905321234567', Phone::parse( '+90', '905321234567' )->e164() );
		$this->assertSame( '+905321234567', Phone::parse( '+90', '+90 532 123 45 67' )->e164() );
		$this->assertSame( '+905321234567', Phone::parse( '+90', '0090 532 123 45 67' )->e164() );
		$this->assertSame( '+201001234567', Phone::parse( '+20', '01001234567' )->e164() );
		$this->assertSame( '+201001234567', Phone::parse( '+20', '201001234567' )->e164() );
		$this->assertSame( '+77012345678', Phone::parse( '+7', '7012345678' )->e164(), 'Kazakh numbers start with 7 and must keep it.' );
		$this->assertSame( '+12025550123', Phone::parse( '+1', '1 202 555 0123' )->e164() );
		$this->assertNull( Phone::parse( '+90', '12' ) );
		$this->assertNull( Phone::parse( '', '5321234567' ) );
		$this->assertNull( Phone::parse( '+90', '5321234567890123' ) );
	}

	/**
	 * @dataProvider purchase_cases
	 */
	public function test_purchase_actions( $expected, $enrolled, $free, $platform, $free_enrollment, $android_checkout, $has_checkout ) {
		$this->assertSame( $expected, Purchase_Rules::action( $enrolled, $free, $platform, $free_enrollment, $android_checkout, $has_checkout ) );
	}

	public function purchase_cases() {
		return array(
			'enrolled'                  => array( 'continue', true, false, 'ios', true, true, true ),
			'free on ios'               => array( 'enroll_free', false, true, 'ios', true, true, true ),
			'free, enrollment off'      => array( 'none', false, true, 'android', false, true, true ),
			'paid on android'           => array( 'checkout', false, false, 'android', true, true, true ),
			'paid on ios is view-only'  => array( 'none', false, false, 'ios', true, true, true ),
			'paid, android button off'  => array( 'none', false, false, 'android', true, false, true ),
			'paid, no checkout on site' => array( 'none', false, false, 'android', true, true, false ),
		);
	}

	public function test_enroll_button_never_on_ios() {
		$this->assertTrue( Purchase_Rules::enroll_button( 'android', true ) );
		$this->assertFalse( Purchase_Rules::enroll_button( 'ios', true ) );
	}

	public function test_jwt_round_trip_and_tamper() {
		$now   = 1700000000;
		$token = Jwt::encode( array( 'sub' => 7, 'exp' => $now + 900 ), 'secret' );
		$this->assertSame( 7, Jwt::decode( $token, 'secret', $now )['sub'] );
		$this->assertNull( Jwt::decode( $token, 'other-secret', $now ) );
		$this->assertNull( Jwt::decode( $token, 'secret', $now + 2000 ) );
		$parts    = explode( '.', $token );
		$parts[1] = rtrim( strtr( base64_encode( json_encode( array( 'sub' => 1, 'exp' => $now + 900 ) ) ), '+/', '-_' ), '=' );
		$this->assertNull( Jwt::decode( implode( '.', $parts ), 'secret', $now ) );
		$this->assertNull( Jwt::decode( 'not.a.token', 'secret', $now ) );
	}

	public function test_push_message_shape() {
		$message = Push_Service::message( 'tok', array( 'title' => 'New lesson', 'body' => 'Loops' ), array( 'course_id' => 8, 'type' => 'new_lesson' ) );
		$this->assertSame( 'tok', $message['token'] );
		$this->assertSame( array( 'course_id' => '8', 'type' => 'new_lesson' ), $message['data'] );
		$this->assertSame( 'New lesson', $message['notification']['title'] );
	}
}
