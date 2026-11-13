<?php
/**
 * Studio's premium motion and media elements (roadmap 129.1 to 129.8).
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * What the premium elements of a Studio page hold besides any element's look
 * (`StudioNode` in docs/api/openapi.yaml): a row of stories. Their texts are
 * already in the language asked for (Translator::apply). Nothing here reads
 * the site, so it can be unit tested; links are checked by the caller's
 * `$action` (Block_Resolver::action).
 */
class Studio_Premium_Motion {

	/**
	 * 129 The premium element types.
	 */
	const TYPES = array( 'stories', 'marquee', 'video_hero', 'parallax_banner' );

	/**
	 * 129.2 At most this many stories in a row.
	 */
	const MAX_STORIES = 20;

	/**
	 * The element with what its type holds, or null when it has nothing to show.
	 *
	 * @param string   $type   The element's type.
	 * @param array    $raw    The stored element, in the language asked for.
	 * @param array    $node   The element served so far.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	public static function node( $type, array $raw, array $node, callable $action ) {
		if ( 'stories' === $type ) {
			return self::stories( $raw, $node, $action );
		}
		if ( 'marquee' === $type ) {
			return self::marquee( $raw, $node );
		}
		if ( 'video_hero' === $type || 'parallax_banner' === $type ) {
			return self::banner( $type, $raw, $node );
		}
		return $node;
	}

	/**
	 * 129.4 and 129.7 A video banner (its video, poster and playing by itself) or a parallax
	 * banner (its photo's speed); either's shade and frosted panel. What they hold is served
	 * as any layout's.
	 *
	 * @param string $type The element's type.
	 * @param array  $raw  The stored element.
	 * @param array  $node The element served so far.
	 * @return array
	 */
	private static function banner( $type, array $raw, array $node ) {
		if ( 'video_hero' === $type ) {
			unset( $node['video_url'] );
			$video = Block_Resolver::https_url( $raw['video_url'] ?? null );
			if ( null !== $video ) {
				$node['video_url'] = $video;
			}
		} else {
			unset( $node['autoplay'] );
			if ( isset( $raw['parallax']['speed'] ) && is_numeric( $raw['parallax']['speed'] ) ) {
				$node['parallax'] = array( 'speed' => round( max( 0.1, min( 0.9, (float) $raw['parallax']['speed'] ) ), 2 ) );
			}
		}
		$scrim = self::scrim( $raw['scrim'] ?? null );
		if ( null !== $scrim ) {
			$node['scrim'] = $scrim;
		}
		if ( true === ( $raw['glass'] ?? false ) ) {
			$node['glass'] = true;
		}
		return $node;
	}

	/**
	 * 128 A shade over a picture (`StudioScrim`), or null.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function scrim( $value ) {
		if ( ! is_array( $value ) || ! isset( $value['from'], $value['to'] ) || ! is_numeric( $value['from'] ) || ! is_numeric( $value['to'] ) ) {
			return null;
		}
		$color = is_string( $value['color'] ?? null ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $value['color'] ) ? strtoupper( $value['color'] ) : null;
		if ( null === $color ) {
			return null;
		}
		$share = static function ( $n ) {
			return round( max( 0, min( 1, (float) $n ) ), 2 );
		};
		$scrim = array(
			'color' => $color,
			'from'  => $share( $value['from'] ),
			'to'    => $share( $value['to'] ),
		);
		if ( isset( $value['middle'] ) && is_numeric( $value['middle'] ) ) {
			$scrim['middle'] = $share( $value['middle'] );
			if ( isset( $value['at'] ) && is_numeric( $value['at'] ) ) {
				$scrim['at'] = round( max( 1, min( 99, (float) $value['at'] ) ), 1 );
			}
		}
		if ( isset( $value['angle'] ) && is_numeric( $value['angle'] ) ) {
			$scrim['angle'] = round( max( 0, min( 360, (float) $value['angle'] ) ), 1 );
		}
		return $scrim;
	}

	/**
	 * 129.3 The ticker: its words (`text`), its pictures, the icon between them, its speed and direction.
	 *
	 * @param array $raw  The stored element.
	 * @param array $node The element served so far.
	 * @return array|null
	 */
	private static function marquee( array $raw, array $node ) {
		$images = self::images( $raw );
		if ( $images ) {
			$node['images'] = $images;
		}
		if ( empty( $node['text'] ) && ! $images ) {
			return null;
		}
		$m       = isset( $raw['marquee'] ) && is_array( $raw['marquee'] ) ? $raw['marquee'] : array();
		$marquee = array();
		if ( isset( $m['speed'] ) && is_numeric( $m['speed'] ) ) {
			$marquee['speed'] = (int) max( 10, min( 200, (float) $m['speed'] ) );
		}
		if ( in_array( $m['direction'] ?? null, array( 'start', 'end' ), true ) ) {
			$marquee['direction'] = $m['direction'];
		}
		if ( isset( $m['pause_on_press'] ) && is_bool( $m['pause_on_press'] ) ) {
			$marquee['pause_on_press'] = $m['pause_on_press'];
		}
		if ( isset( $m['size'] ) && is_numeric( $m['size'] ) ) {
			$marquee['size'] = (int) max( 16, min( 120, (float) $m['size'] ) );
		}
		if ( $marquee ) {
			$node['marquee'] = $marquee;
		}
		return $node;
	}

	/**
	 * 129 A premium element's photos: each one's https address and caption, at most 30.
	 *
	 * @param array $raw The stored element.
	 * @return array
	 */
	private static function images( array $raw ) {
		$images = array();
		$list   = isset( $raw['images'] ) && is_array( $raw['images'] ) ? array_values( $raw['images'] ) : array();
		foreach ( array_slice( $list, 0, 30 ) as $entry ) {
			$url = is_array( $entry ) ? Block_Resolver::https_url( $entry['image_url'] ?? null ) : null;
			if ( null === $url ) {
				continue;
			}
			$image   = array( 'image_url' => $url );
			$caption = self::text( $entry['caption'] ?? null, 120 );
			if ( null !== $caption ) {
				$image['caption'] = $caption;
			}
			$images[] = $image;
		}
		return $images;
	}

	/**
	 * 129.2 The stories: each one's photo, title, line and link; the rings' size and each one's time.
	 *
	 * @param array    $raw    The stored element.
	 * @param array    $node   The element served so far.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function stories( array $raw, array $node, callable $action ) {
		$slides = array();
		$list   = isset( $raw['slides'] ) && is_array( $raw['slides'] ) ? array_values( $raw['slides'] ) : array();
		foreach ( array_slice( $list, 0, self::MAX_STORIES ) as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$story = array_filter(
				array(
					'image_url'  => Block_Resolver::url( $entry['image_url'] ?? null ),
					'heading'    => self::text( $entry['heading'] ?? null, 40 ),
					'subheading' => self::text( $entry['subheading'] ?? null, 120 ),
					'action'     => $action( $entry['action'] ?? null ),
				),
				static function ( $value ) {
					return null !== $value;
				}
			);
			if ( isset( $story['image_url'] ) || isset( $story['heading'] ) ) {
				$slides[] = $story;
			}
		}
		if ( ! $slides ) {
			return null;
		}
		$node['slides'] = $slides;
		if ( isset( $node['interval_ms'] ) ) {
			$node['interval_ms'] = max( 2000, min( 15000, $node['interval_ms'] ) );
		}
		if ( isset( $raw['stories']['size'] ) && is_numeric( $raw['stories']['size'] ) ) {
			$node['stories'] = array( 'size' => (int) max( 52, min( 96, (float) $raw['stories']['size'] ) ) );
		}
		return $node;
	}

	/**
	 * A single-line text of at most `$max` characters, or null when empty.
	 *
	 * @param mixed $value Value.
	 * @param int   $max   Most characters.
	 * @return string|null
	 */
	private static function text( $value, $max ) {
		$text = Block_Resolver::text( $value );
		return null === $text ? null : mb_substr( $text, 0, $max );
	}
}
