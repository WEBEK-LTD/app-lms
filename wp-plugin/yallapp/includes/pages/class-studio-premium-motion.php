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
	const TYPES = array( 'stories', 'marquee', 'video_hero', 'parallax_banner', 'gallery', 'before_after', 'segments' );

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
		if ( 'gallery' === $type ) {
			return self::gallery( $raw, $node, $action );
		}
		if ( 'before_after' === $type ) {
			return self::compare( $raw, $node );
		}
		if ( 'segments' === $type ) {
			return self::segments( $raw, $node );
		}
		return $node;
	}

	/**
	 * 129.1 A slider's indicator: at its top or foot, how far from that edge, its colour and a count.
	 *
	 * @param array $raw  The stored element.
	 * @param array $node The element served so far.
	 * @return array
	 */
	public static function slider( array $raw, array $node ) {
		$l    = isset( $raw['indicator_look'] ) && is_array( $raw['indicator_look'] ) ? $raw['indicator_look'] : array();
		$look = array();
		if ( 'top' === ( $l['at'] ?? null ) ) {
			$look['at'] = 'top';
		}
		if ( isset( $l['inset'] ) && is_numeric( $l['inset'] ) ) {
			$look['inset'] = (int) max( 0, min( 400, (float) $l['inset'] ) );
		}
		$color = self::hex( $l['color'] ?? null );
		if ( null !== $color ) {
			$look['color'] = $color;
		}
		if ( in_array( $l['count'] ?? null, array( 'plain', 'padded' ), true ) ) {
			$look['count'] = $l['count'];
		}
		if ( $look ) {
			$node['indicator_look'] = $look;
		}
		return $node;
	}

	/**
	 * 129.1 A bar of segments, or the student's course's lessons.
	 *
	 * @param array $raw  The stored element.
	 * @param array $node The element served so far.
	 * @return array
	 */
	private static function segments( array $raw, array $node ) {
		$s        = isset( $raw['segments'] ) && is_array( $raw['segments'] ) ? $raw['segments'] : array();
		$segments = array();
		if ( isset( $s['count'] ) && is_numeric( $s['count'] ) ) {
			$segments['count'] = (int) max( 2, min( 40, (float) $s['count'] ) );
		}
		if ( isset( $s['done'] ) && is_numeric( $s['done'] ) ) {
			$segments['done'] = (int) max( 0, min( $segments['count'] ?? 40, (float) $s['done'] ) );
		}
		if ( isset( $s['part'] ) && is_numeric( $s['part'] ) ) {
			$segments['part'] = round( max( 0, min( 1, (float) $s['part'] ) ), 2 );
		}
		if ( isset( $s['height'] ) && is_numeric( $s['height'] ) ) {
			$segments['height'] = round( max( 2, min( 10, (float) $s['height'] ) ), 1 );
		}
		if ( 'course' === ( $s['source'] ?? null ) ) {
			$segments['source'] = 'course';
		}
		if ( $segments ) {
			$node['segments'] = $segments;
		}
		return $node;
	}

	/**
	 * A #RRGGBB colour in capitals, or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	private static function hex( $value ) {
		return is_string( $value ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $value ) ? strtoupper( $value ) : null;
	}

	/**
	 * 129.6 Before and after: its two photos with their labels and where its divider starts.
	 *
	 * @param array $raw  The stored element.
	 * @param array $node The element served so far.
	 * @return array|null
	 */
	private static function compare( array $raw, array $node ) {
		$images = array_slice( self::images( $raw ), 0, 2 );
		if ( count( $images ) < 2 ) {
			return null;
		}
		$node['images'] = $images;
		if ( isset( $raw['compare']['at'] ) && is_numeric( $raw['compare']['at'] ) ) {
			$node['compare'] = array( 'at' => (int) max( 5, min( 95, (float) $raw['compare']['at'] ) ) );
		}
		return $node;
	}

	/**
	 * 129.5 The gallery: its photos with their captions and links, its layout, corners and captions over them.
	 *
	 * @param array    $raw    The stored element.
	 * @param array    $node   The element served so far.
	 * @param callable $action Action check.
	 * @return array|null
	 */
	private static function gallery( array $raw, array $node, callable $action ) {
		$images = self::images( $raw, $action );
		$layout = $raw['gallery']['layout'] ?? null;
		if ( ! $images || ! in_array( $layout, array( 'masonry', 'bento', 'filmstrip' ), true ) ) {
			return null;
		}
		$node['images']  = $images;
		$node['gallery'] = array( 'layout' => $layout );
		if ( isset( $raw['gallery']['radius'] ) && is_numeric( $raw['gallery']['radius'] ) ) {
			$node['gallery']['radius'] = (int) max( 0, min( 40, (float) $raw['gallery']['radius'] ) );
		}
		if ( true === ( $raw['gallery']['captions'] ?? false ) ) {
			$node['gallery']['captions'] = true;
		}
		if ( 'pill' === ( $raw['caption_style'] ?? null ) ) {
			$node['caption_style'] = 'pill';
		}
		if ( isset( $node['columns'] ) ) {
			$node['columns'] = max( 2, min( 3, $node['columns'] ) );
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
		if ( isset( $m['tilt'] ) && is_numeric( $m['tilt'] ) && 0.0 !== (float) $m['tilt'] ) {
			$marquee['tilt'] = round( max( -8, min( 8, (float) $m['tilt'] ) ), 1 );
		}
		foreach ( array( 'dot', 'chips' ) as $flag ) {
			if ( true === ( $m[ $flag ] ?? false ) ) {
				$marquee[ $flag ] = true;
			}
		}
		if ( $marquee ) {
			$node['marquee'] = $marquee;
		}
		return $node;
	}

	/**
	 * 129 A premium element's photos: each one's https address and caption, at most 30; with `$action`, its link too.
	 *
	 * @param array         $raw    The stored element.
	 * @param callable|null $action Action check, for photos that open a link.
	 * @return array
	 */
	private static function images( array $raw, $action = null ) {
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
			$link = null === $action ? null : $action( $entry['action'] ?? null );
			if ( null !== $link ) {
				$image['action'] = $link;
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
					// 129.2 Its ring, the ring's colour, and without a photo a colour with initials or an icon.
					'ring'       => in_array( $entry['ring'] ?? null, array( 'highlight', 'plain', 'dashed' ), true ) ? $entry['ring'] : null,
					'ring_color' => self::hex( $entry['ring_color'] ?? null ),
					'color'      => self::hex( $entry['color'] ?? null ),
					'label'      => self::text( $entry['label'] ?? null, 3 ),
					'icon'       => is_string( $entry['icon'] ?? null ) && preg_match( '/^[a-z0-9_]{1,64}$/', $entry['icon'] ) ? $entry['icon'] : null,
				),
				static function ( $value ) {
					return null !== $value;
				}
			);
			if ( isset( $story['image_url'] ) || isset( $story['heading'] ) || isset( $story['label'] ) || isset( $story['icon'] ) ) {
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
