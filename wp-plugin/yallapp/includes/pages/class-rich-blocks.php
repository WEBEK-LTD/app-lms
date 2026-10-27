<?php
/**
 * The page blocks that carry their own content (roadmap 33).
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * Checks and cleans the blocks whose content the owner writes in the dashboard: slider,
 * quick links, testimonials, questions, countdown, contact, opening hours, social links,
 * team, numbers and notice; 99.4 cards, gallery, map, divider and form (docs/api/openapi.yaml).
 * Nothing here reads the site, so it can be unit tested; actions are checked by the caller's
 * `$action` (Block_Resolver::action).
 */
class Rich_Blocks {

	const TYPES     = array( 'slider', 'quick_links', 'testimonials', 'faq', 'countdown', 'contact', 'hours', 'social', 'team', 'stats', 'notice', 'cards', 'gallery', 'map', 'divider', 'form' );
	const DAYS      = array( 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' );
	const NETWORKS  = array( 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linkedin', 'snapchat', 'telegram', 'whatsapp_channel' );
	const CLOCK     = '/^([01][0-9]|2[0-3]):[0-5][0-9]$/';
	const DATE      = '/^\d{4}-\d{2}-\d{2}$/';
	const PHONE     = '/^\+?[0-9][0-9 ()-]{5,22}$/';
	const ICON      = '/^[a-z0-9_]{1,64}$/';
	const LAYOUTS   = array( 'carousel', 'grid', 'list' );
	const MAX_SLIDE = 8;

	/**
	 * 99.4 A form field's id, and the kinds of field a form has.
	 */
	const FIELD_ID    = '/^[A-Za-z0-9_-]{1,40}$/';
	const FIELD_KINDS = array( 'text', 'long_text', 'email', 'phone', 'number', 'choice' );

	/**
	 * Whether this class handles a block type.
	 *
	 * @param string $type Block type.
	 * @return bool
	 */
	public static function handles( $type ) {
		return in_array( $type, self::TYPES, true );
	}

	/**
	 * The block's fields as the app gets them, or null to leave the block out.
	 *
	 * @param string   $type   One of TYPES.
	 * @param array    $raw    LayoutBlock, already in the request's language.
	 * @param callable $action Checks an Action: the app's shape, or null when the site can't follow it.
	 * @param int      $now    The time, for countdowns.
	 * @return array|null
	 */
	public static function fields( $type, array $raw, callable $action, $now ) {
		switch ( $type ) {
			case 'slider':
				return self::slider( $raw, $action );
			case 'quick_links':
				return self::quick_links( $raw, $action );
			case 'testimonials':
				return self::testimonials( $raw );
			case 'faq':
				return self::faq( $raw );
			case 'countdown':
				return self::countdown( $raw, $action, $now );
			case 'contact':
				return self::contact( $raw );
			case 'hours':
				return self::hours( $raw );
			case 'social':
				return self::social( $raw );
			case 'team':
				return self::team( $raw, $action );
			case 'stats':
				return self::stats( $raw );
			case 'notice':
				return self::notice( $raw, $action );
			case 'cards':
				return self::cards( $raw, $action );
			case 'gallery':
				return self::gallery( $raw );
			case 'map':
				return self::map( $raw );
			case 'divider':
				return array( 'style' => self::choice( $raw['style'] ?? null, array( 'line', 'dashed', 'dots' ), 'line' ) );
			case 'form':
				return self::form( $raw );
		}
		return null;
	}

	/**
	 * Slides with an image or a heading.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function slider( array $raw, callable $action ) {
		$slides = array();
		foreach ( self::entries( $raw, 'slides', self::MAX_SLIDE ) as $entry ) {
			$slide = array(
				'image_url'  => Block_Resolver::url( $entry['image_url'] ?? null ),
				'heading'    => Block_Resolver::text( $entry['heading'] ?? null ),
				'subheading' => Block_Resolver::text( $entry['subheading'] ?? null ),
			);
			if ( null === $slide['image_url'] && null === $slide['heading'] ) {
				continue;
			}
			$slides[] = self::with_action( $slide, $entry['action'] ?? null, $action );
		}
		if ( ! $slides ) {
			return null;
		}
		return array(
			'auto_advance' => false !== ( $raw['auto_advance'] ?? true ),
			'slides'       => $slides,
		);
	}

	/**
	 * Tiles: each needs an icon, a label and an action the site can follow.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function quick_links( array $raw, callable $action ) {
		$links = array();
		foreach ( self::entries( $raw, 'links', 12 ) as $entry ) {
			$label  = Block_Resolver::text( $entry['label'] ?? null );
			$target = $action( $entry['action'] ?? null );
			$icon   = isset( $entry['icon'] ) && is_string( $entry['icon'] ) && preg_match( self::ICON, $entry['icon'] ) ? $entry['icon'] : null;
			if ( null === $label || null === $target || null === $icon ) {
				continue;
			}
			$links[] = array(
				'icon'     => $icon,
				'icon_url' => Block_Resolver::icon_url( $entry['icon_url'] ?? null ),
				'label'    => $label,
				'action'   => $target,
			);
		}
		if ( ! $links ) {
			return null;
		}
		return array(
			'style' => self::choice( $raw['style'] ?? null, array( 'grid', 'row' ), 'grid' ),
			'links' => $links,
		);
	}

	/**
	 * Quotes with a name.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function testimonials( array $raw ) {
		$quotes = array();
		foreach ( self::entries( $raw, 'quotes', 10 ) as $entry ) {
			$text = self::paragraphs( $entry['text'] ?? null );
			$name = Block_Resolver::text( $entry['name'] ?? null );
			if ( null === $text || null === $name ) {
				continue;
			}
			$rating   = isset( $entry['rating'] ) && is_numeric( $entry['rating'] ) ? (int) $entry['rating'] : 0;
			$quotes[] = array(
				'text'      => $text,
				'name'      => $name,
				'role'      => Block_Resolver::text( $entry['role'] ?? null ),
				'photo_url' => Block_Resolver::url( $entry['photo_url'] ?? null ),
				'rating'    => $rating >= 1 && $rating <= 5 ? $rating : null,
			);
		}
		return $quotes ? array( 'quotes' => $quotes ) : null;
	}

	/**
	 * Questions with their answers (line breaks kept).
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function faq( array $raw ) {
		$questions = array();
		foreach ( self::entries( $raw, 'questions', 20 ) as $entry ) {
			$question = Block_Resolver::text( $entry['question'] ?? null );
			$answer   = self::paragraphs( $entry['answer'] ?? null );
			if ( null !== $question && null !== $answer ) {
				$questions[] = array(
					'question' => $question,
					'answer'   => $answer,
				);
			}
		}
		return $questions ? array( 'questions' => $questions ) : null;
	}

	/**
	 * A countdown; left out once it has ended without a text for after the end.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @param int      $now    The time.
	 * @return array|null
	 */
	private static function countdown( array $raw, callable $action, $now ) {
		$heading = Block_Resolver::text( $raw['heading'] ?? null );
		$ends    = isset( $raw['ends_at'] ) && is_string( $raw['ends_at'] ) ? strtotime( $raw['ends_at'] ) : false;
		$ended   = Block_Resolver::text( $raw['ended_text'] ?? null );
		if ( null === $heading || false === $ends || ( $ends <= $now && null === $ended ) ) {
			return null;
		}
		$fields = array(
			'heading'    => $heading,
			'subheading' => Block_Resolver::text( $raw['subheading'] ?? null ),
			'ends_at'    => gmdate( 'Y-m-d\TH:i:s\Z', $ends ),
			'ended_text' => $ended,
		);
		$target = $action( $raw['action'] ?? null );
		if ( null !== $target ) {
			$fields['label']  = Block_Resolver::text( $raw['label'] ?? null );
			$fields['action'] = $target;
		}
		return $fields;
	}

	/**
	 * Ways to reach the business; left out when there is none.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function contact( array $raw ) {
		$phone    = Block_Resolver::text( $raw['phone'] ?? null );
		$whatsapp = Block_Resolver::text( $raw['whatsapp'] ?? null );
		$email    = Block_Resolver::text( $raw['email'] ?? null );
		$lat      = self::coordinate( $raw['latitude'] ?? null, 90 );
		$lng      = self::coordinate( $raw['longitude'] ?? null, 180 );
		if ( null === $lat || null === $lng ) {
			$lat = null;
			$lng = null;
		}
		$fields = array(
			'phone'     => null !== $phone && preg_match( self::PHONE, $phone ) ? $phone : null,
			'whatsapp'  => null !== $whatsapp && preg_match( self::PHONE, $whatsapp ) ? $whatsapp : null,
			'email'     => null !== $email && filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : null,
			'website'   => Block_Resolver::url( $raw['website'] ?? null ),
			'address'   => Block_Resolver::text( $raw['address'] ?? null ),
			'latitude'  => $lat,
			'longitude' => $lng,
		);
		return array() === array_filter(
			$fields,
			static function ( $value ) {
				return null !== $value;
			}
		) ? null : $fields;
	}

	/**
	 * Opening hours, Monday first.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function hours( array $raw ) {
		$hours = array();
		foreach ( self::entries( $raw, 'hours', 21 ) as $entry ) {
			$day    = $entry['day'] ?? null;
			$opens  = $entry['opens'] ?? null;
			$closes = $entry['closes'] ?? null;
			if ( ! in_array( $day, self::DAYS, true ) || ! is_string( $opens ) || ! is_string( $closes ) || ! preg_match( self::CLOCK, $opens ) || ! preg_match( self::CLOCK, $closes ) || $opens === $closes ) {
				continue;
			}
			$hours[] = array(
				'day'    => $day,
				'opens'  => $opens,
				'closes' => $closes,
			);
		}
		usort(
			$hours,
			static function ( $a, $b ) {
				$day = array_search( $a['day'], self::DAYS, true ) - array_search( $b['day'], self::DAYS, true );
				return 0 !== $day ? $day : strcmp( $a['opens'], $b['opens'] );
			}
		);
		$dates = array();
		foreach ( isset( $raw['closed_dates'] ) && is_array( $raw['closed_dates'] ) ? array_slice( $raw['closed_dates'], 0, 30 ) : array() as $date ) {
			if ( is_string( $date ) && preg_match( self::DATE, $date ) && ! in_array( $date, $dates, true ) ) {
				$dates[] = $date;
			}
		}
		sort( $dates );
		$note = Block_Resolver::text( $raw['note'] ?? null );
		if ( ! $hours && null === $note ) {
			return null;
		}
		return array(
			'hours'        => $hours,
			'closed_dates' => $dates,
			'note'         => $note,
		);
	}

	/**
	 * Social profiles: each network once, https only.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function social( array $raw ) {
		$profiles = array();
		$seen     = array();
		foreach ( self::entries( $raw, 'profiles', count( self::NETWORKS ) ) as $entry ) {
			$network = $entry['network'] ?? null;
			$url     = Block_Resolver::url( $entry['url'] ?? null );
			if ( ! in_array( $network, self::NETWORKS, true ) || in_array( $network, $seen, true ) || null === $url || 0 !== strpos( $url, 'https://' ) ) {
				continue;
			}
			$seen[]     = $network;
			$profiles[] = array(
				'network' => $network,
				'url'     => $url,
			);
		}
		return $profiles ? array( 'profiles' => $profiles ) : null;
	}

	/**
	 * People with a name.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function team( array $raw, callable $action ) {
		$people = array();
		foreach ( self::entries( $raw, 'people', 20 ) as $entry ) {
			$name = Block_Resolver::text( $entry['name'] ?? null );
			if ( null === $name ) {
				continue;
			}
			$person   = array(
				'name'      => $name,
				'role'      => Block_Resolver::text( $entry['role'] ?? null ),
				'bio'       => self::paragraphs( $entry['bio'] ?? null ),
				'photo_url' => Block_Resolver::url( $entry['photo_url'] ?? null ),
			);
			$people[] = self::with_action( $person, $entry['action'] ?? null, $action );
		}
		if ( ! $people ) {
			return null;
		}
		return array(
			'layout' => self::choice( $raw['layout'] ?? null, self::LAYOUTS, 'carousel' ),
			'people' => $people,
		);
	}

	/**
	 * Two to four numbers.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function stats( array $raw ) {
		$stats = array();
		foreach ( self::entries( $raw, 'stats', 4 ) as $entry ) {
			$value = Block_Resolver::text( $entry['value'] ?? null );
			$label = Block_Resolver::text( $entry['label'] ?? null );
			if ( null !== $value && null !== $label ) {
				$stats[] = array(
					'value' => $value,
					'label' => $label,
				);
			}
		}
		return count( $stats ) >= 2 ? array( 'stats' => $stats ) : null;
	}

	/**
	 * A notice bar.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function notice( array $raw, callable $action ) {
		$text = Block_Resolver::text( $raw['text'] ?? null );
		if ( null === $text ) {
			return null;
		}
		$fields = array(
			'tone' => self::choice( $raw['tone'] ?? null, array( 'info', 'success', 'warning' ), 'info' ),
			'text' => $text,
		);
		$target = $action( $raw['action'] ?? null );
		if ( null !== $target ) {
			$fields['label']  = Block_Resolver::text( $raw['label'] ?? null );
			$fields['action'] = $target;
		}
		return $fields;
	}

	/**
	 * 99.4 Cards with a title, in two or three columns.
	 *
	 * @param array    $raw    Block.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function cards( array $raw, callable $action ) {
		$cards = array();
		foreach ( self::entries( $raw, 'cards', 12 ) as $entry ) {
			$title = Block_Resolver::text( $entry['title'] ?? null );
			if ( null === $title ) {
				continue;
			}
			$card    = array(
				'title'     => $title,
				'text'      => Block_Resolver::text( $entry['text'] ?? null ),
				'image_url' => Block_Resolver::https_url( $entry['image_url'] ?? null ),
			);
			$cards[] = self::with_action( $card, $entry['action'] ?? null, $action );
		}
		if ( ! $cards ) {
			return null;
		}
		return array(
			'columns' => self::columns( $raw['columns'] ?? null, 2 ),
			'cards'   => $cards,
		);
	}

	/**
	 * 99.4 Photos (https only) with their captions, in two or three columns.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function gallery( array $raw ) {
		$images = array();
		foreach ( self::entries( $raw, 'images', 24 ) as $entry ) {
			$url = Block_Resolver::https_url( $entry['image_url'] ?? null );
			if ( null === $url ) {
				continue;
			}
			$images[] = array(
				'image_url' => $url,
				'caption'   => Block_Resolver::text( $entry['caption'] ?? null ),
			);
		}
		if ( ! $images ) {
			return null;
		}
		return array(
			'columns' => self::columns( $raw['columns'] ?? null, 3 ),
			'images'  => $images,
		);
	}

	/**
	 * 99.4 A place on the map; left out without a latitude and longitude.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function map( array $raw ) {
		$lat = self::coordinate( $raw['latitude'] ?? null, 90 );
		$lng = self::coordinate( $raw['longitude'] ?? null, 180 );
		if ( null === $lat || null === $lng ) {
			return null;
		}
		return array(
			'latitude'  => $lat,
			'longitude' => $lng,
			'name'      => Block_Resolver::text( $raw['name'] ?? null ),
			'address'   => Block_Resolver::text( $raw['address'] ?? null ),
			'label'     => Block_Resolver::text( $raw['label'] ?? null ),
		);
	}

	/**
	 * 99.4 A form: its fields (each id once), and where the answers go (email or chat).
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function form( array $raw ) {
		$send_to = $raw['send_to'] ?? null;
		if ( ! in_array( $send_to, array( 'email', 'chat' ), true ) ) {
			return null;
		}
		$fields = array();
		$ids    = array();
		foreach ( self::entries( $raw, 'fields', 10 ) as $entry ) {
			$field = self::form_field( $entry );
			if ( null === $field || in_array( $field['id'], $ids, true ) ) {
				continue;
			}
			$ids[]    = $field['id'];
			$fields[] = $field;
		}
		if ( ! $fields ) {
			return null;
		}
		return array(
			'fields'       => $fields,
			'submit_label' => Block_Resolver::text( $raw['submit_label'] ?? null ),
			'success_text' => Block_Resolver::text( $raw['success_text'] ?? null ),
			'send_to'      => $send_to,
		);
	}

	/**
	 * 99.4 A FormField, or null: an id, a kind, a label, and for a choice 2 to 10 options.
	 *
	 * @param array $entry Field from the layout.
	 * @return array|null
	 */
	private static function form_field( array $entry ) {
		$id    = $entry['id'] ?? null;
		$kind  = $entry['kind'] ?? null;
		$label = Block_Resolver::text( $entry['label'] ?? null );
		if ( ! is_string( $id ) || ! preg_match( self::FIELD_ID, $id ) || ! in_array( $kind, self::FIELD_KINDS, true ) || null === $label ) {
			return null;
		}
		$options = null;
		if ( 'choice' === $kind ) {
			$options = array();
			foreach ( isset( $entry['options'] ) && is_array( $entry['options'] ) ? $entry['options'] : array() as $option ) {
				$option = is_string( $option ) ? Block_Resolver::text( $option ) : null;
				if ( null !== $option && ! in_array( $option, $options, true ) ) {
					$options[] = $option;
				}
			}
			if ( count( $options ) < 2 || count( $options ) > 10 ) {
				return null;
			}
		}
		return array(
			'id'       => $id,
			'kind'     => $kind,
			'label'    => $label,
			'required' => true === ( $entry['required'] ?? false ),
			'options'  => $options,
		);
	}

	/**
	 * 99.4 Two or three columns, else the default.
	 *
	 * @param mixed $value    Value.
	 * @param int   $fallback Default.
	 * @return int
	 */
	private static function columns( $value, $fallback ) {
		return is_scalar( $value ) && ! is_bool( $value ) && in_array( (string) $value, array( '2', '3' ), true ) ? (int) $value : $fallback;
	}

	/**
	 * The block's list, at most `$max` arrays.
	 *
	 * @param array  $raw Block.
	 * @param string $key List field.
	 * @param int    $max Most entries.
	 * @return array[]
	 */
	private static function entries( array $raw, $key, $max ) {
		$list = isset( $raw[ $key ] ) && is_array( $raw[ $key ] ) ? array_values( $raw[ $key ] ) : array();
		return array_values( array_filter( array_slice( $list, 0, $max ), 'is_array' ) );
	}

	/**
	 * The entry with its action when the site can follow it (`Action` isn't nullable).
	 *
	 * @param array    $fields Entry so far.
	 * @param mixed    $raw    Action from the layout.
	 * @param callable $action Action check.
	 * @return array
	 */
	private static function with_action( array $fields, $raw, callable $action ) {
		$target = $action( $raw );
		if ( null !== $target ) {
			$fields['action'] = $target;
		}
		return $fields;
	}

	/**
	 * Plain text over several lines, or null when empty.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	private static function paragraphs( $value ) {
		if ( ! is_string( $value ) ) {
			return null;
		}
		$text = sanitize_textarea_field( $value );
		return '' === trim( $text ) ? null : $text;
	}

	/**
	 * A coordinate within ±`$max`, or null.
	 *
	 * @param mixed $value Value.
	 * @param int   $max   Limit.
	 * @return float|null
	 */
	private static function coordinate( $value, $max ) {
		if ( ! is_numeric( $value ) || abs( (float) $value ) > $max ) {
			return null;
		}
		return round( (float) $value, 6 );
	}

	/**
	 * One of the allowed values, or the default.
	 *
	 * @param mixed    $value    Value.
	 * @param string[] $allowed  Allowed values.
	 * @param string   $fallback Default.
	 * @return string
	 */
	private static function choice( $value, array $allowed, $fallback ) {
		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}
}
