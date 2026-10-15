<?php
/**
 * The app's pages, tabs, look and languages.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

use Yallapp\Plugin;

/**
 * Serves the layout published in the dashboard, or the default pages built from the
 * site, in the shapes of docs/api/openapi.yaml (Navigation, AppPage, Appearance, Languages).
 */
class Pages {

	/**
	 * Allowed values of the Appearance fields.
	 */
	const APPEARANCE = array(
		'template'   => array( 'classic', 'bold', 'minimal' ),
		'theme_mode' => array( 'system', 'light', 'dark' ),
		'font'       => array( 'Bricolage Grotesque', 'Plus Jakarta Sans', 'Outfit', 'Manrope', 'DM Sans', 'Lexend' ),
		'corners'    => array( 'sharp', 'soft', 'round' ),
		'cards'      => array( 'flat', 'outlined', 'elevated' ),
	);

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Block resolver.
	 *
	 * @var Block_Resolver
	 */
	private $resolver;

	/**
	 * The layout for this request, once built.
	 *
	 * @var array|null
	 */
	private $layout = null;

	/**
	 * The type of the app asking (`app_type` on /pages), or ''.
	 *
	 * @var string
	 */
	private $app_type = '';

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin   = $plugin;
		$this->resolver = new Block_Resolver( $plugin );
	}

	/**
	 * Sets the type of the app asking, which the default pages follow.
	 *
	 * @param string $app_type The app's build config `app_type`, or ''.
	 * @return void
	 */
	public function for_app_type( $app_type ) {
		if ( (string) $app_type !== $this->app_type ) {
			$this->app_type = (string) $app_type;
			$this->layout   = null;
		}
	}

	/**
	 * The published layout, or the default one.
	 *
	 * @return array Layout shape.
	 */
	public function layout() {
		if ( null === $this->layout ) {
			$stored       = $this->plugin->layout_client()->layout();
			$this->layout = $stored ? $stored : ( new Default_Layout( $this->plugin, $this->app_type ) )->build();
		}
		return $this->layout;
	}

	/**
	 * Config.languages.
	 *
	 * @return array{default: string, available: string[]}
	 */
	public function languages() {
		$stored = $this->plugin->layout_client()->layout();
		return Translator::languages( $stored['languages'] ?? null );
	}

	/**
	 * The language to answer in.
	 *
	 * @param string|null $accept_language Accept-Language header.
	 * @return string
	 */
	public function language( $accept_language ) {
		return Translator::pick( (string) $accept_language, $this->languages() );
	}

	/**
	 * Config.appearance, or null when nothing complete is published (the app then keeps
	 * the build's template and font).
	 *
	 * @return array|null
	 */
	public function appearance() {
		$stored = $this->plugin->layout_client()->layout();
		$raw    = $stored['appearance'] ?? null;
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$look = array();
		foreach ( self::APPEARANCE as $field => $allowed ) {
			if ( ! in_array( $raw[ $field ] ?? null, $allowed, true ) ) {
				return null;
			}
			$look[ $field ] = $raw[ $field ];
		}
		if ( ! isset( $raw['user_can_change_mode'] ) || ! is_bool( $raw['user_can_change_mode'] ) ) {
			return null;
		}
		$color = isset( $raw['secondary_color'] ) && is_string( $raw['secondary_color'] ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $raw['secondary_color'] ) ? strtoupper( $raw['secondary_color'] ) : null;
		return array(
			'template'             => $look['template'],
			'theme_mode'           => $look['theme_mode'],
			'user_can_change_mode' => $raw['user_can_change_mode'],
			'secondary_color'      => $color,
			'font'                 => $look['font'],
			'corners'              => $look['corners'],
			'cards'                => $look['cards'],
		);
	}

	/**
	 * The version for a language: the layout's version, marked with the language when it
	 * isn't the default one, so a cached copy in another language is never reused.
	 *
	 * @param string $language Language code.
	 * @return string
	 */
	public function version( $language ) {
		$version = (string) $this->layout()['version'];
		return $language === $this->languages()['default'] ? $version : $version . '.' . $language;
	}

	/**
	 * Navigation: the bottom tabs and the page list.
	 *
	 * @param string $language Language code.
	 * @param string $platform android or ios.
	 * @return array
	 */
	public function navigation( $language, $platform ) {
		$this->resolver->context( $platform, get_current_user_id() );
		$tabs = array();
		foreach ( (array) $this->layout()['tabs'] as $raw ) {
			$tab = is_array( $raw ) ? $this->tab( Translator::apply( $raw, $language ) ) : null;
			if ( $tab ) {
				$tabs[] = $tab;
			}
		}
		if ( count( $tabs ) < 2 ) {
			// A layout whose tabs can't be shown on this site gets the default tabs.
			$tabs = array();
			foreach ( ( new Default_Layout( $this->plugin, $this->app_type ) )->build()['tabs'] as $raw ) {
				$tabs[] = $this->tab( $raw );
			}
		}
		$pages = array();
		foreach ( $this->pages() as $page ) {
			$page    = Translator::apply( $page, $language );
			$pages[] = array(
				'slug'       => $page['slug'],
				'title'      => self::title( $page ),
				'updated_at' => self::date( $page['updated_at'] ?? '' ),
			);
		}
		return array(
			'version' => $this->version( $language ),
			'tabs'    => array_slice( array_values( array_filter( $tabs ) ), 0, 5 ),
			'pages'   => $pages,
		);
	}

	/**
	 * One page with its blocks resolved for the current user, or null.
	 *
	 * @param string $slug     Page slug.
	 * @param string $language Language code.
	 * @param string $platform android or ios.
	 * @param int    $user_id  Current user, or 0.
	 * @return array|null AppPage.
	 */
	public function page( $slug, $language, $platform, $user_id ) {
		foreach ( $this->pages() as $page ) {
			if ( $page['slug'] !== $slug ) {
				continue;
			}
			$page   = Translator::apply( $page, $language );
			$blocks = array();
			foreach ( isset( $page['blocks'] ) && is_array( $page['blocks'] ) ? $page['blocks'] : array() as $block ) {
				if ( is_array( $block ) ) {
					$blocks[] = Translator::apply( $block, $language );
				}
			}
			return array(
				'slug'       => $page['slug'],
				'title'      => self::title( $page ),
				'updated_at' => self::date( $page['updated_at'] ?? '' ),
				'show_title' => isset( $page['show_title'] ) ? (bool) $page['show_title'] : true,
				'blocks'     => $this->resolver->resolve( $blocks, $platform, $user_id ),
			);
		}
		return null;
	}

	/**
	 * The layout's pages with a valid slug, each slug once.
	 *
	 * @return array[]
	 */
	private function pages() {
		$pages = array();
		foreach ( (array) $this->layout()['pages'] as $page ) {
			$slug = is_array( $page ) && isset( $page['slug'] ) && is_string( $page['slug'] ) ? $page['slug'] : '';
			if ( preg_match( Block_Resolver::SLUG, $slug ) && ! isset( $pages[ $slug ] ) ) {
				$pages[ $slug ] = $page;
			}
		}
		return array_values( $pages );
	}

	/**
	 * A NavTab, or null when its target can't be followed on this site.
	 *
	 * @param array $raw Tab, in the request's language.
	 * @return array|null
	 */
	private function tab( array $raw ) {
		$id     = Block_Resolver::text( $raw['id'] ?? null );
		$label  = Block_Resolver::text( $raw['label'] ?? null );
		$icon   = isset( $raw['icon'] ) && is_string( $raw['icon'] ) && preg_match( Block_Resolver::ICON, $raw['icon'] ) ? $raw['icon'] : null;
		$target = $this->resolver->action( $raw['target'] ?? null );
		if ( null === $id || null === $label || null === $icon || null === $target ) {
			return null;
		}
		return array(
			'id'     => $id,
			'label'  => $label,
			'icon'   => $icon,
			'target' => $target,
		);
	}

	/**
	 * A page's title.
	 *
	 * @param array $page Page.
	 * @return string
	 */
	private static function title( array $page ) {
		$title = Block_Resolver::text( $page['title'] ?? null );
		return null !== $title ? $title : '';
	}

	/**
	 * A date-time in UTC, ISO 8601.
	 *
	 * @param mixed $value Date from the layout.
	 * @return string
	 */
	private static function date( $value ) {
		$time = is_string( $value ) ? strtotime( $value ) : false;
		return gmdate( 'Y-m-d\TH:i:s\Z', false === $time ? 0 : $time );
	}
}
