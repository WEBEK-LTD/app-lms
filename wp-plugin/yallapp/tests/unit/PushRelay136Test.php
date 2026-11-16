<?php
/**
 * Tests for 136.40 "Notifications are sent by Yallapp": the license's push mode, what
 * Yallapp's answer to a batch means (sent, forgotten, sent again later) and when retries run.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;
use Yallapp\Push\Push_Service;

/**
 * The push relay.
 */
class PushRelay136Test extends TestCase {

	/**
	 * Only "yallapp" relays; older platforms that send nothing, and anything else, mean the
	 * site's own Firebase.
	 */
	public function test_push_mode_from_the_license() {
		$this->assertSame( 'yallapp', License_Client::push_of( array( 'push' => 'yallapp' ) ) );
		$this->assertSame( 'own', License_Client::push_of( array( 'push' => 'own' ) ) );
		$this->assertSame( 'own', License_Client::push_of( array() ) );
		$this->assertSame( 'own', License_Client::push_of( array( 'push' => 'YALLAPP' ) ) );
		$this->assertSame( 'own', License_Client::push_of( array( 'push' => true ) ) );
	}

	/**
	 * Each token's answer: sent counts, invalid is forgotten, retry (and a token left out)
	 * is sent again; answers for tokens that weren't sent are ignored.
	 */
	public function test_answer_per_token() {
		$outcome = Push_Service::relay_outcome(
			array( 'a', 'b', 'c', 'd' ),
			array(
				'results' => array(
					array(
						'token'  => 'a',
						'status' => 'sent',
					),
					array(
						'token'  => 'b',
						'status' => 'invalid',
					),
					array(
						'token'  => 'c',
						'status' => 'retry',
					),
					array(
						'token'  => 'zz',
						'status' => 'sent',
					),
					array(
						'token'  => 'a',
						'status' => 'sent',
					),
				),
				'sent'    => 2,
			)
		);
		$this->assertSame( 1, $outcome['sent'] );
		$this->assertSame( array( 'b' ), $outcome['invalid'] );
		$this->assertSame( array( 'c', 'd' ), $outcome['retry'] );
		$this->assertFalse( $outcome['stop'] );
		$this->assertFalse( $outcome['check'] );
	}

	/**
	 * A batch that didn't get through: the network, a timeout or a server error retries it;
	 * over a limit or not ready yet, the other batches wait too, as long as the platform says.
	 */
	public function test_failed_batches_are_sent_again() {
		$batch = array( 'a', 'b' );
		foreach ( array(
			array( 'platform_unreachable', 0, 0, false ),
			array( 'platform_error', 502, 0, false ),
			array( 'rate_limited', 429, 40, true ),
			array( 'push_not_ready', 503, 300, true ),
		) as $case ) {
			list( $code, $status, $after, $stop ) = $case;
			$outcome                              = Push_Service::relay_outcome(
				$batch,
				array(
					'error'               => $code,
					'status'              => $status,
					'retry_after_seconds' => $after,
				)
			);
			$this->assertSame( $batch, $outcome['retry'], $code );
			$this->assertSame( $after, $outcome['wait'], $code );
			$this->assertSame( $stop, $outcome['stop'], $code );
			$this->assertSame( 0, $outcome['sent'], $code );
		}
	}

	/**
	 * The app went back to its own Firebase: check the license, send the batch again (the new
	 * way). A license that isn't active, a plan without push or a bad request drops the batch.
	 */
	public function test_mode_change_and_refusals() {
		$own = Push_Service::relay_outcome(
			array( 'a' ),
			array(
				'error'  => 'push_own_firebase',
				'status' => 409,
			)
		);
		$this->assertTrue( $own['check'] );
		$this->assertSame( array( 'a' ), $own['retry'] );
		foreach ( array( array( 'license_inactive', 403 ), array( 'push_not_available', 403 ), array( 'invalid_request', 400 ), array( 'license_not_found', 404 ) ) as $case ) {
			$outcome = Push_Service::relay_outcome(
				array( 'a' ),
				array(
					'error'  => $case[0],
					'status' => $case[1],
				)
			);
			$this->assertSame( array(), $outcome['retry'], $case[0] );
			$this->assertFalse( $outcome['check'], $case[0] );
		}
	}

	/**
	 * Retries after 1, 2 and 4 minutes, or when the platform says, at most 15 minutes later.
	 */
	public function test_retry_delay() {
		$this->assertSame( 60, Push_Service::retry_delay( 1 ) );
		$this->assertSame( 120, Push_Service::retry_delay( 2 ) );
		$this->assertSame( 240, Push_Service::retry_delay( 3 ) );
		$this->assertSame( 300, Push_Service::retry_delay( 1, 300 ) );
		$this->assertSame( 900, Push_Service::retry_delay( 1, 3600 ) );
		$this->assertSame( 3, Push_Service::RETRY_ATTEMPTS );
	}
}
