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
}
