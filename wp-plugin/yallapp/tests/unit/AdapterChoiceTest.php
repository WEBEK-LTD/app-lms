<?php
/**
 * Which provider sends sign-in codes, and what happens when the saved one can't.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Otp\Adapter_Choice;

class AdapterChoiceTest extends TestCase {

	private function available( $yallapp, $digits, $dev = false ) {
		return array(
			'yallapp' => $yallapp,
			'digits'  => $digits,
			'dev'     => $dev,
		);
	}

	public function test_the_saved_choice_is_used_when_it_works() {
		$this->assertSame( array( 'id' => 'yallapp', 'saved' => 'yallapp', 'fallback' => false, 'available' => true ), Adapter_Choice::resolve( 'yallapp', $this->available( true, true ) ) );
		$this->assertSame( 'digits', Adapter_Choice::resolve( 'digits', $this->available( true, true ) )['id'] );
		$this->assertSame( 'dev', Adapter_Choice::resolve( 'dev', $this->available( true, true, true ) )['id'] );
	}

	public function test_yallapp_is_the_default() {
		$this->assertSame( 'yallapp', Adapter_Choice::resolve( '', $this->available( true, true ) )['id'] );
		$this->assertSame( 'yallapp', Adapter_Choice::resolve( 'something-else', $this->available( true, true ) )['saved'] );
	}

	public function test_digits_without_its_rest_api_falls_back_to_yallapp() {
		// A site with Digits 8.3.3.2 and Additional SMS Gateways, but no REST API add-on.
		$choice = Adapter_Choice::resolve( 'digits', $this->available( true, false ) );
		$this->assertSame( array( 'id' => 'yallapp', 'saved' => 'digits', 'fallback' => true, 'available' => true ), $choice );
	}

	public function test_yallapp_without_an_active_license_falls_back_to_digits_then_development_codes() {
		$this->assertSame( array( 'id' => 'digits', 'saved' => 'yallapp', 'fallback' => true, 'available' => true ), Adapter_Choice::resolve( 'yallapp', $this->available( false, true, true ) ) );
		$this->assertSame( 'dev', Adapter_Choice::resolve( 'yallapp', $this->available( false, false, true ) )['id'] );
	}

	public function test_development_codes_outside_a_development_site_fall_back_to_a_real_sender() {
		$this->assertSame( 'yallapp', Adapter_Choice::resolve( 'dev', $this->available( true, true, false ) )['id'] );
		$this->assertSame( 'digits', Adapter_Choice::resolve( 'dev', $this->available( false, true, false ) )['id'] );
	}

	public function test_when_nothing_works_the_saved_choice_stays_and_says_so() {
		$this->assertSame( array( 'id' => 'yallapp', 'saved' => 'yallapp', 'fallback' => false, 'available' => false ), Adapter_Choice::resolve( 'yallapp', $this->available( false, false ) ) );
		$this->assertSame( array( 'id' => 'digits', 'saved' => 'digits', 'fallback' => false, 'available' => false ), Adapter_Choice::resolve( 'digits', array() ) );
	}
}
