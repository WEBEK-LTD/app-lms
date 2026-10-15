<?php
/**
 * 31 The settings page shows only what fits the app's type.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Admin\Settings_Page;

class SettingsCardsTest extends TestCase {

	const COURSE_CARDS = array( 'purchases', 'video', 'content', 'home' );

	public function test_the_dashboard_choice_wins_over_the_sites_plugins() {
		// A Store app on a site with Tutor LMS and WooCommerce: the store's settings, not the courses'.
		$this->assertSame( 'store', Settings_Page::app_type_for( 'store', true, true, false ) );
		$this->assertSame( 'news', Settings_Page::app_type_for( 'news', true, true, true ) );
		$this->assertSame( 'bookings', Settings_Page::app_type_for( 'bookings', true, false, true ) );
		$this->assertSame( 'lms', Settings_Page::app_type_for( 'lms', false, true, false ) );
	}

	public function test_without_a_choice_the_sites_plugins_decide() {
		$this->assertSame( 'lms', Settings_Page::app_type_for( null, true, true, true ) );
		$this->assertSame( 'store', Settings_Page::app_type_for( null, false, true, true ) );
		$this->assertSame( 'bookings', Settings_Page::app_type_for( null, false, false, true ) );
		$this->assertNull( Settings_Page::app_type_for( null, false, false, false ) );
		$this->assertNull( Settings_Page::app_type_for( 'real_estate', false, false, false ) );
	}

	public function test_course_settings_only_for_academy_apps() {
		$this->assertSame( array( 'general', 'sign_in', 'purchases', 'video', 'content', 'home', 'notifications', 'updates' ), Settings_Page::cards_for( 'lms' ) );
		foreach ( array( 'store', 'bookings', 'news', null ) as $type ) {
			$this->assertSame( array(), array_intersect( self::COURSE_CARDS, Settings_Page::cards_for( $type ) ), (string) $type );
		}
	}

	public function test_each_type_gets_its_own_cards() {
		$this->assertSame( array( 'general', 'sign_in', 'checkout', 'store', 'notifications', 'updates' ), Settings_Page::cards_for( 'store' ) );
		$this->assertSame( array( 'general', 'sign_in', 'bookings', 'notifications', 'updates' ), Settings_Page::cards_for( 'bookings' ) );
		$this->assertSame( array( 'general', 'sign_in', 'news', 'notifications', 'updates' ), Settings_Page::cards_for( 'news' ) );
	}

	public function test_nothing_fits_shows_a_note_not_the_academy_cards() {
		$this->assertSame( array( 'general', 'sign_in', 'no_type', 'notifications', 'updates' ), Settings_Page::cards_for( null ) );
	}

	public function test_automatic_notifications_follow_the_type() {
		$this->assertSame( array( 'notify_new_lesson', 'notify_announcement', 'notify_enrollment', 'notify_qna_answer' ), Settings_Page::automatic_notifications_for( 'lms' ) );
		$this->assertSame( array( 'notify_new_post' ), Settings_Page::automatic_notifications_for( 'news' ) );
		$this->assertSame( array(), Settings_Page::automatic_notifications_for( 'store' ) );
		$this->assertSame( array(), Settings_Page::automatic_notifications_for( 'bookings' ) );
		$this->assertSame( array(), Settings_Page::automatic_notifications_for( null ) );
	}
}
