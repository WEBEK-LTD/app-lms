<?php
/**
 * 99.4 A form's answers: checked against its fields, then written as the email to the business.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Form_Answers;

class FormAnswersTest extends TestCase {

	/**
	 * A form with every kind of field, as Rich_Blocks cleans it.
	 *
	 * @return array[]
	 */
	private static function fields() {
		return array(
			array(
				'id'       => 'name',
				'kind'     => 'text',
				'label'    => 'Name',
				'required' => true,
				'options'  => null,
			),
			array(
				'id'       => 'email',
				'kind'     => 'email',
				'label'    => 'Email',
				'required' => false,
				'options'  => null,
			),
			array(
				'id'       => 'phone',
				'kind'     => 'phone',
				'label'    => 'Phone',
				'required' => false,
				'options'  => null,
			),
			array(
				'id'       => 'guests',
				'kind'     => 'number',
				'label'    => 'Guests',
				'required' => false,
				'options'  => null,
			),
			array(
				'id'       => 'size',
				'kind'     => 'choice',
				'label'    => 'Table',
				'required' => false,
				'options'  => array( 'Inside', 'Terrace' ),
			),
			array(
				'id'       => 'note',
				'kind'     => 'long_text',
				'label'    => 'Note',
				'required' => false,
				'options'  => null,
			),
		);
	}

	public function test_good_answers_are_cleaned_and_unknown_ids_ignored() {
		$result = Form_Answers::check(
			self::fields(),
			array(
				'name'    => '  Leyla  ',
				'email'   => 'leyla@example.com',
				'phone'   => '+90 (532) 123-45-67',
				'guests'  => '4',
				'size'    => 'Terrace',
				'note'    => "Window seat\nplease <b>",
				'unknown' => 'ignored',
			)
		);
		$this->assertSame( array(), $result['errors'] );
		$this->assertSame(
			array(
				'name'   => 'Leyla',
				'email'  => 'leyla@example.com',
				'phone'  => '+90 (532) 123-45-67',
				'guests' => '4',
				'size'   => 'Terrace',
				'note'   => "Window seat\nplease",
			),
			$result['answers']
		);
	}

	public function test_empty_optional_answers_are_left_out() {
		$result = Form_Answers::check(
			self::fields(),
			array(
				'name'  => 'Leyla',
				'email' => '   ',
			)
		);
		$this->assertSame( array(), $result['errors'] );
		$this->assertSame( array( 'name' => 'Leyla' ), $result['answers'] );
	}

	public function test_each_problem_is_named_by_field() {
		$result = Form_Answers::check(
			self::fields(),
			array(
				'name'   => ' ',
				'email'  => 'not-an-email',
				'phone'  => '12345',
				'guests' => 'four',
				'size'   => 'terrace',
				'note'   => str_repeat( 'a', 2001 ),
			)
		);
		$this->assertSame(
			array(
				'name'   => 'Please fill this in.',
				'email'  => 'Please enter a valid email address.',
				'phone'  => 'Please enter a valid phone number.',
				'guests' => 'Please enter a number.',
				'size'   => 'Please pick one of the choices.',
				'note'   => 'Please keep this under 2,000 characters.',
			),
			$result['errors']
		);
		$this->assertSame( array(), $result['answers'] );
	}

	public function test_a_required_field_left_out_and_answers_that_are_not_text() {
		$result = Form_Answers::check(
			self::fields(),
			array(
				'email'  => array( 'a@b.co' ),
				'guests' => 3,
				'size'   => true,
			)
		);
		$this->assertSame(
			array(
				'name'  => 'Please fill this in.',
				'email' => 'This answer could not be read.',
				'size'  => 'This answer could not be read.',
			),
			$result['errors']
		);
		$this->assertSame( array( 'guests' => '3' ), $result['answers'] );
	}

	public function test_two_thousand_characters_are_allowed_counted_as_characters() {
		$result = Form_Answers::check( self::fields(), array( 'name' => str_repeat( 'ş', 2000 ) ) );
		$this->assertSame( array(), $result['errors'] );
	}

	public function test_a_form_sent_empty_asks_for_its_first_field() {
		$fields                = self::fields();
		$fields[0]['required'] = false;
		$this->assertSame( array( 'name' => 'Please fill this in.' ), Form_Answers::check( $fields, array( 'unknown' => 'x' ) )['errors'] );
	}

	/**
	 * Phone numbers.
	 *
	 * @return array[]
	 */
	public static function phones() {
		return array(
			'international' => array( true, '+90 532 123 45 67' ),
			'six digits'    => array( true, '123456' ),
			'twenty digits' => array( true, '12345678901234567890' ),
			'five digits'   => array( false, '12-345' ),
			'21 digits'     => array( false, '123456789012345678901' ),
			'letters'       => array( false, '0532 CALL ME' ),
			'dots'          => array( false, '0532.123.45.67' ),
		);
	}

	/**
	 * @dataProvider phones
	 */
	public function test_phone( $expected, $value ) {
		$this->assertSame( $expected, Form_Answers::is_phone( $value ) );
	}

	public function test_the_email_has_one_line_per_answer_the_person_and_a_reply_to() {
		$message = Form_Answers::message(
			self::fields(),
			array(
				'name'  => 'Leyla',
				'email' => 'leyla@example.com',
				'size'  => 'Terrace',
			),
			'Moda Cafe',
			'Book a table',
			array(
				'name'  => 'Leyla K.',
				'email' => 'leyla.k@example.com',
			)
		);
		$this->assertSame( 'Moda Cafe: Book a table', $message['subject'] );
		$this->assertSame( "Name: Leyla\nEmail: leyla@example.com\nTable: Terrace\n\nSigned in as: Leyla K.\nAccount email: leyla.k@example.com\n", $message['body'] );
		$this->assertSame( 'leyla@example.com', $message['reply_to'] );
	}

	public function test_the_email_without_a_title_an_email_answer_or_a_person() {
		$message = Form_Answers::message( self::fields(), array( 'name' => 'Leyla' ), 'Moda Cafe', null );
		$this->assertSame( 'Moda Cafe: Form', $message['subject'] );
		$this->assertSame( "Name: Leyla\n", $message['body'] );
		$this->assertNull( $message['reply_to'] );
	}
}
