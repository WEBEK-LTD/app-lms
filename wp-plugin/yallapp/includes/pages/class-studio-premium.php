<?php
/**
 * 129.11–129.20 Studio's premium content, trust and commerce elements on a site's app.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * The fields of Studio's premium elements (docs/api/openapi.yaml `StudioEntry`,
 * `StudioTestimonials`, `StudioPricing`, `StudioStats`, `StudioProgress`, `StudioTimeline`,
 * `StudioProfile`, `StudioBadge`, `StudioCta` and `StudioSurface`), known fields only and
 * bounded, each entry's texts in the language asked for.
 */
class Studio_Premium {

	/**
	 * The premium element types; `profile_card` also holds elements.
	 */
	const TYPES = array( 'testimonials', 'pricing', 'stats', 'progress', 'timeline', 'profile_card', 'bento', 'badge_text', 'cta_bar' );

	/**
	 * An entry's texts and how long each may be.
	 */
	const ENTRY_TEXTS = array(
		'title'    => 120,
		'subtitle' => 120,
		'text'     => 600,
		'label'    => 40,
		'prefix'   => 8,
		'suffix'   => 8,
	);

	/**
	 * Each element's options: the object's field and its allowed looks (the first one the default, left out).
	 */
	const STYLES = array(
		'testimonials' => array( 'testimonials', array( 'carousel', 'stacked' ) ),
		'stats'        => array( 'stats', array( 'plain', 'cards' ) ),
		'progress'     => array( 'progress', array( 'bars', 'rings' ) ),
		'timeline'     => array( 'timeline', array( 'vertical', 'horizontal' ) ),
		'badge_text'   => array( 'badge', array( 'pill', 'outline', 'gradient', 'glass', 'text' ) ),
		'cta_bar'      => array( 'cta', array( 'bar', 'fab' ) ),
	);

	const CURRENCIES = array( 'TRY', 'USD', 'EUR', 'EGP', 'SAR', 'AED' );
	const NETWORKS   = array( 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linkedin', 'snapchat', 'telegram', 'whatsapp_channel' );

	/**
	 * A premium element with its list and options, or null when it has nothing to show.
	 *
	 * @param array    $raw      Element as stored, its own texts already in the language asked for.
	 * @param array    $node     The element's fields served so far.
	 * @param string   $language The language the page is served in.
	 * @param callable $action   Cleans a tap (Block_Resolver::action), null when it can't be followed.
	 * @return array|null
	 */
	public static function node( array $raw, array $node, $language, callable $action ) {
		$type = $node['type'];
		if ( isset( self::STYLES[ $type ] ) ) {
			list( $field, $styles ) = self::STYLES[ $type ];
			$style                  = $raw[ $field ]['style'] ?? null;
			$required               = 'badge_text' === $type || 'cta_bar' === $type;
			if ( in_array( $style, $styles, true ) && ( $required || $styles[0] !== $style ) ) {
				$node[ $field ] = array( 'style' => $style );
			} elseif ( $required ) {
				$node[ $field ] = array( 'style' => $styles[0] );
			}
		}
		switch ( $type ) {
			case 'testimonials':
				$reviews = $raw['testimonials']['reviews'] ?? null;
				if ( is_array( $reviews ) && in_array( $reviews['source'] ?? null, array( 'courses', 'products' ), true ) && is_scalar( $reviews['id'] ?? null ) && preg_match( '/^[A-Za-z0-9_-]{1,40}$/', (string) $reviews['id'] ) ) {
					$node['testimonials']            = $node['testimonials'] ?? array();
					$node['testimonials']['reviews'] = array(
						'source' => $reviews['source'],
						'id'     => (string) $reviews['id'],
					);
				}
				break;
			case 'pricing':
				$pricing = array();
				if ( in_array( $raw['pricing']['currency'] ?? null, self::CURRENCIES, true ) ) {
					$pricing['currency'] = $raw['pricing']['currency'];
				}
				if ( true === ( $raw['pricing']['yearly'] ?? false ) ) {
					$pricing['yearly'] = true;
				}
				if ( $pricing ) {
					$node['pricing'] = $pricing;
				}
				break;
			case 'stats':
				if ( true === ( $raw['stats']['dividers'] ?? false ) ) {
					$node['stats']             = $node['stats'] ?? array();
					$node['stats']['dividers'] = true;
				}
				break;
			case 'profile_card':
				$profile = array();
				$cover   = Block_Resolver::url( $raw['profile']['cover_url'] ?? null );
				if ( null !== $cover ) {
					$profile['cover_url'] = $cover;
				}
				if ( 'square' === ( $raw['profile']['shape'] ?? null ) ) {
					$profile['shape'] = 'square';
				}
				$socials = array();
				foreach ( is_array( $raw['profile']['socials'] ?? null ) ? array_slice( $raw['profile']['socials'], 0, 6 ) : array() as $social ) {
					$network = is_array( $social ) ? ( $social['network'] ?? null ) : null;
					$url     = is_array( $social ) ? Block_Resolver::url( $social['url'] ?? null ) : null;
					if ( in_array( $network, self::NETWORKS, true ) && null !== $url && 0 === strpos( $url, 'https://' ) && ! in_array( $network, array_column( $socials, 'network' ), true ) ) {
						$socials[] = array(
							'network' => $network,
							'url'     => $url,
						);
					}
				}
				if ( $socials ) {
					$profile['socials'] = $socials;
				}
				if ( $profile ) {
					$node['profile'] = $profile;
				}
				break;
			case 'badge_text':
				if ( empty( $node['text'] ) ) {
					return null;
				}
				break;
		}
		if ( 'profile_card' !== $type && 'badge_text' !== $type && 'cta_bar' !== $type ) {
			$entries = self::entries( $raw['entries'] ?? null, $type, $language, $action );
			if ( ! $entries && ! isset( $node['testimonials']['reviews'] ) ) {
				return null;
			}
			$node['entries'] = $entries;
		}
		return $node;
	}

	/**
	 * At most 12 entries, each from known fields only and in the language asked for.
	 *
	 * @param mixed    $raw      The stored entries.
	 * @param string   $type     The element's type.
	 * @param string   $language The language the page is served in.
	 * @param callable $action   Cleans a tap.
	 * @return array[]
	 */
	private static function entries( $raw, $type, $language, callable $action ) {
		$out = array();
		foreach ( is_array( $raw ) ? array_slice( $raw, 0, 12 ) : array() as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$texts = isset( $entry['translations'][ $language ] ) && is_array( $entry['translations'][ $language ] ) ? $entry['translations'][ $language ] : array();
			$item  = array();
			foreach ( self::ENTRY_TEXTS as $field => $max ) {
				$value = isset( $texts[ $field ] ) && is_string( $texts[ $field ] ) && '' !== trim( $texts[ $field ] ) ? $texts[ $field ] : ( $entry[ $field ] ?? null );
				if ( is_scalar( $value ) ) {
					$text = 'text' === $field ? sanitize_textarea_field( (string) $value ) : sanitize_text_field( (string) $value );
					if ( '' !== $text ) {
						$item[ $field ] = mb_substr( $text, 0, $max );
					}
				}
			}
			$image = Block_Resolver::url( $entry['image_url'] ?? null );
			if ( null !== $image ) {
				$item['image_url'] = $image;
			}
			if ( isset( $entry['icon'] ) && is_string( $entry['icon'] ) && preg_match( '/^[a-z0-9_]{1,64}$/', $entry['icon'] ) ) {
				$item['icon'] = $entry['icon'];
			}
			if ( isset( $entry['value'] ) && is_numeric( $entry['value'] ) ) {
				$range         = 'testimonials' === $type ? array( 0, 5 ) : ( 'progress' === $type ? array( 0, 100 ) : array( -1000000000, 1000000000 ) );
				$item['value'] = round( max( $range[0], min( $range[1], (float) $entry['value'] ) ), 1 );
			}
			foreach ( array( 'price', 'price_yearly' ) as $field ) {
				if ( isset( $entry[ $field ] ) && is_int( $entry[ $field ] ) && $entry[ $field ] >= 0 ) {
					$item[ $field ] = $entry[ $field ];
				}
			}
			if ( true === ( $entry['highlight'] ?? false ) ) {
				$item['highlight'] = true;
			}
			if ( in_array( $entry['size'] ?? null, array( 'wide', 'tall', 'large' ), true ) ) {
				$item['size'] = $entry['size'];
			}
			$from = self::hex( $entry['gradient']['from'] ?? null );
			$to   = self::hex( $entry['gradient']['to'] ?? null );
			if ( null !== $from && null !== $to ) {
				$item['gradient'] = array(
					'from'  => $from,
					'to'    => $to,
					'angle' => isset( $entry['gradient']['angle'] ) && is_numeric( $entry['gradient']['angle'] ) ? max( 0, min( 360, (float) $entry['gradient']['angle'] ) ) : 180,
				);
			}
			$color = self::hex( $entry['color'] ?? null );
			if ( null !== $color ) {
				$item['color'] = $color;
			}
			$tap = isset( $entry['action'] ) ? call_user_func( $action, $entry['action'] ) : null;
			if ( $tap ) {
				$item['action'] = $tap;
			}
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * 129.18 A layout's premium card style, or null when it adds nothing.
	 *
	 * @param mixed $raw The stored `surface`.
	 * @return array|null
	 */
	public static function surface( $raw ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$out = array();
		if ( isset( $raw['glass'] ) && is_numeric( $raw['glass'] ) ) {
			$out['glass'] = round( max( 4, min( 40, (float) $raw['glass'] ) ) );
			if ( isset( $raw['tint'] ) && is_numeric( $raw['tint'] ) ) {
				$out['tint'] = round( max( 0.05, min( 0.9, (float) $raw['tint'] ) ), 2 );
			}
		}
		$from = self::hex( $raw['border']['from'] ?? null );
		$to   = self::hex( $raw['border']['to'] ?? null );
		if ( null !== $from && null !== $to ) {
			$out['border'] = array(
				'from'  => $from,
				'to'    => $to,
				'width' => isset( $raw['border']['width'] ) && is_numeric( $raw['border']['width'] ) ? round( max( 1, min( 6, (float) $raw['border']['width'] ) ), 1 ) : 1.5,
			);
		}
		$glow = self::hex( $raw['glow'] ?? null );
		if ( null !== $glow ) {
			$out['glow'] = $glow;
		}
		if ( in_array( $raw['soft'] ?? null, array( 1, 2, 3 ), true ) ) {
			$out['soft'] = $raw['soft'];
		}
		return $out ? $out : null;
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
}
