<?php
/**
 * 206.1 A deleted account's chat is told to Yallapp from WP-Cron, tried again while Yallapp
 * can't be reached, never from the deletion itself.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;

if ( ! defined( 'MINUTE_IN_SECONDS' ) ) {
	define( 'MINUTE_IN_SECONDS', 60 );
}
if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}

class ChatForgetTest extends TestCase {

	public function test_tried_again_only_when_yallapp_did_not_take_it() {
		// No answer (down, timed out), busy or failing: again later.
		foreach ( array( 0, 429, 500, 502, 503 ) as $code ) {
			$this->assertTrue( License_Client::forget_should_retry( $code ), (string) $code );
		}
		// Done, or an answer that won't change: never again.
		foreach ( array( 200, 204, 400, 401, 403, 404, 409 ) as $code ) {
			$this->assertFalse( License_Client::forget_should_retry( $code ), (string) $code );
		}
	}

	public function test_the_waits_grow_and_stop_growing() {
		$this->assertSame( 60, License_Client::forget_retry_delay( 2 ) );
		$this->assertSame( 300, License_Client::forget_retry_delay( 3 ) );
		$this->assertSame( 1800, License_Client::forget_retry_delay( 4 ) );
		$this->assertSame( 7200, License_Client::forget_retry_delay( 5 ) );
		$this->assertSame( 7200, License_Client::forget_retry_delay( 9 ) );
		$this->assertSame( 60, License_Client::forget_retry_delay( 0 ) );
	}

	public function test_a_short_timeout_and_a_few_attempts() {
		$this->assertLessThanOrEqual( 5, License_Client::FORGET_TIMEOUT );
		$this->assertGreaterThan( 1, License_Client::FORGET_ATTEMPTS );
		$this->assertSame( 'yallapp_chat_forget', License_Client::FORGET_HOOK );
	}
}
