<?php
/**
 * A paused app's error names the app and its owner's contact (roadmap 13.5).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Rest\Gatekeeper;

class GatekeeperTest extends TestCase {

	public function test_paused_app_names_the_app_and_its_contact() {
		$contact = array(
			'name'     => 'Rose Shop',
			'whatsapp' => '+905321112233',
			'email'    => null,
		);
		$paused  = Gatekeeper::paused( 'expired', $contact );
		$this->assertSame( 'license_inactive', $paused['code'] );
		$this->assertSame( 'Rose Shop is paused right now. Please contact Rose Shop to bring it back.', $paused['message'] );
		$this->assertSame( $contact, $paused['contact'] );
		$this->assertStringNotContainsString( 'academy', $paused['message'] );
	}

	public function test_an_ended_plan_is_license_inactive() {
		$paused = Gatekeeper::paused( 'expired', array( 'name' => 'Ada Academy', 'whatsapp' => null, 'email' => null ) );
		$this->assertSame( 'license_inactive', $paused['code'] );
		// 68 No answer from the platform for over 72 hours, a key that isn't valid, no key.
		foreach ( array( 'unreachable', 'invalid', 'none' ) as $state ) {
			$this->assertSame( 'license_inactive', Gatekeeper::paused( $state, array( 'name' => 'Ada Academy', 'whatsapp' => null, 'email' => null ) )['code'] );
		}
	}

	public function test_deleting_ones_account_stays_open_while_paused() {
		$this->assertTrue( Gatekeeper::open_while_paused( 'DELETE', '/yallapp/v1/me' ) );
		$this->assertTrue( Gatekeeper::open_while_paused( 'delete', '/yallapp/v1/me/' ) );
		$this->assertTrue( Gatekeeper::open_while_paused( 'POST', '/yallapp/v1/auth/refresh' ) );
		$this->assertTrue( Gatekeeper::open_while_paused( 'POST', '/yallapp/v1/auth/logout' ) );
		// Nothing else: not reading or changing the account, not signing in.
		$this->assertFalse( Gatekeeper::open_while_paused( 'GET', '/yallapp/v1/me' ) );
		$this->assertFalse( Gatekeeper::open_while_paused( 'PATCH', '/yallapp/v1/me' ) );
		$this->assertFalse( Gatekeeper::open_while_paused( 'DELETE', '/yallapp/v1/me/devices/abc' ) );
		$this->assertFalse( Gatekeeper::open_while_paused( 'POST', '/yallapp/v1/auth/otp/request' ) );
		$this->assertFalse( Gatekeeper::open_while_paused( 'POST', '/yallapp/v1/auth/password' ) );
		$this->assertFalse( Gatekeeper::open_while_paused( 'GET', '/yallapp/v1/courses' ) );
	}

	public function test_a_suspended_account_has_its_own_code() {
		$paused = Gatekeeper::paused( 'suspended', array( 'name' => 'Ada Academy', 'whatsapp' => null, 'email' => 'help@ada.test' ) );
		$this->assertSame( 'account_suspended', $paused['code'] );
		$this->assertSame( 'help@ada.test', $paused['contact']['email'] );
	}
}
