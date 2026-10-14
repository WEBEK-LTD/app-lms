<?php
/**
 * How people sign in: the owner's choice on the dashboard wins over the plugin setting.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Otp\Methods;

class MethodsTest extends TestCase {

	public function test_the_plugin_setting_applies_until_the_owner_chooses() {
		$this->assertSame( array( 'phone' ), Methods::resolve( null, 'phone' ) );
		$this->assertSame( array( 'email' ), Methods::resolve( null, 'email' ) );
		$this->assertSame( array( 'phone', 'email' ), Methods::resolve( null, 'both' ) );
		$this->assertSame( array( 'phone' ), Methods::resolve( null, 'anything' ) );
		$this->assertFalse( Methods::from_platform( null ) );
		$this->assertFalse( Methods::from_platform( array() ) );
	}

	public function test_the_dashboard_choice_wins() {
		$this->assertSame( array( 'email' ), Methods::resolve( array( 'email' ), 'phone' ) );
		$this->assertSame( array( 'phone', 'email' ), Methods::resolve( array( 'email', 'phone' ), 'phone' ) );
		$this->assertTrue( Methods::from_platform( array( 'phone' ) ) );
		// Unknown values are ignored; nothing known left means the setting.
		$this->assertSame( array( 'phone' ), Methods::resolve( array( 'sms' ), 'phone' ) );
	}

	public function test_email_sign_in_uses_the_password_until_someone_chooses_a_code() {
		$this->assertSame( 'password', Methods::email_way( null, 'password' ) );
		$this->assertSame( 'password', Methods::email_way( null, '' ) );
		$this->assertSame( 'code', Methods::email_way( null, 'code' ) );
		// The owner's choice on the dashboard wins; unknown values are ignored.
		$this->assertSame( 'code', Methods::email_way( 'code', 'password' ) );
		$this->assertSame( 'password', Methods::email_way( 'password', 'code' ) );
		$this->assertSame( 'code', Methods::email_way( 'magic', 'code' ) );
	}

	public function test_email_codes_are_bound_to_the_address_never_a_phone_number() {
		$this->assertSame( 'email:sara@example.com', \Yallapp\Otp\Email_Codes::subject( ' Sara@Example.com ' ) );
		$record = \Yallapp\Otp\Code_Challenge::record( \Yallapp\Otp\Email_Codes::subject( 'sara@example.com' ), '482913', 'secret', 1000 );
		$this->assertSame( 'ok', \Yallapp\Otp\Code_Challenge::check( $record, 'email:sara@example.com', '482913', 'secret', 1001 )['result'] );
		$this->assertSame( 'wrong', \Yallapp\Otp\Code_Challenge::check( $record, 'email:mert@example.com', '482913', 'secret', 1001 )['result'] );
		$this->assertSame( 'wrong', \Yallapp\Otp\Code_Challenge::check( $record, 'sara@example.com', '482913', 'secret', 1001 )['result'] );
	}
}
