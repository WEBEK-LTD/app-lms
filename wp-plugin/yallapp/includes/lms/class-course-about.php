<?php
/**
 * The lists an LMS keeps beside a course's description.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

/**
 * CourseDetail.about: what students learn, the requirements, who the course is for and
 * what it includes, as plain lines.
 */
class Course_About {

	/**
	 * Most lines kept per list.
	 */
	const MAX_LINES = 50;

	/**
	 * CourseDetail.about. Pure.
	 *
	 * @param mixed $learn        What students learn.
	 * @param mixed $requirements Requirements.
	 * @param mixed $audience     Who the course is for.
	 * @param mixed $includes     What the course includes.
	 * @return array{learn: string[], requirements: string[], audience: string[], includes: string[]}
	 */
	public static function shape( $learn, $requirements = '', $audience = '', $includes = '' ) {
		return array(
			'learn'        => self::lines( $learn ),
			'requirements' => self::lines( $requirements ),
			'audience'     => self::lines( $audience ),
			'includes'     => self::lines( $includes ),
		);
	}

	/**
	 * Plain, non-empty lines from text with one item per line (Tutor LMS) or a list of
	 * items (LearnPress keeps arrays, sometimes of arrays with the text under a key). Pure.
	 *
	 * @param mixed $value Stored value.
	 * @return string[]
	 */
	public static function lines( $value ) {
		if ( is_string( $value ) ) {
			$value = preg_split( '/\r\n|\r|\n/', $value );
		}
		if ( ! is_array( $value ) ) {
			return array();
		}
		$lines = array();
		foreach ( $value as $item ) {
			if ( is_array( $item ) ) {
				$item = reset( $item );
			}
			if ( ! is_scalar( $item ) ) {
				continue;
			}
			$text = trim( html_entity_decode( wp_strip_all_tags( (string) $item ), ENT_QUOTES, 'UTF-8' ) );
			// One line, without a leading list marker (- * •).
			$text = trim( (string) preg_replace( array( '/\s+/u', '/^[-*\x{2022}]+\s*/u' ), array( ' ', '' ), trim( $text ) ) );
			if ( '' !== $text ) {
				$lines[] = $text;
			}
			if ( count( $lines ) >= self::MAX_LINES ) {
				break;
			}
		}
		return $lines;
	}
}
