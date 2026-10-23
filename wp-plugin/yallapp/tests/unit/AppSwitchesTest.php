<?php
/**
 * 83.3 The Yallapp team's switches for an app's modules and new features, from the license check.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;

class AppSwitchesTest extends TestCase {

	public function test_keeps_named_true_or_false_switches_only() {
		$this->assertSame(
			array(
				'chat'      => true,
				'side_menu' => false,
			),
			License_Client::switches_of(
				array(
					'switches' => array(
						'chat'        => true,
						'side_menu'   => false,
						'Bad Name'    => false,
						'block_looks' => 'no',
						7             => false,
					),
				)
			)
		);
	}

	public function test_older_platforms_send_none() {
		$this->assertSame( array(), License_Client::switches_of( array() ) );
		$this->assertSame( array(), License_Client::switches_of( array( 'switches' => 'off' ) ) );
	}
}
