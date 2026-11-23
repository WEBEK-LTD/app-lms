<?php
/**
 * 212 The wishlist, reviews from customers who bought, and "Notify me when it's back".
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Product;
use Yallapp\Plugin;
use Yallapp\Push\Inbox;

/**
 * What every store app gets beside its products, kept on the WordPress site:
 *
 * - the wishlist: the products a customer saved with the heart (user meta);
 * - reviews from customers who bought the product (WooCommerce's own reviews,
 *   one per customer and product, which they may edit), shown with a short
 *   name ("Ahmed K."), never an email; photos with reviews stay a Yallapp
 *   hosted feature (`review_photos` is null here);
 * - "Notify me when it's back": a customer waits for an out-of-stock product
 *   or variation (one user meta row each); when WooCommerce puts it back in
 *   stock they get the app's notification and an email, once.
 */
class Shop_Features {

	const WISHLIST_META = 'yallapp_wishlist';
	const WISHLIST_MAX  = 200;
	const STOCK_PREFIX  = 'yallapp_stock_wait_';
	const STOCK_MAX     = 50;
	const REVIEW_MAX    = 2000;

	/**
	 * The plugin, for its pushes and inbox.
	 *
	 * @var Plugin|null
	 */
	private $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin|null $plugin Plugin.
	 */
	public function __construct( $plugin = null ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks WooCommerce's stock changes.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'woocommerce_product_set_stock_status', array( $this, 'on_stock_status' ), 10, 3 );
		add_action( 'woocommerce_variation_set_stock_status', array( $this, 'on_stock_status' ), 10, 3 );
	}

	/**
	 * "Ahmed Kamal" → "Ahmed K.": a first name and an initial, never more. Pure.
	 *
	 * @param string $name Name.
	 * @return string
	 */
	public static function short_name( $name ) {
		$clean = trim( (string) preg_replace( '/[^\p{L}\p{M}\s\'-]+/u', ' ', (string) $name ) );
		$words = '' === $clean ? array() : preg_split( '/\s+/u', $clean );
		if ( ! $words ) {
			return '';
		}
		$first = mb_substr( $words[0], 0, 24 );
		if ( count( $words ) < 2 ) {
			return $first;
		}
		return $first . ' ' . mb_substr( $words[ count( $words ) - 1 ], 0, 1 ) . '.';
	}

	// The wishlist.

	/**
	 * The customer's saved product IDs, newest first.
	 *
	 * @param int $user_id User.
	 * @return int[]
	 */
	public static function wishlist( $user_id ) {
		$ids = get_user_meta( (int) $user_id, self::WISHLIST_META, true );
		return is_array( $ids ) ? array_values( array_unique( array_filter( array_map( 'absint', $ids ) ) ) ) : array();
	}

	/**
	 * Saves the list (at most 200).
	 *
	 * @param int   $user_id User.
	 * @param int[] $ids     Product IDs.
	 * @return int[]
	 */
	public static function save_wishlist( $user_id, array $ids ) {
		$ids = array_slice( array_values( array_unique( array_filter( array_map( 'absint', $ids ) ) ) ), 0, self::WISHLIST_MAX );
		update_user_meta( (int) $user_id, self::WISHLIST_META, $ids );
		return $ids;
	}

	/**
	 * Adds a product first; false when the list is full.
	 *
	 * @param int $user_id    User.
	 * @param int $product_id Product.
	 * @return bool
	 */
	public static function add_to_wishlist( $user_id, $product_id ) {
		$ids = self::wishlist( $user_id );
		if ( in_array( (int) $product_id, $ids, true ) ) {
			return true;
		}
		if ( count( $ids ) >= self::WISHLIST_MAX ) {
			return false;
		}
		array_unshift( $ids, (int) $product_id );
		self::save_wishlist( $user_id, $ids );
		return true;
	}

	/**
	 * Removes a product.
	 *
	 * @param int $user_id    User.
	 * @param int $product_id Product.
	 * @return void
	 */
	public static function remove_from_wishlist( $user_id, $product_id ) {
		self::save_wishlist( $user_id, array_diff( self::wishlist( $user_id ), array( (int) $product_id ) ) );
	}

	/**
	 * Adds a guest's hearts after signing in (those already saved stay first).
	 *
	 * @param int   $user_id User.
	 * @param int[] $ids     Product IDs from the phone.
	 * @return int[]
	 */
	public static function merge_wishlist( $user_id, array $ids ) {
		return self::save_wishlist( $user_id, array_merge( self::wishlist( $user_id ), $ids ) );
	}

	// Reviews.

	/**
	 * Whether the customer bought the product (a paid or done order holds it).
	 *
	 * @param int $user_id    User.
	 * @param int $product_id Product.
	 * @return bool
	 */
	public static function bought( $user_id, $product_id ) {
		$user = get_userdata( (int) $user_id );
		return $user && function_exists( 'wc_customer_bought_product' ) && wc_customer_bought_product( (string) $user->user_email, (int) $user_id, (int) $product_id );
	}

	/**
	 * The review's words checked: a rating 1 to 5, at most 2,000 characters, one link at most. Pure.
	 *
	 * @param mixed $rating Rating.
	 * @param mixed $text   Words.
	 * @return array{ok: bool, rating?: int, text?: string, error?: string}
	 */
	public static function read_review( $rating, $text ) {
		if ( ! is_int( $rating ) || $rating < 1 || $rating > 5 ) {
			return array(
				'ok'    => false,
				'error' => __( 'Choose a rating from 1 to 5.', 'yallapp' ),
			);
		}
		$text = trim( (string) ( is_string( $text ) ? $text : '' ) );
		if ( mb_strlen( $text ) > self::REVIEW_MAX ) {
			return array(
				'ok'    => false,
				/* translators: %d: the most characters. */
				'error' => sprintf( __( 'Use at most %d characters.', 'yallapp' ), self::REVIEW_MAX ),
			);
		}
		if ( preg_match_all( '#https?://|www\.#i', $text ) > 1 ) {
			return array(
				'ok'    => false,
				'error' => __( "A review can't hold links.", 'yallapp' ),
			);
		}
		return array(
			'ok'     => true,
			'rating' => $rating,
			'text'   => $text,
		);
	}

	/**
	 * The customer's own review of the product, or null.
	 *
	 * @param int $user_id    User.
	 * @param int $product_id Product.
	 * @return \WP_Comment|null
	 */
	public static function own_review( $user_id, $product_id ) {
		$rows = get_comments(
			array(
				'post_id' => (int) $product_id,
				'user_id' => (int) $user_id,
				'type'    => 'review',
				'parent'  => 0,
				'number'  => 1,
				'status'  => 'all',
			)
		);
		return $rows ? $rows[0] : null;
	}

	/**
	 * Writes or edits the customer's review (WooCommerce's), held for approval when the site holds comments.
	 *
	 * @param int    $user_id    User.
	 * @param int    $product_id Product.
	 * @param int    $rating     1 to 5.
	 * @param string $text       Words.
	 * @return int The review's ID.
	 */
	public static function save_review( $user_id, $product_id, $rating, $text ) {
		$user     = get_userdata( (int) $user_id );
		$approved = '1' === (string) get_option( 'comment_moderation' ) ? 0 : 1;
		$own      = self::own_review( $user_id, $product_id );
		if ( $own ) {
			wp_update_comment(
				array(
					'comment_ID'       => (int) $own->comment_ID,
					'comment_content'  => $text,
					'comment_approved' => (int) $own->comment_approved ? $approved : 0,
				)
			);
			$id = (int) $own->comment_ID;
		} else {
			$id = (int) wp_insert_comment(
				array(
					'comment_post_ID'      => (int) $product_id,
					'comment_author'       => self::short_name( $user ? $user->display_name : '' ),
					'comment_author_email' => $user ? (string) $user->user_email : '',
					'comment_content'      => $text,
					'comment_type'         => 'review',
					'comment_parent'       => 0,
					'user_id'              => (int) $user_id,
					'comment_approved'     => $approved,
				)
			);
		}
		update_comment_meta( $id, 'rating', (int) $rating );
		update_comment_meta( $id, 'verified', 1 );
		// WooCommerce's average and counts.
		if ( class_exists( '\WC_Comments' ) ) {
			\WC_Comments::clear_transients( (int) $product_id );
		}
		return $id;
	}

	// Back in stock.

	/**
	 * A wait's user meta key. Pure.
	 *
	 * @param int $product_id   Product.
	 * @param int $variation_id Variation (0: the product).
	 * @return string
	 */
	public static function stock_key( $product_id, $variation_id ) {
		return self::STOCK_PREFIX . (int) $product_id . '_' . (int) $variation_id;
	}

	/**
	 * What the customer waits for: product, variation and name.
	 *
	 * @param int $user_id User.
	 * @return array<int, array{product_id: int, variation_id: int, name: string, created_at: string}>
	 */
	public static function waiting( $user_id ) {
		$out = array();
		foreach ( (array) get_user_meta( (int) $user_id ) as $key => $values ) {
			if ( ! preg_match( '/^' . self::STOCK_PREFIX . '(\d+)_(\d+)$/', (string) $key, $m ) ) {
				continue;
			}
			$value = maybe_unserialize( $values[0] ?? '' );
			$out[] = array(
				'product_id'   => (int) $m[1],
				'variation_id' => (int) $m[2],
				'name'         => is_array( $value ) ? (string) ( $value['name'] ?? '' ) : '',
				'created_at'   => is_array( $value ) ? (string) ( $value['at'] ?? '' ) : '',
			);
		}
		return $out;
	}

	/**
	 * Waits for the product (or variation) to be back.
	 *
	 * @param int    $user_id      User.
	 * @param int    $product_id   Product.
	 * @param int    $variation_id Variation (0: the product).
	 * @param string $name         Its name, for the notification.
	 * @return bool False when the customer waits for too many.
	 */
	public static function wait( $user_id, $product_id, $variation_id, $name ) {
		$key = self::stock_key( $product_id, $variation_id );
		if ( '' === (string) get_user_meta( (int) $user_id, $key, true ) && count( self::waiting( $user_id ) ) >= self::STOCK_MAX ) {
			return false;
		}
		update_user_meta(
			(int) $user_id,
			$key,
			array(
				'name' => mb_substr( (string) $name, 0, 160 ),
				'at'   => gmdate( 'Y-m-d\TH:i:s\Z' ),
			)
		);
		return true;
	}

	/**
	 * Stops waiting.
	 *
	 * @param int $user_id      User.
	 * @param int $product_id   Product.
	 * @param int $variation_id Variation (0: the product).
	 * @return void
	 */
	public static function stop_waiting( $user_id, $product_id, $variation_id ) {
		delete_user_meta( (int) $user_id, self::stock_key( $product_id, $variation_id ) );
	}

	/**
	 * WooCommerce put a product or a variation back in stock: the customers waiting for it are told once.
	 *
	 * @param int             $product_id Product or variation.
	 * @param string          $status     New stock status.
	 * @param WC_Product|null $product    Product.
	 * @return int How many were told.
	 */
	public function on_stock_status( $product_id, $status, $product = null ) {
		if ( 'instock' !== $status && 'onbackorder' !== $status ) {
			return 0;
		}
		$product = $product instanceof WC_Product ? $product : wc_get_product( (int) $product_id );
		if ( ! $product ) {
			return 0;
		}
		$parent    = $product->get_parent_id() ? (int) $product->get_parent_id() : (int) $product->get_id();
		$variation = $product->get_parent_id() ? (int) $product->get_id() : 0;
		$key       = self::stock_key( $parent, $variation );
		$users     = get_users(
			array(
				'meta_key' => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'fields'   => 'ID',
				'number'   => 1000,
			)
		);
		if ( ! $users ) {
			return 0;
		}
		$name         = wp_strip_all_tags( $product->get_parent_id() ? (string) get_the_title( $parent ) : (string) $product->get_name() );
		$notification = array(
			'title' => __( 'Back in stock', 'yallapp' ),
			/* translators: %s: the product's name. */
			'body'  => sprintf( __( '%s is back. Order it before it runs out again.', 'yallapp' ), $name ),
		);

		$ids = array_map( 'intval', $users );
		foreach ( $ids as $user_id ) {
			delete_user_meta( $user_id, $key );
			if ( $this->plugin ) {
				$this->plugin->inbox()->add( 'back_in_stock', Inbox::AUDIENCE_USER, $user_id, $notification['title'], $notification['body'] );
			}
			$user = get_userdata( $user_id );
			if ( $user && is_email( $user->user_email ) ) {
				wp_mail(
					$user->user_email,
					/* translators: %s: the product's name. */
					sprintf( __( '%s is back in stock', 'yallapp' ), $name ),
					/* translators: 1: the product's name, 2: the shop's name. */
					sprintf( __( 'Good news: %1$s is back in stock at %2$s. Open the app to order it before it runs out again.', 'yallapp' ), $name, wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES ) )
				);
			}
		}
		if ( $this->plugin && $this->plugin->push()->is_configured() ) {
			$this->plugin->push()->queue(
				$ids,
				'',
				$notification,
				array_filter(
					array(
						'type'         => 'back_in_stock',
						'product_id'   => (string) $parent,
						'variation_id' => $variation ? (string) $variation : '',
						'link'         => \Yallapp\App_Links::link( 'product', $parent ),
					)
				)
			);
		}
		return count( $ids );
	}

	// Filters.

	/**
	 * The names a size or a colour attribute goes by, in English, Arabic and Turkish.
	 *
	 * @var array<string, string[]>
	 */
	const NAMES = array(
		'size'   => array( 'size', 'sizes', 'shoe size', 'المقاس', 'مقاس', 'المقاسات', 'الحجم', 'beden', 'boyut', 'numara' ),
		'colour' => array( 'colour', 'color', 'colours', 'colors', 'اللون', 'لون', 'الألوان', 'renk', 'renkler' ),
	);

	/**
	 * An attribute's key in the filters: `size`, `colour`, or its own slug. Pure.
	 *
	 * @param string $slug  Its taxonomy's slug without `pa_`.
	 * @param string $label Its label.
	 * @return string
	 */
	public static function facet_key( $slug, $label ) {
		foreach ( self::NAMES as $key => $names ) {
			foreach ( array( $slug, $label ) as $name ) {
				if ( in_array( mb_strtolower( trim( (string) $name ) ), $names, true ) ) {
					return $key;
				}
			}
		}
		return (string) $slug;
	}

	/**
	 * The product attribute taxonomies by their filter key (`size` → `pa_size`).
	 *
	 * @return array<string, array{taxonomy: string, name: string}>
	 */
	public static function filter_taxonomies() {
		$out = array();
		if ( ! function_exists( 'wc_get_attribute_taxonomies' ) ) {
			return $out;
		}
		foreach ( (array) wc_get_attribute_taxonomies() as $attribute ) {
			$key = self::facet_key( (string) $attribute->attribute_name, (string) $attribute->attribute_label );
			if ( ! isset( $out[ $key ] ) ) {
				$out[ $key ] = array(
					'taxonomy' => wc_attribute_taxonomy_name( (string) $attribute->attribute_name ),
					'name'     => (string) $attribute->attribute_label,
				);
			}
		}
		return $out;
	}

	/**
	 * `GET /store/filters`: the sizes, colours and other attributes with products, the price range, the sorts.
	 *
	 * @param int $category A category (0: all).
	 * @return array
	 */
	public static function filters( $category ) {
		$choices = array();
		$order   = array(
			'size'   => 0,
			'colour' => 1,
		);
		foreach ( self::filter_taxonomies() as $key => $tax ) {
			$terms = get_terms(
				array(
					'taxonomy'   => $tax['taxonomy'],
					'hide_empty' => true,
					'number'     => 40,
				)
			);
			if ( is_wp_error( $terms ) || ! $terms ) {
				continue;
			}
			$values = array();
			foreach ( $terms as $term ) {
				$values[] = array(
					'value' => (string) $term->slug,
					'label' => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
					'count' => (int) $term->count,
				);
			}
			$choices[] = array(
				'key'    => $key,
				'name'   => $tax['name'],
				'kind'   => 'size' === $key || 'colour' === $key ? $key : 'choice',
				'values' => $values,
				'order'  => $order[ $key ] ?? 2,
			);
		}
		usort(
			$choices,
			static function ( $a, $b ) {
				return $a['order'] <=> $b['order'];
			}
		);
		$choices = array_map(
			static function ( $c ) {
				unset( $c['order'] );
				return $c;
			},
			array_slice( $choices, 0, 6 )
		);
		unset( $category );
		return array(
			'choices' => $choices,
			'price'   => null,
			'brands'  => array(),
			'sorts'   => array( 'newest', 'popular', 'rating', 'price_asc', 'price_desc' ),
		);
	}

	/**
	 * The `tax_query` parts of `size`, `colour` and `f.<key>` asked for (slugs, comma-separated).
	 *
	 * @param array<string, string> $asked Filter key → values.
	 * @return array
	 */
	public static function tax_filters( array $asked ) {
		$query = array();
		$taxes = self::filter_taxonomies();
		foreach ( $asked as $key => $values ) {
			$slugs = array_values( array_filter( array_map( 'sanitize_title', explode( ',', (string) $values ) ) ) );
			if ( ! $slugs || ! isset( $taxes[ $key ] ) ) {
				continue;
			}
			$query[] = array(
				'taxonomy' => $taxes[ $key ]['taxonomy'],
				'field'    => 'slug',
				'terms'    => array_slice( $slugs, 0, 20 ),
			);
		}
		return $query;
	}
}
