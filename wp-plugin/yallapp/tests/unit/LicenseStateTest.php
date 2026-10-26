<?php
/**
 * 68 Where the license stands: a passed `expires_at` ends the plan even when the platform can't
 * be reached, and the 72-hour grace only covers network failures before the plan's end. The
 * license only connects the site to Yallapp's services: the plugin works in every state.
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
		$this->assertSame( 'This site is connected to Yallapp\'s services. Your plan is active until 20 Nov 2026.', Settings_Page::license_state_text( 'active', '20 Nov 2026' ) );
		$ended = Settings_Page::license_state_text( 'expired', '20 Oct 2026' );
		$this->assertStringContainsString( 'Your Yallapp plan ended on 20 Oct 2026, so Yallapp\'s services for this app', $ended );
		$this->assertStringContainsString( 'Renew the plan on yallapp.com.tr', $ended );
		$this->assertStringContainsString( 'suspended', Settings_Page::license_state_text( 'suspended', '' ) );
		$this->assertStringContainsString( 'over 3 days', Settings_Page::license_state_text( 'unreachable', '' ) );
		$this->assertStringContainsString( 'The plugin works without a license.', Settings_Page::license_state_text( 'none', '' ) );
		foreach ( array( 'active', 'expired', 'suspended', 'unreachable', 'none', 'invalid' ) as $state ) {
			$text = Settings_Page::license_state_text( $state, '1 Jan 2027' );
			$this->assertStringNotContainsString( 'Test mode', $text );
			// Nothing on the site stops: no state pauses the app.
			$this->assertStringNotContainsString( 'paused', $text );
		}
		foreach ( array( 'expired', 'suspended', 'unreachable', 'invalid' ) as $state ) {
			$this->assertStringContainsString( 'Everything the plugin does on this site keeps working.', Settings_Page::license_state_text( $state, '' ) );
		}
	}
}
