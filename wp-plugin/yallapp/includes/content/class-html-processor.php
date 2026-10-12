<?php
/**
 * Lesson HTML clean-up and iframe extraction.
 *
 * @package Yallapp
 */

namespace Yallapp\Content;

defined( 'ABSPATH' ) || exit;

use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * Turns rendered lesson HTML into what the app needs: clean HTML with iframe
 * placeholders, the list of embeds with their sizes, and the render mode.
 * Has no WordPress dependencies, so it can be unit tested.
 */
class Html_Processor {

	const PLACEHOLDER_ATTR = 'data-yallapp-embed';

	/**
	 * Markers of content the native renderer can't show faithfully.
	 */
	const WEBVIEW_MARKERS = array(
		'elementor',
		'et_pb_',
		'vc_row',
		'fl-builder',
		'brxe-',
		'oxy-',
		'wp-block-cover',
	);

	/**
	 * Processes rendered HTML.
	 *
	 * @param string $html      Rendered HTML.
	 * @param string $site_host The site's host name, to tell same-site embeds apart.
	 * @return array{html: string, embeds: array[], needs_webview: bool}
	 */
	public static function process( $html, $site_host ) {
		$html = (string) $html;
		if ( '' === trim( $html ) ) {
			return array(
				'html'          => '',
				'embeds'        => array(),
				'needs_webview' => false,
			);
		}

		$doc      = new DOMDocument();
		$previous = libxml_use_internal_errors( true );
		$doc->loadHTML( '<?xml encoding="UTF-8"><div id="yallapp-root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		$xpath = new DOMXPath( $doc );

		// Editor artefacts such as TinyMCE selection bookmarks.
		foreach ( iterator_to_array( $xpath->query( '//*[@data-mce-type="bookmark"] | //*[contains(concat(" ", normalize-space(@class), " "), " mce_SELRES_start ")] | //*[contains(concat(" ", normalize-space(@class), " "), " mce_SELRES_end ")]' ) ) as $node ) {
			$node->parentNode->removeChild( $node ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		}

		$needs_webview = $xpath->query( '//script | //style | //form | //object | //embed | //canvas' )->length > 0;
		foreach ( iterator_to_array( $xpath->query( '//*[@*]' ) ) as $element ) {
			foreach ( iterator_to_array( $element->attributes ) as $attribute ) {
				if ( 0 === stripos( $attribute->name, 'on' ) ) {
					$needs_webview = true;
				}
			}
		}
		$lower = strtolower( $html );
		foreach ( self::WEBVIEW_MARKERS as $marker ) {
			if ( false !== strpos( $lower, $marker ) ) {
				$needs_webview = true;
			}
		}

		$embeds = array();
		$index  = 0;
		foreach ( iterator_to_array( $doc->getElementsByTagName( 'iframe' ) ) as $iframe ) {
			$src = trim( (string) $iframe->getAttribute( 'src' ) );
			if ( '' === $src ) {
				$src = trim( (string) $iframe->getAttribute( 'data-src' ) );
			}
			if ( '' === $src ) {
				$iframe->parentNode->removeChild( $iframe ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
				continue;
			}
			if ( 0 === strpos( $src, '//' ) ) {
				$src = 'https:' . $src;
			}
			// Only web pages can be embedded; javascript:, data: and other schemes are dropped.
			if ( ! preg_match( '#^https?://#i', $src ) ) {
				$iframe->parentNode->removeChild( $iframe ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
				continue;
			}
			++$index;
			$placeholder = 'yallapp-embed-' . $index;
			$width       = self::dimension( $iframe, 'width' );
			$height      = self::dimension( $iframe, 'height' );
			$provider    = self::provider( $src, $site_host );
			$embeds[]    = array(
				'placeholder'      => $placeholder,
				'src'              => $src,
				'provider'         => $provider,
				'width'            => $width,
				'height'           => $height,
				'aspect_ratio'     => self::aspect_ratio( $provider, $width, $height ),
				'allow_fullscreen' => $iframe->hasAttribute( 'allowfullscreen' ) || false !== stripos( (string) $iframe->getAttribute( 'allow' ), 'fullscreen' ),
			);
			$marker      = $doc->createElement( 'div' );
			$marker->setAttribute( self::PLACEHOLDER_ATTR, $placeholder );
			$iframe->parentNode->replaceChild( $marker, $iframe ); // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		}

		$root = $doc->getElementById( 'yallapp-root' );
		$out  = '';
		if ( $root ) {
			foreach ( $root->childNodes as $child ) { // phpcs:ignore WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
				$out .= $doc->saveHTML( $child );
			}
		}

		return array(
			'html'          => trim( $out ),
			'embeds'        => $embeds,
			'needs_webview' => $needs_webview,
		);
	}

	/**
	 * A width or height from the attribute or the inline style, e.g. "100%" or "640".
	 *
	 * @param DOMElement $element Element.
	 * @param string     $name    width or height.
	 * @return string|null
	 */
	private static function dimension( DOMElement $element, $name ) {
		$value = trim( (string) $element->getAttribute( $name ) );
		if ( '' === $value && preg_match( '/(?:^|;)\s*' . $name . '\s*:\s*([0-9.]+(?:px|%)?)/i', (string) $element->getAttribute( 'style' ), $m ) ) {
			$value = $m[1];
		}
		$value = preg_replace( '/px$/i', '', $value );
		return preg_match( '/^[0-9.]+%?$/', (string) $value ) ? $value : null;
	}

	/**
	 * Provider of an embed.
	 *
	 * @param string $src       Embed URL.
	 * @param string $site_host Site host name.
	 * @return string youtube|vimeo|same_site|other
	 */
	public static function provider( $src, $site_host ) {
		$host = strtolower( (string) parse_url( $src, PHP_URL_HOST ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- No WordPress dependency here.
		if ( preg_match( '/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/', $host ) ) {
			return 'youtube';
		}
		if ( preg_match( '/(^|\.)vimeo\.com$/', $host ) ) {
			return 'vimeo';
		}
		$site = strtolower( preg_replace( '/^www\./', '', (string) $site_host ) );
		if ( '' !== $host && preg_replace( '/^www\./', '', $host ) === $site ) {
			return 'same_site';
		}
		return 'other';
	}

	/**
	 * Width divided by height when it is known.
	 *
	 * @param string      $provider Provider.
	 * @param string|null $width    Width.
	 * @param string|null $height   Height.
	 * @return float|null
	 */
	public static function aspect_ratio( $provider, $width, $height ) {
		if ( null !== $width && null !== $height && false === strpos( $width, '%' ) && false === strpos( $height, '%' ) && (float) $height > 0 ) {
			return round( (float) $width / (float) $height, 4 );
		}
		if ( in_array( $provider, array( 'youtube', 'vimeo' ), true ) ) {
			return round( 16 / 9, 4 );
		}
		return null;
	}
}
