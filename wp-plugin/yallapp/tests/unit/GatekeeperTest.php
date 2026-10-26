<?php
/**
 * The app API answers whatever the Yallapp license's state: only the site owner's own switches
 * in the plugin settings (the API turned off, or maintenance mode) stop it.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;
use Yallapp\Plugin;
use Yallapp\Rest\Gatekeeper;
use Yallapp\Settings;

class GatekeeperTest extends TestCase {

	/**
	 * A plugin whose settings answer from `$values`, and whose license must never be asked.
	 *
	 * @param array $values Settings.
	 * @return Plugin
	 */
	private function plugin( array $values ) {
		$settings = $this->getMockBuilder( Settings::class )->disableOriginalConstructor()->onlyMethods( array( 'get' ) )->getMock();
		$settings->method( 'get' )->willReturnCallback(
			static function ( $key ) use ( $values ) {
				return $values[ $key ] ?? null;
			}
		);
		$plugin = $this->getMockBuilder( Plugin::class )->disableOriginalConstructor()->onlyMethods( array( 'settings', 'license' ) )->getMock();
		$plugin->method( 'settings' )->willReturn( $settings );
		$plugin->expects( $this->never() )->method( 'license' );
		return $plugin;
	}

	public function test_the_api_answers_without_asking_the_license() {
		$gate = new Gatekeeper(
			$this->plugin(
				array(
					'api_enabled' => true,
					'maintenance' => false,
				)
			)
		);
		$this->assertNull( $gate->blocked_reason() );
	}

	public function test_the_owners_maintenance_switch_still_counts() {
		$gate   = new Gatekeeper(
			$this->plugin(
				array(
					'api_enabled'         => true,
					'maintenance'         => true,
					'maintenance_message' => 'Back at noon.',
				)
			)
		);
		$reason = $gate->blocked_reason();
		$this->assertSame( 'maintenance', $reason['code'] );
		$this->assertSame( 'Back at noon.', $reason['message'] );
		$this->assertArrayNotHasKey( 'contact', $reason );
	}

	public function test_the_owner_can_turn_the_api_off() {
		$gate = new Gatekeeper(
			$this->plugin(
				array(
					'api_enabled' => false,
					'maintenance' => false,
				)
			)
		);
		$this->assertSame( 'maintenance', $gate->blocked_reason()['code'] );
	}

	public function test_no_license_lock_is_left() {
		$this->assertFalse( method_exists( Gatekeeper::class, 'paused' ) );
		$this->assertFalse( method_exists( License_Client::class, 'allows_api' ) );
		$this->assertFalse( method_exists( License_Client::class, 'enforced' ) );
		$this->assertFalse( method_exists( License_Client::class, 'has_feature' ) );
	}
}
