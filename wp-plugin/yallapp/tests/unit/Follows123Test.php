<?php
/**
 * 123 Following a course's teacher.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Lms\Follows;

if ( ! function_exists( 'get_user_meta' ) ) {
	/**
	 * A user's meta, from the test's store.
	 *
	 * @param int    $user_id User.
	 * @param string $key     Key.
	 * @return mixed
	 */
	function get_user_meta( $user_id, $key ) {
		return $GLOBALS['yallapp_test_user_meta'][ $user_id ][ $key ] ?? '';
	}
}
if ( ! function_exists( 'update_user_meta' ) ) {
	/**
	 * Keeps a user's meta in the test's store.
	 *
	 * @param int    $user_id User.
	 * @param string $key     Key.
	 * @param mixed  $value   Value.
	 * @return bool
	 */
	function update_user_meta( $user_id, $key, $value ) {
		$GLOBALS['yallapp_test_user_meta'][ $user_id ][ $key ] = $value;
		return true;
	}
}
if ( ! function_exists( 'get_userdata' ) ) {
	/**
	 * A user of the test's, or false.
	 *
	 * @param int $user_id User.
	 * @return object|false
	 */
	function get_userdata( $user_id ) {
		return $GLOBALS['yallapp_test_users'][ $user_id ] ?? false;
	}
}

class Follows123Test extends TestCase {

	protected function setUp(): void {
		$GLOBALS['yallapp_test_user_meta'] = array();
		$GLOBALS['yallapp_test_users']     = array(
			7  => (object) array( 'ID' => 7 ),
			42 => (object) array( 'ID' => 42 ),
		);
	}

	public function test_both_sides_are_kept_and_following_again_is_once() {
		$this->assertTrue( Follows::set( 7, 42, true ) );
		$this->assertTrue( Follows::set( 7, 42, true ) );
		$this->assertSame( array( 42 ), Follows::following( 7 ) );
		$this->assertSame( array( 7 ), Follows::followers( 42 ) );
		$this->assertTrue( Follows::set( 7, 42, false ) );
		$this->assertSame( array(), Follows::following( 7 ) );
		$this->assertSame( array(), Follows::followers( 42 ) );
	}

	public function test_no_one_follows_themselves_someone_unknown_or_while_signed_out() {
		$this->assertFalse( Follows::set( 7, 7, true ) );
		$this->assertFalse( Follows::set( 7, 999, true ) );
		$this->assertFalse( Follows::set( 0, 42, true ) );
		$this->assertSame( array(), Follows::following( 7 ) );
	}
}
