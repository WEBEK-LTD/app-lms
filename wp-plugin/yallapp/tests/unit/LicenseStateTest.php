<?php
/**
 * 68 An ended plan stops the app: the license is enforced by default, a passed `expires_at`
 * pauses the app even when the platform can't be reached, and the 72-hour grace only covers
 * network failures before the plan's end.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Admin\Settings_Page;
use Yallapp\License\License_Client;

class LicenseStateTest extends TestCase {

	const NOW = 1792000000;

	private static function status( array $patch ) {
		return array_merge(
			array(
				'status'       => 'active',
				'expires_at'   => gmdate( 'c', self::NOW + 30 * 86400 ),
				'contacted_at' => self::NOW - 3600,
			),
			$patch
		);
	}

	public function test_enforced_by_default_everywhere() {
		$this->assertTrue( License_Client::enforcement( null, 'production' ) );
		$this->assertTrue( License_Client::enforcement( null, 'local' ) );
		$this->assertTrue( License_Client::enforcement( true, 'staging' ) );
		$this->assertTrue( License_Client::enforcement( true, 'development' ) );
	}

	public function test_only_a_development_site_turns_it_off() {
		$this->assertFalse( License_Client::enforcement( false, 'local' ) );
		$this->assertFalse( License_Client::enforcement( false, 'development' ) );
		$this->assertTrue( License_Client::enforcement( false, 'production' ) );
		$this->assertTrue( License_Client::enforcement( false, 'staging' ) );
		$this->assertTrue( License_Client::enforcement( false, '' ) );
	}

	public function test_active_until_the_end_date() {
		$this->assertSame( 'active', License_Client::state_of( self::status( array() ), self::NOW ) );
		$this->assertSame( 'active', License_Client::state_of( self::status( array( 'expires_at' => gmdate( 'c', self::NOW + 1 ) ) ), self::NOW ) );
	}

	public function test_a_passed_end_is_expired_without_asking_the_platform() {
		$ended = self::status( array( 'expires_at' => gmdate( 'c', self::NOW - 60 ) ) );
		$this->assertSame( 'expired', License_Client::state_of( $ended, self::NOW ) );
		// The end second itself has ended, as on the platform.
		$this->assertSame( 'expired', License_Client::state_of( self::status( array( 'expires_at' => gmdate( 'c', self::NOW ) ) ), self::NOW ) );
		// Even with an answer a second ago: the platform said active before the end.
		$this->assertSame( 'expired', License_Client::state_of( array_merge( $ended, array( 'contacted_at' => self::NOW - 1 ) ), self::NOW ) );
		// The platform's own format (milliseconds, Z).
		$this->assertSame( 'expired', License_Client::state_of( self::status( array( 'expires_at' => '2026-10-01T09:00:00.000Z' ) ), strtotime( '2026-10-01T09:00:01Z' ) ) );
	}

	public function test_the_grace_covers_network_failures_before_the_end_only() {
		$quiet = self::status( array( 'contacted_at' => self::NOW - 2 * 86400 ) );
		$this->assertSame( 'active', License_Client::state_of( $quiet, self::NOW ) );
		$this->assertSame( 'active', License_Client::state_of( self::status( array( 'contacted_at' => self::NOW - License_Client::GRACE ) ), self::NOW ) );
		$this->assertSame( 'unreachable', License_Client::state_of( self::status( array( 'contacted_at' => self::NOW - License_Client::GRACE - 1 ) ), self::NOW ) );
		// Inside the grace, but the plan ended an hour ago: expired.
		$this->assertSame( 'expired', License_Client::state_of( array_merge( $quiet, array( 'expires_at' => gmdate( 'c', self::NOW - 3600 ) ) ), self::NOW ) );
	}

	public function test_other_statuses_stay_as_the_platform_said() {
		$this->assertSame( 'suspended', License_Client::state_of( self::status( array( 'status' => 'suspended' ) ), self::NOW ) );
		$this->assertSame( 'expired', License_Client::state_of( self::status( array( 'status' => 'expired' ) ), self::NOW ) );
		$this->assertSame( 'none', License_Client::state_of( array( 'status' => 'none' ), self::NOW ) );
		$this->assertSame( 'invalid', License_Client::state_of( array( 'status' => 'invalid' ), self::NOW ) );
		$this->assertSame( 'invalid', License_Client::state_of( array( 'status' => 'something new' ), self::NOW ) );
		$this->assertSame( 'invalid', License_Client::state_of( array(), self::NOW ) );
	}

	public function test_no_end_date_keeps_the_grace_rule() {
		$this->assertNull( License_Client::ends_at( array( 'expires_at' => null ) ) );
		$this->assertNull( License_Client::ends_at( array( 'expires_at' => 'not a date' ) ) );
		$this->assertSame( 'active', License_Client::state_of( self::status( array( 'expires_at' => null ) ), self::NOW ) );
	}

	public function test_the_settings_page_says_where_the_app_stands() {
		$this->assertSame( 'The app is running. Your plan is active until 20 Nov 2026.', Settings_Page::license_state_text( 'active', '20 Nov 2026' ) );
		$ended = Settings_Page::license_state_text( 'expired', '20 Oct 2026' );
		$this->assertStringContainsString( 'Your plan ended on 20 Oct 2026, so the app is paused for everyone', $ended );
		$this->assertStringContainsString( 'Renew the plan on yallapp.com.tr', $ended );
		$this->assertStringContainsString( 'suspended', Settings_Page::license_state_text( 'suspended', '' ) );
		$this->assertStringContainsString( 'over 3 days', Settings_Page::license_state_text( 'unreachable', '' ) );
		foreach ( array( 'active', 'expired', 'suspended', 'unreachable', 'none', 'invalid' ) as $state ) {
			$this->assertStringNotContainsString( 'Test mode', Settings_Page::license_state_text( $state, '1 Jan 2027' ) );
		}
	}
}
