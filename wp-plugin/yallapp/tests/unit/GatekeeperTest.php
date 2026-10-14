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

	public function test_a_suspended_account_has_its_own_code() {
		$paused = Gatekeeper::paused( 'suspended', array( 'name' => 'Ada Academy', 'whatsapp' => null, 'email' => 'help@ada.test' ) );
		$this->assertSame( 'account_suspended', $paused['code'] );
		$this->assertSame( 'help@ada.test', $paused['contact']['email'] );
	}
}
