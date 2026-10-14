<?php
/**
 * Store review access by email: the test address with the fixed code as its password.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Otp\Review_Access;

class ReviewAccessTest extends TestCase {

	/**
	 * Review access on, with a test address and a fixed code.
	 *
	 * @param array $changes Changes.
	 * @return array
	 */
	private static function settings( array $changes = array() ) {
		return array_merge(
			array(
				'review_access_enabled' => true,
				'review_phone'          => '',
				'review_email'          => 'Review@Example.com ',
				'review_code'           => '246810',
			),
			$changes
		);
	}

	public function test_the_test_address_is_recognised_whatever_its_case() {
		$this->assertTrue( Review_Access::is_review_email( self::settings(), 'review@example.com' ) );
		$this->assertTrue( Review_Access::is_review_email( self::settings(), ' REVIEW@example.com' ) );
		$this->assertFalse( Review_Access::is_review_email( self::settings(), 'sara@example.com' ) );
		$this->assertFalse( Review_Access::is_review_email( self::settings(), '' ) );
	}

	public function test_only_while_review_access_is_on_with_a_code_and_an_address() {
		$this->assertFalse( Review_Access::is_review_email( self::settings( array( 'review_access_enabled' => false ) ), 'review@example.com' ) );
		$this->assertFalse( Review_Access::is_review_email( self::settings( array( 'review_code' => '' ) ), 'review@example.com' ) );
		$this->assertFalse( Review_Access::is_review_email( self::settings( array( 'review_email' => '' ) ), '' ) );
		$this->assertFalse( Review_Access::is_review_email( self::settings( array( 'review_email' => 'review' ) ), 'review' ) );
		// Settings saved before 0.3.2 have no test address.
		$old = self::settings();
		unset( $old['review_email'] );
		$this->assertFalse( Review_Access::is_review_email( $old, 'review@example.com' ) );
	}

	public function test_the_fixed_code_is_the_password() {
		$this->assertTrue( Review_Access::code_matches( self::settings(), '246810' ) );
		$this->assertTrue( Review_Access::code_matches( self::settings(), ' 246810 ' ) );
		$this->assertFalse( Review_Access::code_matches( self::settings(), '246811' ) );
		$this->assertFalse( Review_Access::code_matches( self::settings(), '' ) );
		$this->assertFalse( Review_Access::code_matches( self::settings( array( 'review_code' => '' ) ), '' ) );
	}
}
