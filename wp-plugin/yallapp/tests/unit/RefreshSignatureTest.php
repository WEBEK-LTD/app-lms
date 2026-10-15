<?php
/**
 * 31 The platform's "check your license now" request is signed with the license key.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\Refresh_Signature;

class RefreshSignatureTest extends TestCase {

	const KEY = 'YALL-7K2D-9QWE-4MNB';
	const NOW = 1792000000;

	public function test_the_signature_matches_the_platforms() {
		// The same value platform/web/tests/unit/license-refresh.test.ts expects from refreshSignature().
		$this->assertSame( 'd256653e011bd48634dccbb90a523fae40e898ca4eb9377ef5d381d9787e69be', Refresh_Signature::sign( self::KEY, self::NOW ) );
		$this->assertSame( Refresh_Signature::sign( self::KEY, self::NOW ), Refresh_Signature::sign( ' yall-7k2d-9qwe-4mnb ', self::NOW ) );
	}

	public function test_a_signed_timestamp_within_five_minutes_is_accepted() {
		$this->assertTrue( Refresh_Signature::verify( self::KEY, self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW ) );
		$this->assertTrue( Refresh_Signature::verify( self::KEY, self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW + 300 ) );
		// A clock a little behind the platform's.
		$this->assertTrue( Refresh_Signature::verify( self::KEY, self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW - 120 ) );
		$this->assertTrue( Refresh_Signature::verify( self::KEY, (string) self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW ) );
	}

	public function test_old_or_future_timestamps_are_refused() {
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW + 301 ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW, Refresh_Signature::sign( self::KEY, self::NOW ), self::NOW - 301 ) );
	}

	public function test_wrong_signatures_and_keys_are_refused() {
		$signature = Refresh_Signature::sign( self::KEY, self::NOW );
		$this->assertFalse( Refresh_Signature::verify( 'YALL-AAAA-BBBB-CCCC', self::NOW, $signature, self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( '', self::NOW, Refresh_Signature::sign( '', self::NOW ), self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW + 1, $signature, self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW, strtoupper( $signature ), self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW, substr( $signature, 0, 63 ), self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW, array( $signature ), self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, self::NOW . '.5', $signature, self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, (float) self::NOW, $signature, self::NOW ) );
		$this->assertFalse( Refresh_Signature::verify( self::KEY, null, $signature, self::NOW ) );
	}
}
