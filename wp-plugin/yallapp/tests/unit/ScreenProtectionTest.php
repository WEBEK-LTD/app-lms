<?php
/**
 * 53 Screenshots and screen recording: the dashboard's choice from the license sync, else the plugin's settings.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Screen_Protection;
use Yallapp\Settings;

class ScreenProtectionTest extends TestCase {

	public function test_the_license_status_keeps_only_known_choices() {
		$this->assertSame( 'off', Screen_Protection::from_status( 'off' ) );
		$this->assertSame( 'content', Screen_Protection::from_status( 'content' ) );
		$this->assertSame( 'app', Screen_Protection::from_status( 'app' ) );
		// No choice on the dashboard, an older platform without the field, or anything else.
		$this->assertNull( Screen_Protection::from_status( null ) );
		$this->assertNull( Screen_Protection::from_status( 'everything' ) );
		$this->assertNull( Screen_Protection::from_status( true ) );
		$this->assertNull( Screen_Protection::from_status( array( 'app' ) ) );
	}

	public function test_the_dashboard_choice_wins_over_the_plugin_settings() {
		$this->assertSame( 'off', Screen_Protection::mode( 'off', true, 'app', true ) );
		$this->assertSame( 'app', Screen_Protection::mode( 'app', false, 'content', true ) );
		$this->assertSame( 'content', Screen_Protection::mode( 'content', false, 'app', true ) );
	}

	public function test_without_a_choice_the_plugin_settings_decide() {
		$this->assertSame( 'off', Screen_Protection::mode( null, false, 'app', true ) );
		$this->assertSame( 'content', Screen_Protection::mode( null, true, 'content', true ) );
		$this->assertSame( 'app', Screen_Protection::mode( null, true, 'app', true ) );
		// Apps without courses protect every screen or none.
		$this->assertSame( 'app', Screen_Protection::mode( null, true, 'content', false ) );
		$this->assertSame( 'off', Screen_Protection::mode( 'unknown', false, 'content', false ) );
	}

	public function test_off_by_default_and_course_content_when_turned_on() {
		$defaults = Settings::defaults();
		$this->assertFalse( $defaults['block_screen_capture'] );
		$this->assertSame( 'content', $defaults['screen_protection_scope'] );
		$this->assertSame( 'app', Settings::sanitize( 'screen_protection_scope', 'app' ) );
		$this->assertSame( 'content', Settings::sanitize( 'screen_protection_scope', 'everything' ) );
	}
}
