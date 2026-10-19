<?php
/**
 * The pages an app gets before anything is published in the dashboard.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

use Yallapp\Plugin;
use Yallapp\Store\Catalog;

/**
 * Builds a Layout (docs/api/platform.yaml) from what the site has, following the plugin's
 * home screen settings: the same content as /home, /store/home or /bookings/home, as
 * page blocks. It goes through the same resolver as a published layout.
 */
class Default_Layout {

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * The type of the app asking (`app_type` on /pages), or ''.
	 *
	 * @var string
	 */
	private $requested;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin    Plugin.
	 * @param string $requested The type of the app asking (its build config's app_type), or ''.
	 */
	public function __construct( Plugin $plugin, $requested = '' ) {
		$this->plugin    = $plugin;
		$this->requested = (string) $requested;
	}

	/**
	 * The kind of app the site serves: the type of the app asking, so its tabs and lists
	 * are ones it can open; else the type the owner chose in the Yallapp dashboard (sent
	 * with the license status, so up to a license check late); else a guess from the
	 * plugins the site has.
	 *
	 * @return string lms, store, bookings, news or site.
	 */
	public function app_type() {
		$asked = self::chosen_type( array( 'app_type' => $this->requested ) );
		if ( null !== $asked ) {
			return $asked;
		}
		$chosen = self::chosen_type( $this->plugin->license()->status() );
		return null !== $chosen ? $chosen : $this->guessed_type();
	}

	/**
	 * The app type in the license status (`app_type`), in this class's words. Null when the
	 * platform doesn't say, or names a type WordPress doesn't serve. Pure.
	 *
	 * @param array $status License status.
	 * @return string|null lms, store, bookings, news or null.
	 */
	public static function chosen_type( $status ) {
		$types = array(
			'lms'     => 'lms',
			'store'   => 'store',
			'booking' => 'bookings',
			'news'    => 'news',
		);
		$type  = is_array( $status ) && isset( $status['app_type'] ) && is_string( $status['app_type'] ) ? $status['app_type'] : '';
		return $types[ $type ] ?? null;
	}

	/**
	 * The kind of app the site's plugins suggest.
	 *
	 * @return string lms, store, bookings or site.
	 */
	private function guessed_type() {
		if ( $this->plugin->lms() ) {
			return 'lms';
		}
		if ( Catalog::available() ) {
			return 'store';
		}
		if ( $this->plugin->bookings() ) {
			return 'bookings';
		}
		return 'site';
	}

	/**
	 * The default layout.
	 *
	 * @return array Layout shape, without appearance and languages.
	 */
	public function build() {
		$type = $this->app_type();
		if ( 'lms' === $type ) {
			$blocks = $this->lms_blocks();
		} elseif ( 'store' === $type ) {
			$blocks = $this->store_blocks();
		} elseif ( 'news' === $type ) {
			$blocks = self::news_blocks();
		} else {
			$blocks = $this->bookings_blocks( $type );
		}
		$layout = array(
			'appearance' => null,
			'languages'  => null,
			'tabs'       => $this->tabs( $type ),
			'pages'      => array(
				array(
					'slug'       => 'home',
					'title'      => __( 'Home', 'yallapp' ),
					'show_title' => false,
					'updated_at' => $this->updated_at( $type ),
					'blocks'     => $blocks,
				),
			),
		);
		// 43 Yallapp's Arabic and Turkish for the texts above, for apps asking in those languages.
		$layout = Builtin_Texts::layout( $layout );
		/**
		 * Filters the pages an app gets before a layout is published in the dashboard.
		 *
		 * @param array  $layout Layout shape, without its version.
		 * @param string $type   lms, store, bookings, news or site.
		 */
		$layout = (array) apply_filters( 'yallapp_default_layout', $layout, $type );
		// Changes whenever the tabs, the blocks or the site's content change.
		$layout['version'] = 'default.' . substr( md5( (string) wp_json_encode( $layout ) ), 0, 12 );
		return $layout;
	}

	/**
	 * Bottom tabs. Each opens a built-in screen except Home.
	 *
	 * @param string $type App type.
	 * @return array[]
	 */
	private function tabs( $type ) {
		$tabs = array( self::tab( 'home', __( 'Home', 'yallapp' ), 'home', self::page_action( 'home' ) ) );
		if ( 'lms' === $type ) {
			$tabs[] = self::tab( 'courses', __( 'Courses', 'yallapp' ), 'menu_book', self::screen( 'courses' ) );
			$tabs[] = self::tab( 'my-courses', __( 'My courses', 'yallapp' ), 'play_circle', self::screen( 'my_courses' ) );
		} elseif ( 'store' === $type ) {
			$tabs[] = self::tab( 'shop', __( 'Shop', 'yallapp' ), 'storefront', self::screen( 'search' ) );
			$tabs[] = self::tab( 'cart', __( 'Cart', 'yallapp' ), 'shopping_cart', self::screen( 'cart' ) );
		} elseif ( 'bookings' === $type ) {
			$tabs[] = self::tab( 'book', __( 'Book', 'yallapp' ), 'event_available', self::screen( 'services' ) );
			$tabs[] = self::tab( 'appointments', __( 'Appointments', 'yallapp' ), 'event_note', self::screen( 'appointments' ) );
		} elseif ( 'news' === $type ) {
			$tabs[] = self::tab( 'articles', __( 'Latest', 'yallapp' ), 'newspaper', self::screen( 'articles' ) );
			$tabs[] = self::tab( 'saved', __( 'Saved', 'yallapp' ), 'bookmark', self::screen( 'bookmarks' ) );
		}
		$tabs[] = self::tab( 'account', __( 'Account', 'yallapp' ), 'person', self::screen( 'account' ) );
		return $tabs;
	}

	/**
	 * Home blocks for an academy, in the order of the home screen settings.
	 *
	 * @return array[]
	 */
	private function lms_blocks() {
		$settings = $this->plugin->settings();
		$sections = (array) $settings->get( 'home_sections' );
		$blocks   = array( self::search( 'courses', __( 'Search courses', 'yallapp' ) ) );
		foreach ( $sections as $section ) {
			if ( 'banner' === $section ) {
				$course   = (int) $settings->get( 'banner_course_id' );
				$blocks[] = $this->banner(
					(int) $settings->get( 'banner_image_id' ),
					$course ? array(
						'type'      => 'course',
						'course_id' => $course,
					) : null
				);
			} elseif ( 'continue_learning' === $section ) {
				$blocks[] = self::block( 'continue-learning', 'continue_learning', __( 'Continue learning', 'yallapp' ), array(), 'signed_in' );
			} elseif ( 'categories' === $section ) {
				$blocks[] = self::block( 'categories', 'categories', __( 'Categories', 'yallapp' ), array( 'source' => 'courses' ) );
			} elseif ( 'featured_courses' === $section ) {
				$blocks[] = self::items( 'featured-courses', 'courses', __( 'Featured courses', 'yallapp' ), array( 'featured' => true ), self::screen( 'courses' ) );
			} elseif ( 'latest_courses' === $section ) {
				$blocks[] = self::items( 'latest-courses', 'courses', __( 'Latest courses', 'yallapp' ), array(), self::screen( 'courses' ) );
			}
		}
		// Featured courses are hand-picked; without any, the home still lists courses.
		$featured = in_array( 'featured_courses', $sections, true ) && $settings->get( 'featured_course_ids' );
		if ( ! $featured && ! in_array( 'latest_courses', $sections, true ) ) {
			$blocks[] = self::items( 'latest-courses', 'courses', __( 'Latest courses', 'yallapp' ), array(), self::screen( 'courses' ) );
		}
		return array_values( array_filter( $blocks ) );
	}

	/**
	 * Home blocks for a News & blog app: search, the top stories (sticky posts), the
	 * sections and the latest posts, all opened in the app. Pure.
	 *
	 * @return array[]
	 */
	public static function news_blocks() {
		return array(
			self::search( 'articles', __( 'Search articles', 'yallapp' ) ),
			self::items(
				'top-stories',
				'articles',
				__( 'Top stories', 'yallapp' ),
				array(
					'featured' => true,
					'limit'    => 5,
				),
				null
			),
			self::block(
				'categories',
				'categories',
				__( 'Sections', 'yallapp' ),
				array(
					'source' => 'articles',
					'style'  => 'chips',
				)
			),
			self::items( 'latest', 'articles', __( 'Latest', 'yallapp' ), array(), self::screen( 'articles' ), 'list' ),
		);
	}

	/**
	 * Home blocks for a shop, in the order of the store home screen settings.
	 *
	 * @return array[]
	 */
	private function store_blocks() {
		$settings = $this->plugin->settings();
		$blocks   = array( self::search( 'products', __( 'Search products', 'yallapp' ) ) );
		$lists    = array(
			'featured_products' => array( 'featured-products', __( 'Featured', 'yallapp' ), array( 'featured' => true ) ),
			'new_products'      => array( 'new-products', __( 'New arrivals', 'yallapp' ), array() ),
			'best_sellers'      => array( 'best-sellers', __( 'Best sellers', 'yallapp' ), array( 'sort' => 'popular' ) ),
		);
		foreach ( (array) $settings->get( 'store_home_sections' ) as $section ) {
			if ( 'banner' === $section ) {
				$product  = (int) $settings->get( 'store_banner_product_id' );
				$action   = $product ? array(
					'type' => 'item',
					'item' => array(
						'source' => 'products',
						'id'     => (string) $product,
					),
				) : null;
				$blocks[] = $this->banner( (int) $settings->get( 'store_banner_image_id' ), $action );
			} elseif ( 'categories' === $section ) {
				$blocks[] = self::block( 'categories', 'categories', __( 'Categories', 'yallapp' ), array( 'source' => 'products' ) );
			} elseif ( isset( $lists[ $section ] ) ) {
				$blocks[] = self::items( $lists[ $section ][0], 'products', $lists[ $section ][1], $lists[ $section ][2], self::screen( 'search' ) );
			}
		}
		return array_values( array_filter( $blocks ) );
	}

	/**
	 * Home blocks for a bookings app: the banner, the services and the latest posts. A site
	 * with neither an LMS, a shop nor a booking plugin gets the latest posts.
	 *
	 * @param string $type bookings or site.
	 * @return array[]
	 */
	private function bookings_blocks( $type ) {
		$settings = $this->plugin->settings();
		$blocks   = array();
		if ( 'bookings' === $type ) {
			if ( in_array( 'banner', (array) $settings->get( 'bookings_home_sections' ), true ) ) {
				$service  = (int) $settings->get( 'bookings_banner_service_id' );
				$action   = $service ? array(
					'type' => 'item',
					'item' => array(
						'source' => 'services',
						'id'     => (string) $service,
					),
				) : null;
				$blocks[] = $this->banner( (int) $settings->get( 'bookings_banner_image_id' ), $action );
			}
			$blocks[] = self::items( 'services', 'services', __( 'Services', 'yallapp' ), array(), self::screen( 'services' ) );
		}
		$blocks[] = self::items( 'latest-posts', 'posts', __( 'Latest posts', 'yallapp' ), array(), null );
		return array_values( array_filter( $blocks ) );
	}

	/**
	 * When the content on the home page last changed.
	 *
	 * @param string $type App type.
	 * @return string ISO 8601 in UTC.
	 */
	private function updated_at( $type ) {
		$types = array( 'post' );
		$lms   = $this->plugin->lms();
		if ( 'lms' === $type && $lms ) {
			$types[] = $lms->post_types()['course'];
		} elseif ( 'store' === $type ) {
			$types[] = 'product';
		}
		$latest = 0;
		foreach ( $types as $post_type ) {
			$modified = get_lastpostmodified( 'gmt', $post_type );
			if ( $modified ) {
				$latest = max( $latest, (int) strtotime( $modified . ' UTC' ) );
			}
		}
		return gmdate( 'Y-m-d\TH:i:s\Z', $latest );
	}

	/**
	 * A banner block, or null without an image.
	 *
	 * @param int        $image_id Attachment ID.
	 * @param array|null $action   Action on tap.
	 * @return array|null
	 */
	private function banner( $image_id, $action ) {
		$image = $image_id ? wp_get_attachment_url( $image_id ) : false;
		if ( ! $image ) {
			return null;
		}
		$fields = array( 'image_url' => $image );
		if ( $action ) {
			$fields['action'] = $action;
		}
		return self::block( 'banner', 'banner', null, $fields );
	}

	/**
	 * A LayoutBlock.
	 *
	 * @param string      $id         ID.
	 * @param string      $type       Block type.
	 * @param string|null $title      Title.
	 * @param array       $fields     Type-specific fields.
	 * @param string      $visibility everyone, signed_in or signed_out.
	 * @return array
	 */
	private static function block( $id, $type, $title, array $fields, $visibility = 'everyone' ) {
		return array_merge(
			array(
				'id'         => $id,
				'type'       => $type,
				'visibility' => $visibility,
				'title'      => $title,
			),
			$fields
		);
	}

	/**
	 * An items block.
	 *
	 * @param string     $id      ID.
	 * @param string     $source  Item source.
	 * @param string     $title   Title.
	 * @param array      $query   Query besides the limit.
	 * @param array|null $see_all Action for "See all".
	 * @param string     $layout  carousel, grid or list.
	 * @return array
	 */
	private static function items( $id, $source, $title, array $query, $see_all, $layout = 'carousel' ) {
		$fields = array(
			'source' => $source,
			'layout' => $layout,
			'query'  => array_merge(
				array(
					'sort'  => 'newest',
					'limit' => 10,
				),
				$query
			),
		);
		if ( $see_all ) {
			$fields['see_all'] = $see_all;
		}
		return self::block( $id, 'items', $title, $fields );
	}

	/**
	 * A search block.
	 *
	 * @param string $source      Item source.
	 * @param string $placeholder Placeholder.
	 * @return array
	 */
	private static function search( $source, $placeholder ) {
		return self::block(
			'search',
			'search',
			null,
			array(
				'source'      => $source,
				'placeholder' => $placeholder,
			)
		);
	}

	/**
	 * A tab.
	 *
	 * @param string $id     ID.
	 * @param string $label  Label.
	 * @param string $icon   Material Symbols name.
	 * @param array  $target Action.
	 * @return array
	 */
	private static function tab( $id, $label, $icon, array $target ) {
		return array(
			'id'     => $id,
			'label'  => $label,
			'icon'   => $icon,
			'target' => $target,
		);
	}

	/**
	 * Action that opens a page.
	 *
	 * @param string $slug Page slug.
	 * @return array
	 */
	private static function page_action( $slug ) {
		return array(
			'type'      => 'page',
			'page_slug' => $slug,
		);
	}

	/**
	 * Action that opens a built-in screen.
	 *
	 * @param string $screen Screen.
	 * @return array
	 */
	private static function screen( $screen ) {
		return array(
			'type'   => 'screen',
			'screen' => $screen,
		);
	}
}
