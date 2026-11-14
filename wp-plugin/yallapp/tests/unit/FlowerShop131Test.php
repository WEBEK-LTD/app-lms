<?php
/**
 * 131 The flower shop on WooCommerce: delivery days and slots, the gift checkout, card
 * messages and the flash sale's price.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Studio_Screens;
use Yallapp\Store\Delivery_Rules;

class FlowerShop131Test extends TestCase {

	private static function money() {
		return static function ( $amount ) {
			return '₺' . number_format( (float) $amount, 2 );
		};
	}

	private static function rules( array $patch = array() ) {
		return array_merge(
			array(
				'enabled'         => true,
				'required'        => true,
				'min_days'        => 0,
				'max_days'        => 14,
				'closed_weekdays' => array( 0 ),
				'same_day_cutoff' => '14:00',
				'slots'           => Delivery_Rules::parse_slots( "10:00-13:00\n16:00-20:00 | 2 | 25" ),
			),
			$patch
		);
	}

	/** Friday 20 November 2026, 11:00 in Istanbul. */
	private static function friday( $time = '11:00' ) {
		return new DateTimeImmutable( '2026-11-20 ' . $time, new DateTimeZone( 'Europe/Istanbul' ) );
	}

	public function test_it_reads_the_slots_as_the_owner_writes_them() {
		$this->assertSame(
			array(
				array(
					'id'       => 's1',
					'start'    => '10:00',
					'end'      => '13:00',
					'capacity' => null,
					'fee'      => null,
				),
				array(
					'id'       => 's2',
					'start'    => '16:00',
					'end'      => '20:00',
					'capacity' => 20,
					'fee'      => 25.5,
				),
			),
			Delivery_Rules::parse_slots( "10:00-13:00\nnonsense\n13:00-10:00\n16:00 - 20:00 | 20 | 25,5" )
		);
	}

	public function test_today_until_the_cut_off_never_on_a_closed_day() {
		$rules = self::rules();
		$this->assertNull( Delivery_Rules::day_problem( $rules, '2026-11-20', self::friday() ) );
		$this->assertSame( 'cutoff', Delivery_Rules::day_problem( $rules, '2026-11-20', self::friday( '14:30' ) ) );
		$this->assertNull( Delivery_Rules::day_problem( $rules, '2026-11-21', self::friday( '14:30' ) ) );
		$this->assertSame( 'closed', Delivery_Rules::day_problem( $rules, '2026-11-22', self::friday() ) );
		$this->assertSame( 'too_far', Delivery_Rules::day_problem( $rules, '2026-12-20', self::friday() ) );
		$this->assertSame( 'too_soon', Delivery_Rules::day_problem( self::rules( array( 'min_days' => 1 ) ), '2026-11-20', self::friday() ) );
		$this->assertSame( 'invalid', Delivery_Rules::day_problem( $rules, '2026-02-30', self::friday() ) );
	}

	public function test_the_slot_is_checked_not_started_and_not_full() {
		$none = static function () {
			return array();
		};
		$full = static function () {
			return array( 's2' => 2 );
		};
		$this->assertSame( 'Choose a delivery date.', Delivery_Rules::check_day( self::rules(), '', '', self::friday(), $none )['error'] );
		$this->assertSame( 'Choose a delivery time.', Delivery_Rules::check_day( self::rules(), '2026-11-21', '', self::friday(), $none )['error'] );
		$this->assertSame( 'That delivery time has started. Please choose a later one.', Delivery_Rules::check_day( self::rules(), '2026-11-20', 's1', self::friday(), $none )['error'] );
		$ok = Delivery_Rules::check_day( self::rules(), '2026-11-20', 's2', self::friday(), $none );
		$this->assertSame( array( '2026-11-20', 's2', 25.0 ), array( $ok['date'], $ok['slot']['id'], $ok['fee'] ) );
		$this->assertSame( array( 'slot_full', 409 ), array_values( array_intersect_key( Delivery_Rules::check_day( self::rules(), '2026-11-20', 's2', self::friday(), $full ), array_flip( array( 'code', 'status' ) ) ) ) );
		// Off: nothing asked, whatever was sent.
		$this->assertSame( array( null, null, 0.0 ), array_values( Delivery_Rules::check_day( self::rules( array( 'enabled' => false ) ), '2026-11-21', 's2', self::friday(), $none ) ) );
	}

	public function test_a_days_slots_say_which_can_be_chosen() {
		$json = Delivery_Rules::slots_json( self::rules(), '2026-11-20', self::friday(), array( 's2' => 1 ), self::money() );
		$this->assertTrue( $json['open'] );
		$this->assertSame( array( false, true ), array_column( $json['slots'], 'available' ) );
		$this->assertSame( array( null, 1 ), array_column( $json['slots'], 'remaining' ) );
		$this->assertSame( '₺25.00', $json['slots'][1]['fee_formatted'] );
		$this->assertFalse( Delivery_Rules::slots_json( self::rules(), '2026-11-22', self::friday(), array(), self::money() )['open'] );
	}

	public function test_the_gift_checkout_asks_for_the_sender_and_the_recipient_strictly() {
		$gift  = array(
			'enabled'    => true,
			'max_length' => 500,
			'recipient'  => true,
			'anonymous'  => true,
		);
		$input = array(
			'sender'         => array(
				'name'  => 'Ayşe Kaya',
				'phone' => '+90 532 111 11 11',
				'email' => 'Ayse@Example.com',
			),
			'recipient'      => array(
				'name'    => 'Leyla',
				'phone'   => '+905322222222',
				'address' => 'Moda Cd. 12, Kadıköy',
			),
			'gift_message'   => "Happy\r\n\r\n\r\nbirthday!",
			'gift_anonymous' => true,
		);
		$ok    = Delivery_Rules::check_gift( $gift, true, $input );
		$this->assertSame( array( 'Ayşe Kaya', '+905321111111', 'ayse@example.com' ), array_values( $ok['sender'] ) );
		$this->assertSame( 'Moda Cd. 12, Kadıköy', $ok['recipient']['address'] );
		$this->assertSame( "Happy\n\nbirthday!", $ok['message'] );
		$this->assertTrue( $ok['anonymous'] );
		$cases = array(
			array( array( 'sender' => null ), 'Enter your name.' ),
			array( array( 'sender' => array_merge( $input['sender'], array( 'email' => 'nope' ) ) ), 'Enter your email address.' ),
			array( array( 'recipient' => array_merge( $input['recipient'], array( 'phone' => '12' ) ) ), 'Enter the recipient\'s phone number.' ),
			array( array( 'recipient' => array_merge( $input['recipient'], array( 'address' => '' ) ) ), 'Enter the delivery address.' ),
			array( array( 'gift_message' => str_repeat( 'x', 501 ) ), 'The card message can be at most 500 characters.' ),
		);
		foreach ( $cases as $case ) {
			$this->assertSame( $case[1], Delivery_Rules::check_gift( $gift, true, array_merge( $input, $case[0] ) )['error'] );
		}
		// The standard checkout: the recipient without an address, all optional; what's off is left out.
		$standard = Delivery_Rules::check_gift( $gift, false, array( 'recipient' => $input['recipient'] ) );
		$this->assertNull( $standard['recipient']['address'] );
		$this->assertNull( $standard['sender'] );
		$off = Delivery_Rules::check_gift( array( 'enabled' => false ), false, $input );
		$this->assertSame( array( null, false, null, null ), array_values( $off ) );
	}

	public function test_the_flash_sale_price_and_sale() {
		$this->assertSame( 400.0, Delivery_Rules::flash_price( array( 'kind' => 'percent', 'value' => 20 ), 500 ) );
		$this->assertSame( 299.0, Delivery_Rules::flash_price( array( 'kind' => 'price', 'value' => 299 ), 500 ) );
		$this->assertNull( Delivery_Rules::flash_price( array( 'kind' => 'price', 'value' => 600 ), 500 ) );
		$sale = array(
			'enabled' => true,
			'starts'  => 100,
			'ends'    => 200,
			'limit'   => 5,
			'sold'    => 4,
		);
		$this->assertTrue( Delivery_Rules::flash_on( $sale, 150 ) );
		$this->assertFalse( Delivery_Rules::flash_on( array_merge( $sale, array( 'sold' => 5 ) ), 150 ) );
		$this->assertFalse( Delivery_Rules::flash_on( $sale, 200 ) );
		$json = Delivery_Rules::sale_json( 500, 400, 1795132800, 1, 5, null, self::money(), 1 );
		$this->assertSame( array( '500.00', '₺400.00', 20, '2026-11-20T00:00:00Z', 1, 5, 1 ), array( $json['was'], $json['now_formatted'], $json['percent_off'], $json['ends_at'], $json['remaining'], $json['total'], $json['flash_sale_id'] ) );
	}

	public function test_the_card_messages_from_the_license_status_in_the_language_asked_for() {
		$status = Delivery_Rules::gift_status(
			array(
				'default_language' => 'ar',
				'occasions'        => array(
					array(
						'id'        => 'birthday',
						'icon'      => 'cake',
						'names'     => array(
							'en' => 'Birthday',
							'ar' => 'عيد ميلاد',
						),
						'templates' => array(
							array(
								'id'    => 't1',
								'texts' => array(
									'en' => 'Happy birthday!',
									'ar' => 'عيد ميلاد سعيد!',
								),
							),
						),
					),
					array( 'id' => 'Bad Id!' ),
				),
			)
		);
		$this->assertCount( 1, $status['occasions'] );
		$this->assertSame(
			array(
				'occasions' => array(
					array(
						'id'        => 'birthday',
						'name'      => 'Birthday',
						'icon'      => 'cake',
						'templates' => array(
							array(
								'id'   => 't1',
								'text' => 'Happy birthday!',
							),
						),
					),
				),
			),
			Delivery_Rules::gift_messages( $status, 'en' )
		);
		// Turkish isn't written: the app's main language.
		$this->assertSame( 'عيد ميلاد سعيد!', Delivery_Rules::gift_messages( $status, 'tr' )['occasions'][0]['templates'][0]['text'] );
		$this->assertNull( Delivery_Rules::gift_status( null ) );
		$this->assertSame( array( 'occasions' => array() ), Delivery_Rules::gift_messages( null, 'en' ) );
	}

	public function test_the_checkout_look_keeps_known_values_only() {
		$this->assertSame(
			array(
				'mode'   => 'gift',
				'style'  => 'steps',
				'accent' => '#C2185B',
				'radius' => 20,
			),
			Studio_Screens::checkout(
				array(
					'mode'   => 'gift',
					'style'  => 'steps',
					'chips'  => 'hexagon',
					'accent' => '#c2185b',
					'radius' => 20,
				)
			)
		);
		$this->assertNull( Studio_Screens::checkout( array( 'style' => 'nope' ) ) );
	}

	public function test_the_details_as_note_lines() {
		$this->assertSame(
			array( 'Delivery date: 2026-11-21, 10:00–13:00', 'Recipient: Leyla, +905322222222, Moda', 'Card message: With love', 'Send anonymously: yes' ),
			Delivery_Rules::note_lines(
				array(
					'date'      => '2026-11-21',
					'slot'      => array(
						'start' => '10:00',
						'end'   => '13:00',
					),
					'recipient' => array(
						'name'    => 'Leyla',
						'phone'   => '+905322222222',
						'address' => 'Moda',
					),
					'message'   => 'With love',
					'anonymous' => true,
				)
			)
		);
	}
}
