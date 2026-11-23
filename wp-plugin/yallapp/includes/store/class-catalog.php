<?php
/**
 * WooCommerce products for Store apps.
 *
 * @package Yallapp
 */

namespace Yallapp\Store;

defined( 'ABSPATH' ) || exit;

use WC_Product;
use WC_Product_Attribute;
use WC_Product_Variable;
use WP_Query;
use WP_Term;
use Yallapp\Commerce\Money;

/**
 * Reads products, categories and reviews from WooCommerce in the contract's shapes. Lists
 * follow the shop's own rules: catalog visibility, "hide out of stock items" and the
 * product's visibility terms.
 */
class Catalog {

	/**
	 * 83.4 This adapter's version: the third number for a fix, the second for something new it sends
	 * the app, the first when the app must change too (docs/CONNECTORS.md).
	 */
	const ADAPTER_VERSION = '1.0.0';

	/**
	 * Sorting options and their WP_Query arguments.
	 */
	const ORDERS = array( 'newest', 'popular', 'rating', 'price_asc', 'price_desc', 'title' );

	/**
	 * Whether WooCommerce is active.
	 *
	 * @return bool
	 */
	public static function available() {
		return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_product' );
	}

	/**
	 * Categories with products, in the shop's own order.
	 *
	 * @return array[]
	 */
	public function categories() {
		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => true,
				'menu_order' => 'ASC',
			)
		);
		if ( ! is_array( $terms ) ) {
			return array();
		}
		$uncategorized = (int) get_option( 'default_product_cat', 0 );
		$items         = array();
		foreach ( $terms as $term ) {
			if ( (int) $term->term_id === $uncategorized ) {
				continue;
			}
			$items[] = $this->category_shape( $term );
		}
		return $items;
	}

	/**
	 * ProductCategory shape.
	 *
	 * @param WP_Term $term Term.
	 * @return array
	 */
	public function category_shape( WP_Term $term ) {
		$image = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
		$url   = $image ? wp_get_attachment_image_url( $image, 'woocommerce_thumbnail' ) : false;
		return array(
			'id'        => (int) $term->term_id,
			'name'      => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
			'count'     => (int) $term->count,
			'parent_id' => $term->parent ? (int) $term->parent : null,
			'image_url' => $url ? $url : null,
		);
	}

	/**
	 * Lists products.
	 *
	 * @param array $args page, per_page, search, category, on_sale, max_price, featured, ids, orderby.
	 * @return array{items: array[], total: int}
	 */
	public function products( array $args ) {
		$search = trim( (string) ( $args['search'] ?? '' ) );
		$query  = array(
			'post_type'           => 'product',
			'post_status'         => 'publish',
			'posts_per_page'      => max( 1, (int) ( $args['per_page'] ?? 20 ) ),
			'paged'               => max( 1, (int) ( $args['page'] ?? 1 ) ),
			'ignore_sticky_posts' => true,
			'tax_query'           => $this->visibility_query( '' !== $search ), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			// 131 Never a gift add-on: the app offers those with other products only.
			'meta_query'          => self::not_addon_query(), // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
		);
		if ( '' !== $search ) {
			$query['s'] = $search;
		}
		if ( ! empty( $args['category'] ) ) {
			$query['tax_query'][] = array(
				'taxonomy'         => 'product_cat',
				'field'            => 'term_id',
				'terms'            => (int) $args['category'],
				'include_children' => true,
			);
		}
		$ids = null;
		if ( ! empty( $args['ids'] ) ) {
			$ids = array_values( array_filter( array_map( 'absint', (array) $args['ids'] ) ) );
		}
		if ( ! empty( $args['on_sale'] ) ) {
			$sale = array_map( 'intval', wc_get_product_ids_on_sale() );
			// 131 With the plugin's flash sale's products while it is on.
			if ( class_exists( \Yallapp\Plugin::class, false ) ) {
				$sale = array_values( array_unique( array_merge( $sale, \Yallapp\Plugin::instance()->store_extras()->flash_product_ids() ) ) );
			}
			$ids = null === $ids ? $sale : array_values( array_intersect( $ids, $sale ) );
		}
		// 209 At this price or under, by WooCommerce's own price (on sale too).
		if ( isset( $args['max_price'] ) && null !== $args['max_price'] && (float) $args['max_price'] > 0 ) {
			$query['meta_query'][] = array(
				'key'     => '_price',
				'value'   => (float) $args['max_price'],
				'compare' => '<=',
				'type'    => 'DECIMAL(10,2)',
			);
		}
		if ( ! empty( $args['featured'] ) ) {
			$featured = array_map( 'intval', wc_get_featured_product_ids() );
			$ids      = null === $ids ? $featured : array_values( array_intersect( $ids, $featured ) );
		}
		if ( null !== $ids ) {
			$query['post__in'] = $ids ? $ids : array( 0 );
		}
		if ( ! empty( $args['ids'] ) ) {
			$query['orderby'] = 'post__in';
		} else {
			$query = array_merge( $query, $this->order_args( (string) ( $args['orderby'] ?? 'newest' ) ) );
		}
		add_filter( 'posts_clauses', array( self::class, 'lookup_order' ), 10, 2 );
		$result = new WP_Query( $query );
		remove_filter( 'posts_clauses', array( self::class, 'lookup_order' ), 10 );
		$items = array();
		foreach ( $result->posts as $post ) {
			$product = wc_get_product( $post );
			if ( $product ) {
				$items[] = $this->summary( $product );
			}
		}
		return array(
			'items' => $items,
			'total' => (int) $result->found_posts,
		);
	}

	/**
	 * Best sellers.
	 *
	 * @param int $limit How many.
	 * @return array[]
	 */
	public function best_sellers( $limit ) {
		$result = $this->products(
			array(
				'per_page' => $limit,
				'orderby'  => 'popular',
			)
		);
		return array_values(
			array_filter(
				$result['items'],
				static function ( $item ) {
					return (int) get_post_meta( $item['id'], 'total_sales', true ) > 0;
				}
			)
		);
	}

	/**
	 * A published, visible product.
	 *
	 * @param int $product_id Product ID.
	 * @return WC_Product|null
	 */
	public function product( $product_id ) {
		$product = $product_id ? wc_get_product( (int) $product_id ) : null;
		// 131 A gift add-on the owner hid from the website's shop is still sold with its product in the app.
		if ( ! $product || $product->is_type( 'variation' ) || 'publish' !== $product->get_status() || ( 'hidden' === $product->get_catalog_visibility() && ! self::is_addon( $product ) ) ) {
			return null;
		}
		if ( post_password_required( $product->get_id() ) ) {
			return null;
		}
		return $product;
	}

	/**
	 * ProductDetail shape.
	 *
	 * @param WC_Product $product Product.
	 * @return array
	 */
	public function detail( WC_Product $product ) {
		$images = array();
		foreach ( array_merge( array( $product->get_image_id() ), $product->get_gallery_image_ids() ) as $image_id ) {
			$url = $image_id ? wp_get_attachment_image_url( (int) $image_id, 'woocommerce_single' ) : false;
			if ( $url ) {
				$alt      = (string) get_post_meta( (int) $image_id, '_wp_attachment_image_alt', true );
				$images[] = array(
					'url' => $url,
					'alt' => '' !== $alt ? $alt : null,
				);
			}
		}
		$categories = array();
		foreach ( $product->get_category_ids() as $term_id ) {
			$term = get_term( (int) $term_id, 'product_cat' );
			if ( $term instanceof WP_Term ) {
				$categories[] = $this->category_shape( $term );
			}
		}
		$related = array();
		foreach ( wc_get_related_products( $product->get_id(), 8 ) as $related_id ) {
			$item = $this->product( (int) $related_id );
			if ( $item && ! self::is_addon( $item ) ) {
				$related[] = $this->summary( $item );
			}
		}
		$short = trim( (string) $product->get_short_description() );
		$sku   = (string) $product->get_sku();
		return array_merge(
			$this->summary( $product ),
			array(
				'description_html'       => self::html( (string) $product->get_description() ),
				'short_description_html' => '' !== $short ? self::html( $short ) : null,
				'images'                 => $images,
				'sku'                    => '' !== $sku ? $sku : null,
				'max_quantity'           => self::max_quantity( $product ),
				'attributes'             => $this->attributes( $product ),
				'variations'             => $product instanceof WC_Product_Variable ? $this->variations( $product ) : array(),
				'categories'             => $categories,
				'related'                => $related,
				// 131 "Add a little more": the gift add-ons offered with it.
				'addons'                 => self::is_addon( $product ) ? array() : $this->addons( $product ),
				'external_url'           => $product->is_type( 'external' ) && method_exists( $product, 'get_product_url' ) && '' !== (string) $product->get_product_url() ? esc_url_raw( (string) $product->get_product_url() ) : null,
				'permalink'              => (string) $product->get_permalink(),
			),
			// 131 The variation chosen when its page opens (WooCommerce's default attributes).
			self::default_attributes( $product )
		);
	}

	/**
	 * 131 A variable product's default attributes, by the attributes' slugs; none: nothing.
	 *
	 * @param WC_Product $product Product.
	 * @return array
	 */
	private static function default_attributes( WC_Product $product ) {
		if ( ! $product instanceof WC_Product_Variable || ! method_exists( $product, 'get_default_attributes' ) ) {
			return array();
		}
		$out = array();
		foreach ( (array) $product->get_default_attributes() as $slug => $value ) {
			if ( is_string( $value ) && '' !== $value ) {
				$out[ sanitize_title( (string) $slug ) ] = $value;
			}
		}
		return $out ? array( 'default_attributes' => $out ) : array();
	}

	/**
	 * ProductSummary shape.
	 *
	 * @param WC_Product $product Product.
	 * @return array
	 */
	public function summary( WC_Product $product ) {
		$image = $product->get_image_id() ? wp_get_attachment_image_url( (int) $product->get_image_id(), 'woocommerce_thumbnail' ) : false;
		$types = array( 'simple', 'variable', 'grouped', 'external' );
		$type  = (string) $product->get_type();
		$count = (int) $product->get_rating_count();
		$price = $this->price( $product );
		$out   = array(
			'id'           => (int) $product->get_id(),
			'name'         => html_entity_decode( wp_strip_all_tags( (string) $product->get_name() ), ENT_QUOTES, 'UTF-8' ),
			'type'         => in_array( $type, $types, true ) ? $type : 'other',
			'image_url'    => $image ? $image : null,
			'price'        => $price,
			'rating'       => $count ? round( (float) $product->get_average_rating(), 1 ) : null,
			'rating_count' => $count,
			'stock_status' => self::stock_status( $product ),
			'purchasable'  => self::can_add_to_cart( $product ),
			'digital'      => self::is_digital( $product ),
			// 131 A gift add-on, offered with other products only.
			'addon'        => self::is_addon( $product ),
		);
		// 131 Its sale: the plugin's flash sale, else WooCommerce's own sale price with its scheduled end.
		if ( class_exists( \Yallapp\Plugin::class, false ) ) {
			$out['sale'] = \Yallapp\Plugin::instance()->store_extras()->sale( $product, $price );
		}
		return $out;
	}

	/**
	 * ProductPrice shape. Prices are shown as the shop shows them (with or without tax).
	 *
	 * @param WC_Product $product Product or variation.
	 * @return array
	 */
	public function price( WC_Product $product ) {
		$decimals = wc_get_price_decimals();
		$range    = false;
		if ( $product instanceof WC_Product_Variable ) {
			$prices  = $product->get_variation_prices( true );
			$current = $prices['price'] ? (float) min( $prices['price'] ) : 0.0;
			$regular = $prices['regular_price'] ? (float) min( $prices['regular_price'] ) : 0.0;
			$range   = $prices['price'] && min( $prices['price'] ) !== max( $prices['price'] );
		} else {
			$current = (float) wc_get_price_to_display( $product );
			$regular = (float) wc_get_price_to_display( $product, array( 'price' => $product->get_regular_price() ) );
		}
		$on_sale = $product->is_on_sale();
		$sale    = $on_sale && $regular > $current;
		// A range as the shop shows it; otherwise the price paid now, with the regular one apart.
		$text = $range ? Money::plain( (string) $product->get_price_html() ) : '';
		return array(
			'amount'            => number_format( $current, $decimals, '.', '' ),
			'regular_amount'    => $sale ? number_format( $regular, $decimals, '.', '' ) : null,
			'regular_formatted' => $sale && ! $range ? Money::plain( wc_price( $regular ) ) : null,
			'currency'          => (string) get_woocommerce_currency(),
			'formatted'         => '' !== $text ? $text : Money::plain( wc_price( $current ) ),
			'on_sale'           => $on_sale,
			'range'             => $range,
		);
	}

	/**
	 * Approved reviews, newest first, with the rating summary.
	 *
	 * @param WC_Product $product  Product.
	 * @param int        $user_id  Current user.
	 * @param int        $page     Page.
	 * @param int        $per_page Page size.
	 * @return array{items: array[], total: int, summary: array}
	 */
	public function reviews( WC_Product $product, $user_id, $page, $per_page ) {
		$args  = array(
			'post_id' => $product->get_id(),
			'type'    => 'review',
			'status'  => 'approve',
			'parent'  => 0,
		);
		$total = (int) get_comments( array_merge( $args, array( 'count' => true ) ) );
		$rows  = get_comments(
			array_merge(
				$args,
				array(
					'number'  => (int) $per_page,
					'offset'  => ( max( 1, (int) $page ) - 1 ) * (int) $per_page,
					'orderby' => 'comment_ID',
					'order'   => 'DESC',
				)
			)
		);
		$items = array();
		foreach ( (array) $rows as $row ) {
			$user    = $row->user_id ? get_userdata( (int) $row->user_id ) : false;
			$items[] = array(
				'id'         => (int) $row->comment_ID,
				'rating'     => max( 1, min( 5, (int) get_comment_meta( (int) $row->comment_ID, 'rating', true ) ) ),
				'text'       => trim( html_entity_decode( wp_strip_all_tags( (string) $row->comment_content ), ENT_QUOTES, 'UTF-8' ) ),
				'author'     => array(
					'name'       => $user ? (string) $user->display_name : (string) $row->comment_author,
					'avatar_url' => $row->user_id ? \Yallapp\Otp\Sign_In::avatar_url( (int) $row->user_id ) : null,
					'instructor' => false,
				),
				'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
				'status'     => 'approved',
				'mine'       => $user_id > 0 && (int) $row->user_id === (int) $user_id,
			);
		}
		$counts = array();
		foreach ( (array) $product->get_rating_counts() as $star => $count ) {
			$counts[ (string) (int) $star ] = (int) $count;
		}
		$shaped = array();
		$sum    = 0;
		$number = 0;
		foreach ( array( 1, 2, 3, 4, 5 ) as $star ) {
			$shaped[ (string) $star ] = (int) ( $counts[ (string) $star ] ?? 0 );
			$number                  += $shaped[ (string) $star ];
			$sum                     += $star * $shaped[ (string) $star ];
		}
		return array(
			'items'   => $items,
			'total'   => $total,
			'summary' => array(
				'rating'       => $number ? round( $sum / $number, 1 ) : null,
				'rating_count' => $number,
				'counts'       => $shaped,
			),
		);
	}

	/**
	 * 131 Whether a product is a gift add-on ("Sell only as an add-on in the app").
	 *
	 * @param WC_Product $product Product (a variation: its parent's).
	 * @return bool
	 */
	public static function is_addon( WC_Product $product ) {
		$id = $product->get_parent_id() ? (int) $product->get_parent_id() : (int) $product->get_id();
		return 'yes' === get_post_meta( $id, Addon_Rules::META_ADDON, true );
	}

	/**
	 * 131 What a gift add-on is offered with.
	 *
	 * @param int $product_id The add-on.
	 * @return array{offer_with: string, category_ids: int[], product_ids: int[]}
	 */
	public static function addon_rule( $product_id ) {
		return Addon_Rules::rule(
			(string) get_post_meta( (int) $product_id, Addon_Rules::META_OFFER, true ),
			(string) get_post_meta( (int) $product_id, Addon_Rules::META_CATEGORIES, true ),
			(string) get_post_meta( (int) $product_id, Addon_Rules::META_PRODUCTS, true )
		);
	}

	/**
	 * 131 Lists leave the gift add-ons out.
	 *
	 * @return array
	 */
	private static function not_addon_query() {
		return array(
			'relation' => 'OR',
			array(
				'key'     => Addon_Rules::META_ADDON,
				'compare' => 'NOT EXISTS',
			),
			array(
				'key'     => Addon_Rules::META_ADDON,
				'value'   => 'yes',
				'compare' => '!=',
			),
		);
	}

	/**
	 * 131 The gift add-ons offered with a product (null: those offered with every product), as
	 * summaries; the website's own visibility doesn't hide them from the app.
	 *
	 * @param WC_Product|null $main The product.
	 * @return array[]
	 */
	public function addons( $main ) {
		$posts = get_posts(
			array(
				'post_type'      => 'product',
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'fields'         => 'ids',
				'meta_key'       => Addon_Rules::META_ADDON, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- The shop's few add-ons.
				'meta_value'     => 'yes', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- The shop's few add-ons.
				'orderby'        => 'menu_order title',
				'order'          => 'ASC',
			)
		);
		$items = array();
		foreach ( $posts as $id ) {
			$addon = wc_get_product( (int) $id );
			if ( ! $addon || ( $main && (int) $addon->get_id() === (int) $main->get_id() ) || ! self::can_add_to_cart( $addon ) ) {
				continue;
			}
			$rule = self::addon_rule( (int) $id );
			$fits = $main ? Addon_Rules::offered_with( $rule, (int) $main->get_id(), array_map( 'intval', $main->get_category_ids() ) ) : 'all' === $rule['offer_with'];
			if ( $fits ) {
				$items[] = $this->summary( $addon );
			}
			if ( count( $items ) >= Addon_Rules::OFFERED ) {
				break;
			}
		}
		return $items;
	}

	/**
	 * Whether product reviews are on for the shop and the product.
	 *
	 * @param WC_Product $product Product.
	 * @return bool
	 */
	public static function reviews_enabled( WC_Product $product ) {
		return wc_reviews_enabled() && $product->get_reviews_allowed();
	}

	/**
	 * Whether the app can put the product in its cart: a purchasable simple or variable product.
	 *
	 * @param WC_Product $product Product.
	 * @return bool
	 */
	public static function can_add_to_cart( WC_Product $product ) {
		return ( $product->is_type( 'simple' ) || $product->is_type( 'variable' ) ) && $product->is_purchasable() && $product->is_in_stock();
	}

	/**
	 * Whether a product is virtual or downloadable (sold only on the website on iOS).
	 *
	 * @param WC_Product $product Product or variation.
	 * @return bool
	 */
	public static function is_digital( WC_Product $product ) {
		if ( $product instanceof WC_Product_Variable ) {
			foreach ( $product->get_visible_children() as $child_id ) {
				$child = wc_get_product( (int) $child_id );
				if ( $child && ! ( $child->is_virtual() || $child->is_downloadable() ) ) {
					return false;
				}
			}
			return (bool) $product->get_visible_children();
		}
		return $product->is_virtual() || $product->is_downloadable();
	}

	/**
	 * Stock status in the contract's words.
	 *
	 * @param WC_Product $product Product or variation.
	 * @return string
	 */
	public static function stock_status( WC_Product $product ) {
		$status = (string) $product->get_stock_status();
		if ( 'onbackorder' === $status ) {
			return 'on_backorder';
		}
		return 'outofstock' === $status ? 'out_of_stock' : 'in_stock';
	}

	/**
	 * The most a customer can buy at once, or null when unlimited.
	 *
	 * @param WC_Product $product Product or variation.
	 * @return int|null
	 */
	public static function max_quantity( WC_Product $product ) {
		$max = (int) $product->get_max_purchase_quantity();
		return $max > 0 ? $max : null;
	}

	/**
	 * Visible attributes, with their options in the product's order.
	 *
	 * @param WC_Product $product Product.
	 * @return array[]
	 */
	private function attributes( WC_Product $product ) {
		$items = array();
		foreach ( $product->get_attributes() as $slug => $attribute ) {
			if ( ! $attribute instanceof WC_Product_Attribute ) {
				continue;
			}
			$variation = $product instanceof WC_Product_Variable && $attribute->get_variation();
			if ( ! $attribute->get_visible() && ! $variation ) {
				continue;
			}
			$options = array();
			if ( $attribute->is_taxonomy() ) {
				foreach ( wc_get_product_terms( $product->get_id(), $attribute->get_name(), array( 'fields' => 'all' ) ) as $term ) {
					$options[] = array(
						'value' => (string) $term->slug,
						'label' => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
					);
				}
			} else {
				foreach ( $attribute->get_options() as $option ) {
					$options[] = array(
						'value' => (string) $option,
						'label' => (string) $option,
					);
				}
			}
			$items[] = array(
				'slug'      => sanitize_title( (string) $slug ),
				'name'      => html_entity_decode( (string) wc_attribute_label( $attribute->get_name(), $product ), ENT_QUOTES, 'UTF-8' ),
				'variation' => $variation,
				'options'   => $options,
			);
		}
		return $items;
	}

	/**
	 * Purchasable, visible variations.
	 *
	 * @param WC_Product_Variable $product Product.
	 * @return array[]
	 */
	private function variations( WC_Product_Variable $product ) {
		$items = array();
		foreach ( $product->get_visible_children() as $child_id ) {
			$variation = wc_get_product( (int) $child_id );
			if ( ! $variation || ! $variation->exists() ) {
				continue;
			}
			$attributes = array();
			foreach ( $variation->get_variation_attributes() as $key => $value ) {
				$attributes[ sanitize_title( substr( (string) $key, strlen( 'attribute_' ) ) ) ] = (string) $value;
			}
			$image   = $variation->get_image_id() ? wp_get_attachment_image_url( (int) $variation->get_image_id(), 'woocommerce_single' ) : false;
			$items[] = array(
				'id'           => (int) $variation->get_id(),
				'attributes'   => (object) $attributes,
				'price'        => $this->price( $variation ),
				'image_url'    => $image ? $image : null,
				'stock_status' => self::stock_status( $variation ),
				'max_quantity' => self::max_quantity( $variation ),
				'purchasable'  => $variation->is_purchasable() && $variation->is_in_stock(),
			);
		}
		return $items;
	}

	/**
	 * Tax query for the shop's catalog visibility rules.
	 *
	 * @param bool $searching Whether this is a search.
	 * @return array
	 */
	private function visibility_query( $searching ) {
		$terms   = wc_get_product_visibility_term_ids();
		$exclude = array( $searching ? $terms['exclude-from-search'] : $terms['exclude-from-catalog'] );
		if ( 'yes' === get_option( 'woocommerce_hide_out_of_stock_items' ) ) {
			$exclude[] = $terms['outofstock'];
		}
		return array(
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => array_values( array_filter( $exclude ) ),
				'operator' => 'NOT IN',
			),
		);
	}

	/**
	 * WP_Query order arguments. Price, sales and rating come from WooCommerce's product
	 * lookup table, as the shop's own sorting does, so variable products appear once.
	 *
	 * @param string $orderby Sort option.
	 * @return array
	 */
	private function order_args( $orderby ) {
		$columns = array(
			'popular'    => 'wc_lookup.total_sales DESC',
			'rating'     => 'wc_lookup.average_rating DESC, wc_lookup.rating_count DESC',
			'price_asc'  => 'wc_lookup.min_price ASC',
			'price_desc' => 'wc_lookup.max_price DESC',
		);
		if ( isset( $columns[ $orderby ] ) ) {
			return array(
				'orderby'           => 'none',
				'yallapp_lookup_by' => $columns[ $orderby ],
			);
		}
		if ( 'title' === $orderby ) {
			return array(
				'orderby' => 'title',
				'order'   => 'ASC',
			);
		}
		return array(
			'orderby' => array(
				'date' => 'DESC',
				'ID'   => 'DESC',
			),
		);
	}

	/**
	 * Joins the product lookup table for the `yallapp_lookup_by` query variable.
	 *
	 * @param array    $clauses Query clauses.
	 * @param WP_Query $query   Query.
	 * @return array
	 */
	public static function lookup_order( $clauses, $query ) {
		$order = $query->get( 'yallapp_lookup_by' );
		if ( ! $order ) {
			return $clauses;
		}
		global $wpdb;
		$clauses['join']   .= " LEFT JOIN {$wpdb->prefix}wc_product_meta_lookup wc_lookup ON {$wpdb->posts}.ID = wc_lookup.product_id ";
		$clauses['orderby'] = $order . ", {$wpdb->posts}.ID DESC";
		return $clauses;
	}

	/**
	 * Product description HTML, as the product page shows it.
	 *
	 * @param string $content Raw content.
	 * @return string
	 */
	private static function html( $content ) {
		return wp_kses_post( wpautop( do_shortcode( $content ) ) );
	}
}
