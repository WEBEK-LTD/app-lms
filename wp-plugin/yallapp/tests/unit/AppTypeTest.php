<?php
/**
 * The app type the owner chose in the dashboard wins over the plugin's guess.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;
use Yallapp\Pages\Default_Layout;

class AppTypeTest extends TestCase {

	public function test_the_license_status_keeps_known_types_and_verticals() {
		$this->assertSame(
			array(
				'app_type' => 'store',
				'vertical' => 'restaurant',
			),
			License_Client::app_of(
				array(
					'app_type' => 'store',
					'vertical' => 'restaurant',
				)
			)
		);
		$this->assertSame(
			array(
				'app_type' => 'booking',
				'vertical' => null,
			),
			License_Client::app_of(
				array(
					'app_type' => 'booking',
					'vertical' => null,
				)
			)
		);
	}

	public function test_older_or_newer_platforms_give_nothing_known() {
		$none = array(
			'app_type' => null,
			'vertical' => null,
		);
		$this->assertSame( $none, License_Client::app_of( array( 'status' => 'active' ) ) );
		$this->assertSame(
			$none,
			License_Client::app_of(
				array(
					'app_type' => 'magazine',
					'vertical' => 'salon',
				)
			)
		);
		$this->assertSame( $none, License_Client::app_of( array( 'app_type' => array( 'lms' ) ) ) );
	}

	public function test_the_chosen_type_names_the_default_pages() {
		$this->assertSame( 'lms', Default_Layout::chosen_type( array( 'app_type' => 'lms' ) ) );
		$this->assertSame( 'store', Default_Layout::chosen_type( array( 'app_type' => 'store' ) ) );
		$this->assertSame( 'bookings', Default_Layout::chosen_type( array( 'app_type' => 'booking' ) ) );
		$this->assertSame( 'news', Default_Layout::chosen_type( array( 'app_type' => 'news' ) ) );
	}

	public function test_the_asking_app_s_type_wins() {
		$plugin = $this->createMock( \Yallapp\Plugin::class );
		$plugin->expects( $this->never() )->method( 'license' );
		$this->assertSame( 'store', ( new Default_Layout( $plugin, 'store' ) )->app_type() );
		$this->assertSame( 'bookings', ( new Default_Layout( $plugin, 'booking' ) )->app_type() );
	}

	public function test_without_a_chosen_type_the_plugin_guesses() {
		$this->assertNull( Default_Layout::chosen_type( array( 'app_type' => null ) ) );
		$this->assertNull( Default_Layout::chosen_type( array() ) );
		$this->assertNull( Default_Layout::chosen_type( null ) );
		// Real estate apps don't run on WordPress; a type this version doesn't know is guessed too.
		$this->assertNull( Default_Layout::chosen_type( array( 'app_type' => 'real_estate' ) ) );
		$this->assertNull( Default_Layout::chosen_type( array( 'app_type' => 'magazine' ) ) );
	}
}
