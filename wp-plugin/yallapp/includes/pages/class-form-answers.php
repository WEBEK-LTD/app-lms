<?php
/**
 * The answers to a page's form (roadmap 99.4).
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * 99.4 Checks the answers sent to a `form` block against its fields (`POST /forms/{slug}/{block_id}`,
 * docs/api/openapi.yaml) and writes the email that carries them to the business. Nothing
 * here reads the site, so it can be unit tested.
 */
class Form_Answers {

	/**
	 * The longest answer, in characters.
	 */
	const MAX_LENGTH = 2000;

	/**
	 * A phone number: digits, spaces, +, - and parentheses (6 to 20 digits, counted apart).
	 */
	const PHONE = '/^[0-9 +()-]+$/';

	/**
	 * The answers to the form's fields, cleaned, and what needs a change. Answers to fields
	 * the form doesn't have are ignored; empty answers are left out.
	 *
	 * @param array[] $fields  The form's FormFields, as Rich_Blocks cleans them.
	 * @param array   $answers The request's `answers`: field id, then the answer.
	 * @return array{answers: array<string, string>, errors: array<string, string>}
	 */
	public static function check( array $fields, array $answers ) {
		$clean  = array();
		$errors = array();
		foreach ( $fields as $field ) {
			$id    = (string) $field['id'];
			$value = array_key_exists( $id, $answers ) ? $answers[ $id ] : null;
			if ( null !== $value && ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) {
				$errors[ $id ] = __( 'This answer could not be read.', 'yallapp' );
				continue;
			}
			$value = trim( (string) $value );
			if ( '' === $value ) {
				if ( ! empty( $field['required'] ) ) {
					$errors[ $id ] = __( 'Please fill this in.', 'yallapp' );
				}
				continue;
			}
			$error = self::problem( $field, $value );
			if ( null !== $error ) {
				$errors[ $id ] = $error;
				continue;
			}
			$clean[ $id ] = 'long_text' === $field['kind'] ? sanitize_textarea_field( $value ) : sanitize_text_field( $value );
		}
		// A form sent with nothing in it isn't sent: the first field asks for an answer.
		if ( ! $clean && ! $errors && $fields ) {
			$errors[ (string) $fields[0]['id'] ] = __( 'Please fill this in.', 'yallapp' );
		}
		return array(
			'answers' => $clean,
			'errors'  => $errors,
		);
	}

	/**
	 * What is wrong with an answer that isn't empty, or null.
	 *
	 * @param array  $field FormField.
	 * @param string $value Trimmed answer.
	 * @return string|null
	 */
	private static function problem( array $field, $value ) {
		$length = function_exists( 'mb_strlen' ) ? mb_strlen( $value, 'UTF-8' ) : strlen( $value );
		if ( $length > self::MAX_LENGTH ) {
			return __( 'Please keep this under 2,000 characters.', 'yallapp' );
		}
		switch ( $field['kind'] ) {
			case 'email':
				return is_email( $value ) ? null : __( 'Please enter a valid email address.', 'yallapp' );
			case 'phone':
				return self::is_phone( $value ) ? null : __( 'Please enter a valid phone number.', 'yallapp' );
			case 'number':
				return is_numeric( $value ) ? null : __( 'Please enter a number.', 'yallapp' );
			case 'choice':
				return in_array( $value, (array) $field['options'], true ) ? null : __( 'Please pick one of the choices.', 'yallapp' );
		}
		return null;
	}

	/**
	 * Whether a text looks like a phone number.
	 *
	 * @param string $value Text.
	 * @return bool
	 */
	public static function is_phone( $value ) {
		if ( ! preg_match( self::PHONE, $value ) ) {
			return false;
		}
		$digits = strlen( (string) preg_replace( '/[^0-9]/', '', $value ) );
		return $digits >= 6 && $digits <= 20;
	}

	/**
	 * The email to the business: the subject (the app's name and the form's title), one line
	 * per answer (`Label: answer`), the signed-in person's name and email, and the address
	 * to reply to (the first email field's answer).
	 *
	 * @param array[]     $fields  The form's FormFields.
	 * @param array       $answers Checked answers: field id, then the answer.
	 * @param string      $site    The app's or site's name.
	 * @param string|null $title   The form's title.
	 * @param array|null  $person  The signed-in person (`name` and `email`), or null.
	 * @return array{subject: string, body: string, reply_to: string|null}
	 */
	public static function message( array $fields, array $answers, $site, $title, $person = null ) {
		$lines    = array();
		$reply_to = null;
		foreach ( $fields as $field ) {
			$id = (string) $field['id'];
			if ( ! isset( $answers[ $id ] ) ) {
				continue;
			}
			/* translators: 1: the question, 2: the answer. */
			$lines[] = sprintf( __( '%1$s: %2$s', 'yallapp' ), $field['label'], $answers[ $id ] );
			if ( null === $reply_to && 'email' === $field['kind'] && is_email( $answers[ $id ] ) ) {
				$reply_to = $answers[ $id ];
			}
		}
		if ( is_array( $person ) ) {
			$lines[] = '';
			/* translators: %s: the person's name. */
			$lines[] = sprintf( __( 'Signed in as: %s', 'yallapp' ), $person['name'] );
			/* translators: %s: the person's email address. */
			$lines[] = sprintf( __( 'Account email: %s', 'yallapp' ), $person['email'] );
		}
		$title = is_string( $title ) && '' !== trim( $title ) ? trim( $title ) : __( 'Form', 'yallapp' );
		return array(
			/* translators: 1: the app's name, 2: the form's title. */
			'subject'  => sprintf( __( '%1$s: %2$s', 'yallapp' ), $site, $title ),
			'body'     => implode( "\n", $lines ) . "\n",
			'reply_to' => $reply_to,
		);
	}
}
