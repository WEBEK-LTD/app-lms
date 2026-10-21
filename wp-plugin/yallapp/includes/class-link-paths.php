<?php
/**
 * The site's own pages that open the app (roadmap 48).
 *
 * @package Yallapp
 */

namespace Yallapp;

defined( 'ABSPATH' ) || exit;

/**
 * Which of the site's own addresses (its permalinks) open the app, and which never do
 * (docs/api/openapi.yaml, tag Links):
 *
 * - for the app type, the permalink bases of what the app shows: courses and lessons (Academy),
 *   products and product categories (Store), posts (News & blog) and the pages with a booking
 *   plugin's form (Bookings);
 * - before them, what stays on the website: wp-admin, wp-login.php, the REST API, feeds, the
 *   cart, checkout, account and payment pages, and addresses with `add-to-cart` and the like;
 * - the bases that start with a fixed folder, for Android's intent filters (no exclusions
 *   there), reported to the platform with the license check (`SiteInfo.link_paths`).
 */
class Link_Paths {

	/** Most paths reported for Android. */
	const MAX_ANDROID = 20;

	/** Paths under the site that never open the app (iOS `exclude`). */
	const EXCLUDED = array(
		'/wp-admin/*',
		'/wp-login.php*',
		'/wp-json/*',
		'/wp-content/*',
		'/wp-includes/*',
		'/wp-cron.php*',
		'/xmlrpc.php*',
		'/wp-sitemap*',
		'/feed*',
		'*/feed/*',
		'*/feed',
		'*/embed/*',
		'*/trackback/*',
		'/comments/*',
		'/page/*',
		'/search/*',
		'/author/*',
		'/.well-known/*',
	);

	/** Query keys that keep an address on the website. */
	const EXCLUDED_QUERY = array( 'add-to-cart', 'wc-api', 'rest_route', 'preview', 'preview_id', 's', 'customize_changeset_uuid', 'key', 'action' );

	/** Shortcodes of the booking plugins' forms, by adapter ID. */
	const BOOKING_SHORTCODES = array(
		'amelia'       => array( 'ameliabooking', 'ameliastepbooking', 'ameliacatalog', 'ameliacatalogbooking' ),
		'bookingpress' => array( 'bookingpress_form' ),
		'latepoint'    => array( 'latepoint_book_form', 'latepoint_book_button', 'latepoint_resources' ),
	);

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * The app's type on this site: the owner's choice, else what the site's plugins fit.
	 *
	 * @return string|null lms, store, bookings, news or null.
	 */
	public function app_type() {
		return Admin\Settings_Page::app_type_for(
			Pages\Default_Layout::chosen_type( $this->plugin->license()->status() ),
			null !== $this->plugin->lms(),
			Store\Catalog::available(),
			null !== $this->plugin->bookings()
		);
	}

	/**
	 * What opens the app on this site: each entry's kind, its iOS pattern, its Android prefix
	 * (null when its permalinks start at the root) and the post types or taxonomy it names.
	 * Empty with plain permalinks (`?p=12`): those addresses can't be told apart by path.
	 *
	 * @return array[] Each: kind, pattern, prefix, post_types, taxonomy.
	 */
	public function entries() {
		if ( '' === (string) get_option( 'permalink_structure' ) ) {
			return array();
		}
		$home    = self::home_path();
		$entries = array();
		$type    = $this->app_type();
		if ( 'lms' === $type && $this->plugin->lms() ) {
			$types = $this->plugin->lms()->post_types();
			// A lesson's address may sit under its course's (Tutor LMS: /courses/<course>/lessons/<lesson>/).
			$entries = array_merge( $entries, $this->post_type_entries( 'course', $types['course'], array( $types['course'], $types['lesson'] ), $home ) );
			$entries = array_merge( $entries, $this->post_type_entries( 'lesson', $types['lesson'], array( $types['lesson'] ), $home ) );
		} elseif ( 'store' === $type ) {
			$entries   = array_merge( $entries, $this->post_type_entries( 'product', 'product', array( 'product' ), $home ) );
			$entries[] = $this->taxonomy_entry( 'product_category', 'product_cat', $home );
		} elseif ( 'news' === $type ) {
			$entries[] = self::structure_entry( 'article', (string) get_option( 'permalink_structure' ), $home, array( 'post' ) );
		} elseif ( 'bookings' === $type ) {
			foreach ( $this->booking_pages() as $page ) {
				$path      = (string) wp_parse_url( (string) get_permalink( $page ), PHP_URL_PATH );
				$entries[] = array(
					'kind'       => 'bookings',
					'pattern'    => $path,
					'prefix'     => self::valid_prefix( $path ),
					'post_types' => array( 'page' ),
					'taxonomy'   => null,
				);
			}
		}
		return array_values( array_filter( $entries ) );
	}

	/**
	 * The paths reported for Android's intent filters. Pure.
	 *
	 * @param array[] $entries What entries() gives.
	 * @return string[]
	 */
	public static function android_paths( array $entries ) {
		$paths = array();
		foreach ( $entries as $entry ) {
			if ( ! empty( $entry['prefix'] ) ) {
				$paths[] = (string) $entry['prefix'];
			}
		}
		$paths = array_values( array_unique( $paths ) );
		sort( $paths );
		// A path inside another one adds nothing.
		$kept = array();
		foreach ( $paths as $path ) {
			$covered = false;
			foreach ( $kept as $outer ) {
				if ( 0 === strpos( $path, $outer ) ) {
					$covered = true;
					break;
				}
			}
			if ( ! $covered ) {
				$kept[] = $path;
			}
		}
		return array_slice( $kept, 0, self::MAX_ANDROID );
	}

	/**
	 * The `components` of the site's apple-app-site-association: what stays on the website
	 * first (iOS takes the first match), then `/a/*` and the site's own pages. Pure.
	 *
	 * @param string   $home_path     The site's path, like `/` or `/learn/`.
	 * @param string[] $patterns      The entries' patterns, already with the site's path.
	 * @param string[] $page_paths    The cart, checkout, account and payment pages' paths.
	 * @return array[]
	 */
	public static function components( $home_path, array $patterns, array $page_paths = array() ) {
		$base       = rtrim( (string) $home_path, '/' );
		$components = array();
		if ( $patterns ) {
			foreach ( self::EXCLUDED_QUERY as $key ) {
				$components[] = array(
					'?'       => array( $key => '*' ),
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
					'exclude' => true,
				);
			}
			// The home page itself, then the site's own paths.
			$components[] = array(
				'/'       => $base . '/',
				// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
				'exclude' => true,
			);
			foreach ( self::EXCLUDED as $path ) {
				$components[] = array(
					'/'       => 0 === strpos( $path, '*' ) ? $path : $base . $path,
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
					'exclude' => true,
				);
			}
			foreach ( array_unique( $page_paths ) as $path ) {
				$path = '/' . trim( (string) $path, '/' );
				if ( '/' === $path ) {
					continue;
				}
				$components[] = array(
					'/'       => $path . '/*',
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
					'exclude' => true,
				);
				$components[] = array(
					'/'       => $path,
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
					'exclude' => true,
				);
			}
		}
		$components[] = array( '/' => $base . '/a/*' );
		foreach ( array_unique( $patterns ) as $pattern ) {
			$components[] = array( '/' => (string) $pattern );
		}
		return $components;
	}

	/**
	 * Whether an address stays on the website: an excluded path or query, or one of the pages.
	 * Pure (the same rules as components()).
	 *
	 * @param string   $path       Path.
	 * @param array    $query      Query arguments.
	 * @param string   $home_path  The site's path.
	 * @param string[] $page_paths Excluded pages' paths.
	 * @return bool
	 */
	public static function is_excluded( $path, array $query, $home_path = '/', array $page_paths = array() ) {
		foreach ( self::EXCLUDED_QUERY as $key ) {
			if ( array_key_exists( $key, $query ) ) {
				return true;
			}
		}
		$base = rtrim( (string) $home_path, '/' );
		if ( rtrim( $path, '/' ) === $base ) {
			return true;
		}
		foreach ( self::EXCLUDED as $pattern ) {
			if ( self::glob( 0 === strpos( $pattern, '*' ) ? $pattern : $base . $pattern, $path ) ) {
				return true;
			}
		}
		foreach ( $page_paths as $page ) {
			$page = '/' . trim( (string) $page, '/' );
			if ( '/' !== $page && ( rtrim( $path, '/' ) === $page || 0 === strpos( $path, $page . '/' ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether a path matches a pattern as iOS reads it (`*` any characters, `?` one). Pure.
	 *
	 * @param string $pattern Pattern.
	 * @param string $path    Path.
	 * @return bool
	 */
	public static function glob( $pattern, $path ) {
		$regex = '#^' . str_replace( array( '\*', '\?' ), array( '.*', '.' ), preg_quote( (string) $pattern, '#' ) ) . '$#';
		return 1 === preg_match( $regex, (string) $path );
	}

	/**
	 * A permalink structure (or a post type's base) as an iOS pattern: each tag a wildcard
	 * (`%year%` four characters, the other date parts two), anything after it allowed. Pure.
	 *
	 * @param string $structure Like `/blog/%postname%/` or `/courses/`.
	 * @return string Like `/blog/*`.
	 */
	public static function structure_pattern( $structure ) {
		$structure = '/' . ltrim( (string) $structure, '/' );
		$last      = strrpos( $structure, '%' );
		$fixed     = false === $last ? rtrim( $structure, '/' ) . '/' : substr( $structure, 0, $last + 1 );
		$pattern   = preg_replace_callback(
			'/%([a-z_]+)%/',
			static function ( $tag ) {
				if ( 'year' === $tag[1] ) {
					return '????';
				}
				return in_array( $tag[1], array( 'monthnum', 'day', 'hour', 'minute', 'second' ), true ) ? '??' : '*';
			},
			$fixed
		);
		return (string) preg_replace( '#\*+#', '*', $pattern . '*' );
	}

	/**
	 * The fixed folder a structure starts with, or null when it starts at the root (an intent
	 * filter for it would take every page of the site). Pure.
	 *
	 * @param string $structure Like `/blog/%postname%/`.
	 * @return string|null Like `/blog/`.
	 */
	public static function fixed_prefix( $structure ) {
		$structure = '/' . ltrim( (string) $structure, '/' );
		$tag       = strpos( $structure, '%' );
		$fixed     = false === $tag ? rtrim( $structure, '/' ) . '/' : substr( $structure, 0, $tag );
		$fixed     = substr( $fixed, 0, (int) strrpos( $fixed, '/' ) + 1 );
		return self::valid_prefix( $fixed );
	}

	/**
	 * A path that can be an Android prefix: at least one folder, plain characters, at most 100.
	 * Pure.
	 *
	 * @param string $path Path.
	 * @return string|null
	 */
	public static function valid_prefix( $path ) {
		$path = (string) $path;
		return strlen( $path ) <= 100 && preg_match( '#^/([A-Za-z0-9._~%-]+/)+$#', $path ) && ! preg_match( '#/\.\.?/#', $path ) ? $path : null;
	}

	/**
	 * An entry from a permalink structure. Pure.
	 *
	 * @param string   $kind       Kind.
	 * @param string   $structure  Structure, like `/%postname%/`.
	 * @param string   $home_path  The site's path.
	 * @param string[] $post_types Post types it names.
	 * @return array
	 */
	public static function structure_entry( $kind, $structure, $home_path, array $post_types ) {
		$full = rtrim( (string) $home_path, '/' ) . '/' . ltrim( (string) $structure, '/' );
		return array(
			'kind'       => $kind,
			'pattern'    => self::structure_pattern( $full ),
			'prefix'     => self::fixed_prefix( $full ),
			'post_types' => $post_types,
			'taxonomy'   => null,
		);
	}

	/**
	 * The entries for a post type: its own base (its rewrite slug, after the front when it
	 * asks), and, when a published item's permalink doesn't follow it (Tutor LMS's lessons sit
	 * under their course, outside the front), the first folder of that permalink.
	 *
	 * @param string   $kind       Kind.
	 * @param string   $type       Post type.
	 * @param string[] $post_types Post types it names.
	 * @param string   $home_path  The site's path.
	 * @return array[]
	 */
	private function post_type_entries( $kind, $type, array $post_types, $home_path ) {
		$object = get_post_type_object( (string) $type );
		if ( ! $object || ! $object->public || empty( $object->rewrite['slug'] ) ) {
			return array();
		}
		$entries = array( self::structure_entry( $kind, self::with_front( (string) $object->rewrite['slug'], ! empty( $object->rewrite['with_front'] ) ), $home_path, $post_types ) );
		$sample  = get_posts(
			array(
				'post_type'      => $type,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);
		$path    = $sample ? (string) wp_parse_url( (string) get_permalink( (int) $sample[0] ), PHP_URL_PATH ) : '';
		$folder  = self::sample_folder( $path, $home_path );
		if ( '' !== $path && ! self::glob( $entries[0]['pattern'], $path ) && null !== $folder ) {
			$entries[] = array(
				'kind'       => $kind,
				'pattern'    => $folder . '*',
				'prefix'     => $folder,
				'post_types' => $post_types,
				'taxonomy'   => null,
			);
		}
		return $entries;
	}

	/**
	 * The first folder of a permalink after the site's path, when the permalink has more
	 * after it (`/courses/` of `/courses/intro/lessons/one/`), else null. Pure.
	 *
	 * @param string $path      A permalink's path.
	 * @param string $home_path The site's path.
	 * @return string|null
	 */
	public static function sample_folder( $path, $home_path = '/' ) {
		$base = rtrim( (string) $home_path, '/' ) . '/';
		if ( 0 !== strpos( (string) $path, $base ) ) {
			return null;
		}
		$parts = array_values( array_filter( explode( '/', substr( (string) $path, strlen( $base ) ) ), 'strlen' ) );
		return count( $parts ) >= 2 ? self::valid_prefix( $base . $parts[0] . '/' ) : null;
	}

	/**
	 * An entry for a taxonomy's base.
	 *
	 * @param string $kind      Kind.
	 * @param string $taxonomy  Taxonomy.
	 * @param string $home_path The site's path.
	 * @return array|null
	 */
	private function taxonomy_entry( $kind, $taxonomy, $home_path ) {
		$object = get_taxonomy( $taxonomy );
		if ( ! $object || ! $object->public || empty( $object->rewrite['slug'] ) ) {
			return null;
		}
		$entry             = self::structure_entry( $kind, self::with_front( (string) $object->rewrite['slug'], ! empty( $object->rewrite['with_front'] ) ), $home_path, array() );
		$entry['taxonomy'] = $taxonomy;
		return $entry;
	}

	/**
	 * A base after the permalinks' front (`/blog/` in `/blog/%postname%/`) when it asks for it.
	 *
	 * @param string $slug       Base.
	 * @param bool   $with_front Whether the front comes first.
	 * @return string
	 */
	private static function with_front( $slug, $with_front ) {
		global $wp_rewrite;
		$front = $with_front && $wp_rewrite && is_string( $wp_rewrite->front ) ? $wp_rewrite->front : '/';
		return '/' . trim( $front, '/' ) . '/' . trim( $slug, '/' ) . '/';
	}

	/**
	 * The site's path, like `/` or `/learn/`.
	 *
	 * @return string
	 */
	public static function home_path() {
		return '/' . ltrim( trailingslashit( (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ) ), '/' );
	}

	/**
	 * Published pages with the booking plugin's form (at most 10).
	 *
	 * @return \WP_Post[]
	 */
	public function booking_pages() {
		$adapter = $this->plugin->bookings();
		$codes   = $adapter ? ( self::BOOKING_SHORTCODES[ $adapter->id() ] ?? array() ) : array();
		if ( ! $codes ) {
			return array();
		}
		global $wpdb;
		$likes = implode( ' OR ', array_fill( 0, count( $codes ), 'post_content LIKE %s' ) );
		$args  = array_map(
			static function ( $code ) use ( $wpdb ) {
				return '%[' . $wpdb->esc_like( $code ) . '%';
			},
			$codes
		);
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- The placeholders are in $likes, built above; read at link-file and license-check time only.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish' AND post_password = '' AND ( {$likes} ) ORDER BY ID LIMIT 10", $args ) );
		return array_values( array_filter( array_map( 'get_post', array_map( 'intval', (array) $ids ) ) ) );
	}

	/**
	 * The service a booking form is for, from its shortcode (`service`, `service_id`), or 0. Pure.
	 *
	 * @param string   $content Page content.
	 * @param string[] $codes   The adapter's shortcodes.
	 * @return int
	 */
	public static function booking_service( $content, array $codes ) {
		foreach ( $codes as $code ) {
			if ( preg_match( '/\[' . preg_quote( $code, '/' ) . '\b([^\]]*)\]/', (string) $content, $match )
				&& preg_match( '/\b(?:service|service_id|selected_service)\s*=\s*["\']?(\d+)/', $match[1], $id ) ) {
				return (int) $id[1];
			}
		}
		return 0;
	}

	/**
	 * The paths of the pages that stay on the website: the cart, checkout, account and payment
	 * pages of WooCommerce and the course plugins, and any the `yallapp_link_excluded_page_ids`
	 * filter adds.
	 *
	 * @return string[]
	 */
	public function excluded_page_paths() {
		$ids = array();
		if ( function_exists( 'wc_get_page_id' ) ) {
			foreach ( array( 'cart', 'checkout', 'myaccount' ) as $page ) {
				$ids[] = (int) wc_get_page_id( $page );
			}
		}
		if ( function_exists( 'tutor_utils' ) ) {
			foreach ( array( 'tutor_dashboard_page_id', 'tutor_cart_page_id', 'tutor_checkout_page_id' ) as $option ) {
				$ids[] = (int) tutor_utils()->get_option( $option );
			}
		}
		foreach ( array( 'learn_press_checkout_page_id', 'learn_press_profile_page_id', 'lifterlms_checkout_page_id', 'lifterlms_myaccount_page_id', 'masteriyo_checkout_page_id', 'masteriyo_account_page_id' ) as $option ) {
			$ids[] = (int) get_option( $option );
		}
		/**
		 * Filters the pages whose addresses never open the app (payment, account and cart
		 * pages of other plugins).
		 *
		 * @param int[] $ids Page IDs.
		 */
		$ids   = (array) apply_filters( 'yallapp_link_excluded_page_ids', array_values( array_filter( $ids ) ) );
		$paths = array();
		foreach ( array_unique( array_map( 'intval', $ids ) ) as $id ) {
			$url = $id > 0 ? get_permalink( $id ) : false;
			if ( $url ) {
				$paths[] = (string) wp_parse_url( $url, PHP_URL_PATH );
			}
		}
		return array_values( array_unique( array_filter( $paths ) ) );
	}

	/**
	 * The patterns of the entries (for the association file).
	 *
	 * @return string[]
	 */
	public function patterns() {
		return array_values( array_unique( array_column( $this->entries(), 'pattern' ) ) );
	}
}
