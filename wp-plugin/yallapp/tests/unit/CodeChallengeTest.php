<?php
/**
 * Codes the plugin makes for "Sent by Yallapp": hashed, 5 minutes, 5 attempts.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Otp\Code_Challenge;

class CodeChallengeTest extends TestCase {

	const PHONE  = '+905321234567';
	const SECRET = 'site-secret';
	const NOW    = 1760000000;

	public function test_codes_are_six_digits_with_leading_zeros_kept() {
		for ( $i = 0; $i < 200; $i++ ) {
			$this->assertMatchesRegularExpression( '/^\d{6}$/', Code_Challenge::new_code() );
		}
	}

	public function test_the_record_keeps_only_a_hash_and_expires_in_five_minutes() {
		$record = Code_Challenge::record( self::PHONE, '048213', self::SECRET, self::NOW );
		$this->assertSame( self::NOW + 300, $record['expires_at'] );
		$this->assertSame( 0, $record['attempts'] );
		$this->assertMatchesRegularExpression( '/^[0-9a-f]{64}$/', $record['hash'] );
		$this->assertStringNotContainsString( '048213', wp_json_encode( $record ) );
		$this->assertStringNotContainsString( '5321234567', wp_json_encode( $record ) );
		// Another site's secret gives another hash.
		$this->assertNotSame( $record['hash'], Code_Challenge::record( self::PHONE, '048213', 'other-secret', self::NOW )['hash'] );
	}

	public function test_the_right_code_works_once_for_its_number_only() {
		$record = Code_Challenge::record( self::PHONE, '048213', self::SECRET, self::NOW );
		$this->assertSame( 'ok', Code_Challenge::check( $record, self::PHONE, '048213', self::SECRET, self::NOW + 10 )['result'] );
		$this->assertNull( Code_Challenge::check( $record, self::PHONE, '048213', self::SECRET, self::NOW + 10 )['record'] );
		$this->assertSame( 'wrong', Code_Challenge::check( $record, '+905321234568', '048213', self::SECRET, self::NOW + 10 )['result'] );
		$this->assertSame( 'wrong', Code_Challenge::check( $record, self::PHONE, '48213', self::SECRET, self::NOW + 10 )['result'] );
		// After it was used, the record is gone: the caller deleted it.
		$this->assertSame( 'expired', Code_Challenge::check( false, self::PHONE, '048213', self::SECRET, self::NOW + 10 )['result'] );
	}

	public function test_codes_expire_after_five_minutes() {
		$record = Code_Challenge::record( self::PHONE, '123456', self::SECRET, self::NOW );
		$this->assertSame( 'ok', Code_Challenge::check( $record, self::PHONE, '123456', self::SECRET, self::NOW + 299 )['result'] );
		$late = Code_Challenge::check( $record, self::PHONE, '123456', self::SECRET, self::NOW + 300 );
		$this->assertSame( 'expired', $late['result'] );
		$this->assertNull( $late['record'] );
		$this->assertSame( 299, Code_Challenge::ttl_left( $record, self::NOW + 1 ) );
		$this->assertSame( 1, Code_Challenge::ttl_left( $record, self::NOW + 900 ) );
	}

	public function test_five_wrong_attempts_end_the_code() {
		$record = Code_Challenge::record( self::PHONE, '123456', self::SECRET, self::NOW );
		for ( $i = 1; $i <= 4; $i++ ) {
			$check = Code_Challenge::check( $record, self::PHONE, '000000', self::SECRET, self::NOW + $i );
			$this->assertSame( 'wrong', $check['result'] );
			$this->assertSame( $i, $check['record']['attempts'] );
			$record = $check['record'];
		}
		$fifth = Code_Challenge::check( $record, self::PHONE, '000000', self::SECRET, self::NOW + 5 );
		$this->assertSame( 'too_many', $fifth['result'] );
		$this->assertNull( $fifth['record'] );
		// Even the right code no longer works on a record that used its attempts.
		$record['attempts'] = 5;
		$this->assertSame( 'too_many', Code_Challenge::check( $record, self::PHONE, '123456', self::SECRET, self::NOW + 6 )['result'] );
	}

	public function test_a_right_code_on_the_fifth_attempt_still_works() {
		$record = Code_Challenge::record( self::PHONE, '123456', self::SECRET, self::NOW );
		for ( $i = 1; $i <= 4; $i++ ) {
			$record = Code_Challenge::check( $record, self::PHONE, '000000', self::SECRET, self::NOW )['record'];
		}
		$this->assertSame( 'ok', Code_Challenge::check( $record, self::PHONE, '123456', self::SECRET, self::NOW )['result'] );
	}
}
