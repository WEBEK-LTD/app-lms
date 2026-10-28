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
	 * 101 The header's layouts and buttons (`AppHeader`).
	 */
	const HEADER_LAYOUTS = array( 'title', 'centered', 'logo', 'search' );
	const HEADER_ICONS   = array( 'search', 'cart', 'notifications', 'chat', 'account' );

	/**
	 * 97.1 The Appearance fields naming a free font, each with the field of its files.
	 */
	const FONTS = array(
		'font_family' => 'font_files',
		'arabic_font' => 'arabic_font_files',
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
		$color      = isset( $raw['secondary_color'] ) && is_string( $raw['secondary_color'] ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $raw['secondary_color'] ) ? strtoupper( $raw['secondary_color'] ) : null;
		$appearance = array(
			'template'             => $look['template'],
			'theme_mode'           => $look['theme_mode'],
			'user_can_change_mode' => $raw['user_can_change_mode'],
			'secondary_color'      => $color,
			'font'                 => $look['font'],
			'corners'              => $look['corners'],
			'cards'                => $look['cards'],
		);
		// 97.1 A free font and the Arabic text's font, with their files on Yallapp: passed on as
		// the platform sent them, each only when its name and files are well formed.
		foreach ( self::FONTS as $name => $files ) {
			$family = $raw[ $name ] ?? null;
			if ( ! is_string( $family ) || ! preg_match( '/^[A-Za-z0-9 ]{1,64}$/', $family ) ) {
				continue;
			}
			$appearance[ $name ] = $family;
			$list                = self::font_files( $raw[ $files ] ?? null );
			if ( $list ) {
				$appearance[ $files ] = $list;
			}
		}
		// 97.3 The Figma look's main color and logo, over the site's branding.
		if ( isset( $raw['primary_color'] ) && is_string( $raw['primary_color'] ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $raw['primary_color'] ) ) {
			$appearance['primary_color'] = strtoupper( $raw['primary_color'] );
		}
		if ( isset( $raw['logo_url'] ) && is_string( $raw['logo_url'] ) && preg_match( '#^https://[^\s"\'<>\\\\]{1,490}$#', $raw['logo_url'] ) ) {
			$appearance['logo_url'] = $raw['logo_url'];
		}
		// 101 The header of the pages in the bottom tabs; without it, the template's.
		$header = self::header( $raw['header'] ?? null );
		if ( $header ) {
			$appearance['header'] = $header;
		}
		return $appearance;
	}

	/**
	 * 101 The header as the platform sent it: a known layout, and its known buttons each once,
	 * at most four. An unknown layout drops it.
	 *
	 * @param mixed $raw The stored header.
	 * @return array{layout: string, icons: string[]}|null
	 */
	private static function header( $raw ) {
		if ( ! is_array( $raw ) || ! in_array( $raw['layout'] ?? null, self::HEADER_LAYOUTS, true ) ) {
			return null;
		}
		$icons = array();
		foreach ( is_array( $raw['icons'] ?? null ) ? $raw['icons'] : array() as $icon ) {
			if ( in_array( $icon, self::HEADER_ICONS, true ) && ! in_array( $icon, $icons, true ) ) {
				$icons[] = $icon;
			}
		}
		return array(
			'layout' => $raw['layout'],
			'icons'  => array_slice( $icons, 0, 4 ),
		);
	}

	/**
	 * A font's files as the platform sent them: up to four, each an https address and a
	 * weight (null for a variable file). Anything else drops them all.
	 *
	 * @param mixed $raw Stored files.
	 * @return array
	 */
	private static function font_files( $raw ) {
		if ( ! is_array( $raw ) || count( $raw ) > 4 ) {
			return array();
		}
		$files = array();
		foreach ( $raw as $file ) {
			$url    = is_array( $file ) ? ( $file['url'] ?? null ) : null;
			$weight = is_array( $file ) && array_key_exists( 'weight', $file ) ? $file['weight'] : false;
			if ( ! is_string( $url ) || ! preg_match( '#^https://[^\s"\'<>\\\\]{1,490}$#', $url ) ) {
				return array();
			}
			if ( null !== $weight && ! ( is_int( $weight ) && $weight >= 100 && $weight <= 900 ) ) {
				return array();
			}
			$files[] = array(
				'url'    => $url,
				'weight' => $weight,
			);
		}
		return $files;
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
	 * Navigation: the bottom tabs, the side menu and the page list.
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
		// 82.5 The side menu: the entries the site can open, none when the layout has none.
		$menu = array();
		foreach ( isset( $this->layout()['menu'] ) && is_array( $this->layout()['menu'] ) ? $this->layout()['menu'] : array() as $raw ) {
			$entry = is_array( $raw ) ? $this->tab( Translator::apply( $raw, $language ) ) : null;
			if ( $entry ) {
				$menu[] = $entry;
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
			'menu'    => array_slice( $menu, 0, 12 ),
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
			$served = array(
				'slug'       => $page['slug'],
				'title'      => self::title( $page ),
				'updated_at' => self::date( $page['updated_at'] ?? '' ),
				'show_title' => isset( $page['show_title'] ) ? (bool) $page['show_title'] : true,
			) + self::page_look( $page ) + array(
				'blocks' => $this->resolver->resolve( $blocks, $platform, $user_id, $language ),
			);
			// 103R A Studio page: its header and elements in the language asked for.
			if ( isset( $page['studio'] ) && is_array( $page['studio'] ) ) {
				$studio = $this->resolver->studio( $page['studio'], $platform, $user_id, $language );
				if ( $studio ) {
					$served['studio'] = $studio;
				}
			}
			return $served;
		}
		return null;
	}

	/**
	 * 99.4 A form block on a published page, for its answers: the block's title, then its
	 * fields as the app gets them, with the texts in the app's default language (the email
	 * goes to the business). Null when the page has no such form, or the form isn't on the
	 * page for this person now (`visibility`, and `show` by date and language; the request
	 * names no platform).
	 *
	 * @param string $slug     Page slug.
	 * @param string $block_id The form block's id.
	 * @param string $language The language asked for.
	 * @param int    $user_id  Current user, or 0.
	 * @return array|null `title`, then FormBlock's fields.
	 */
	public function form( $slug, $block_id, $language, $user_id ) {
		foreach ( $this->pages() as $page ) {
			if ( $page['slug'] !== $slug ) {
				continue;
			}
			foreach ( isset( $page['blocks'] ) && is_array( $page['blocks'] ) ? $page['blocks'] : array() as $raw ) {
				if ( ! is_array( $raw ) || 'form' !== ( $raw['type'] ?? null ) || Block_Resolver::text( $raw['id'] ?? null ) !== $block_id ) {
					continue;
				}
				$show = isset( $raw['show'] ) && is_array( $raw['show'] ) ? array_diff_key( $raw['show'], array( 'platforms' => true ) ) : null;
				if ( ! Block_Resolver::visible_to( $raw['visibility'] ?? 'everyone', $user_id ) || ! Block_Resolver::shows( $show, '', $language, time() ) ) {
					return null;
				}
				$block  = Translator::apply( $raw, $this->languages()['default'] );
				$fields = Rich_Blocks::fields( 'form', $block, array( $this->resolver, 'action' ), time() );
				return null === $fields ? null : array( 'title' => Block_Resolver::text( $block['title'] ?? null ) ) + $fields;
			}
			// 103R A form element of a Studio page.
			$node = is_array( $page['studio']['body'] ?? null ) ? self::studio_form( $page['studio']['body'], $block_id, 0 ) : null;
			if ( null === $node || ! Block_Resolver::visible_to( $node['visibility'] ?? 'everyone', $user_id ) ) {
				return null;
			}
			$fields = Rich_Blocks::fields( 'form', Translator::apply( $node['form'], $this->languages()['default'] ), array( $this->resolver, 'action' ), time() );
			return null === $fields ? null : array( 'title' => self::title( $page ) ) + $fields;
		}
		return null;
	}

	/**
	 * 103R The form element with this id in a Studio page's tree, or null.
	 *
	 * @param array  $node     An element.
	 * @param string $block_id The form's id.
	 * @param int    $depth    How deep the element is.
	 * @return array|null
	 */
	private static function studio_form( array $node, $block_id, $depth ) {
		if ( $depth > Block_Resolver::STUDIO_MAX_DEPTH ) {
			return null;
		}
		if ( 'form' === ( $node['type'] ?? null ) && ( $node['id'] ?? null ) === $block_id && is_array( $node['form'] ?? null ) ) {
			return $node;
		}
		foreach ( isset( $node['children'] ) && is_array( $node['children'] ) ? $node['children'] : array() as $child ) {
			$found = is_array( $child ) ? self::studio_form( $child, $block_id, $depth + 1 ) : null;
			if ( null !== $found ) {
				return $found;
			}
		}
		return null;
	}

	/**
	 * 99.3 A page's background (none, tint or surface) and the picture across its top (an
	 * https URL, or null). Pure.
	 *
	 * @param array $page LayoutPage.
	 * @return array{background: string, header_image_url: string|null}
	 */
	public static function page_look( array $page ) {
		$background = $page['background'] ?? null;
		return array(
			'background'       => in_array( $background, array( 'none', 'tint', 'surface' ), true ) ? $background : 'none',
			'header_image_url' => Block_Resolver::https_url( $page['header_image_url'] ?? null ),
		);
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
			'id'       => $id,
			'label'    => $label,
			'icon'     => $icon,
			'icon_url' => Block_Resolver::icon_url( $raw['icon_url'] ?? null ),
			'target'   => $target,
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
