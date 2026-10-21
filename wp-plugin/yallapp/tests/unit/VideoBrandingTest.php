<?php
/**
 * 72 The video sites' own players by default: the app hides their branding only when the owner
 * chose it in the Yallapp dashboard (`LicenseStatus.hide_video_branding`, served as
 * `Config.app.hide_video_branding`).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;

class VideoBrandingTest extends TestCase {

	public function test_off_unless_the_platform_says_true() {
		$this->assertFalse( License_Client::hides_video_branding( array() ) );
		$this->assertFalse( License_Client::hides_video_branding( array( 'hide_video_branding' => false ) ) );
		$this->assertFalse( License_Client::hides_video_branding( array( 'hide_video_branding' => null ) ) );
		$this->assertFalse( License_Client::hides_video_branding( array( 'hide_video_branding' => 'true' ) ) );
		$this->assertFalse( License_Client::hides_video_branding( array( 'hide_video_branding' => 1 ) ) );
		$this->assertTrue( License_Client::hides_video_branding( array( 'hide_video_branding' => true ) ) );
	}
}
