<?php
/**
 * Seeds a WooCommerce shop (a flower shop) for the store checks.
 * Run with: wp eval-file seed-store.php
 *
 * yallapp_seed_ids keys: roses (variable, sizes, the large one limited to 2), ribbon
 * (variable, colour chosen by the customer: an "any" attribute), sunflowers (simple, on
 * sale, two reviews), chocolates (simple, 5 in stock, featured, best seller), gift_card
 * (virtual), vase (out of stock), hidden (not shown in the shop), roses_small,
 * roses_medium, roses_large, ribbon_any, flowers, roses_category, gifts.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

wp_set_current_user( 1 );

update_option( 'woocommerce_currency', 'TRY' );
update_option( 'woocommerce_currency_pos', 'left' );
update_option( 'woocommerce_price_num_decimals', 2 );
update_option( 'woocommerce_enable_guest_checkout', 'yes' );
update_option( 'woocommerce_enable_reviews', 'yes' );
update_option( 'woocommerce_manage_stock', 'yes' );
update_option( 'timezone_string', 'Europe/Istanbul' );
WC_Install::create_pages();

$flowers        = wp_insert_term( 'Flowers', 'product_cat' );
$roses_category = wp_insert_term( 'Roses', 'product_cat', array( 'parent' => $flowers['term_id'] ) );
$gifts          = wp_insert_term( 'Gifts', 'product_cat' );

// A global "Size" attribute, registered for this request as WooCommerce does on init.
$attribute_id = wc_create_attribute(
	array(
		'name' => 'Size',
		'slug' => 'size',
	)
);
register_taxonomy( 'pa_size', array( 'product' ), array( 'hierarchical' => false ) );
$sizes = array();
foreach ( array(
	'small'  => 'Small',
	'medium' => 'Medium',
	'large'  => 'Large',
) as $slug => $name ) {
	$term           = wp_insert_term( $name, 'pa_size', array( 'slug' => $slug ) );
	$sizes[ $slug ] = (int) $term['term_id'];
	// The shop's own order for the sizes (WooCommerce's drag-and-drop term order).
	update_term_meta( $sizes[ $slug ], 'order', count( $sizes ) );
}

/**
 * Creates a simple product.
 *
 * @param string $name  Name.
 * @param array  $props Setters to call: name => value.
 * @return WC_Product_Simple
 */
function yallapp_seed_simple( $name, array $props ) {
	$product = new WC_Product_Simple();
	$product->set_name( $name );
	$product->set_status( 'publish' );
	foreach ( $props as $prop => $value ) {
		$product->{"set_$prop"}( $value );
	}
	$product->save();
	return $product;
}

// Red roses: sizes, the medium one on sale, only 2 large ones left.
$roses     = new WC_Product_Variable();
$size_attr = new WC_Product_Attribute();
$size_attr->set_id( $attribute_id );
$size_attr->set_name( 'pa_size' );
$size_attr->set_options( array_values( $sizes ) );
$size_attr->set_visible( true );
$size_attr->set_variation( true );
$roses->set_name( 'Red Roses Bouquet' );
$roses->set_status( 'publish' );
$roses->set_description( '<p>Fresh red roses, hand-tied.</p>' );
$roses->set_short_description( 'Our best-loved bouquet.' );
$roses->set_category_ids( array( $roses_category['term_id'] ) );
$roses->set_attributes( array( $size_attr ) );
$roses->set_featured( true );
$roses->save();

/**
 * Creates a variation.
 *
 * @param int   $parent_id  Variable product.
 * @param array $attributes Attribute => value.
 * @param array $props      Setters to call.
 * @return int
 */
function yallapp_seed_variation( $parent_id, array $attributes, array $props ) {
	$variation = new WC_Product_Variation();
	$variation->set_parent_id( $parent_id );
	$variation->set_attributes( $attributes );
	$variation->set_status( 'publish' );
	foreach ( $props as $prop => $value ) {
		$variation->{"set_$prop"}( $value );
	}
	return (int) $variation->save();
}

$roses_small  = yallapp_seed_variation( $roses->get_id(), array( 'pa_size' => 'small' ), array( 'regular_price' => '300' ) );
$roses_medium = yallapp_seed_variation(
	$roses->get_id(),
	array( 'pa_size' => 'medium' ),
	array(
		'regular_price' => '450',
		'sale_price'    => '400',
	)
);
$roses_large  = yallapp_seed_variation(
	$roses->get_id(),
	array( 'pa_size' => 'large' ),
	array(
		'regular_price'  => '600',
		'manage_stock'   => true,
		'stock_quantity' => 2,
	)
);
WC_Product_Variable::sync( $roses->get_id() );

// A ribbon whose colour the customer picks: one variation for any colour.
$ribbon     = new WC_Product_Variable();
$color_attr = new WC_Product_Attribute();
$color_attr->set_name( 'Color' );
$color_attr->set_options( array( 'Red', 'White', 'Gold' ) );
$color_attr->set_visible( true );
$color_attr->set_variation( true );
$ribbon->set_name( 'Silk Ribbon' );
$ribbon->set_status( 'publish' );
$ribbon->set_category_ids( array( $gifts['term_id'] ) );
$ribbon->set_attributes( array( $color_attr ) );
$ribbon->save();
$ribbon_any = yallapp_seed_variation( $ribbon->get_id(), array( 'color' => '' ), array( 'regular_price' => '50' ) );
WC_Product_Variable::sync( $ribbon->get_id() );

$sunflowers = yallapp_seed_simple(
	'Sunflower Basket',
	array(
		'regular_price' => '250',
		'sale_price'    => '200',
		'category_ids'  => array( $flowers['term_id'] ),
		'description'   => '<p>A basket of sunflowers.</p>',
	)
);
$chocolates = yallapp_seed_simple(
	'Chocolate Box',
	array(
		'regular_price'  => '150',
		'manage_stock'   => true,
		'stock_quantity' => 5,
		'category_ids'   => array( $gifts['term_id'] ),
		'featured'       => true,
		'total_sales'    => 12,
	)
);
$gift_card  = yallapp_seed_simple(
	'Gift Card',
	array(
		'regular_price' => '100',
		'virtual'       => true,
		'category_ids'  => array( $gifts['term_id'] ),
	)
);
$vase       = yallapp_seed_simple(
	'Glass Vase',
	array(
		'regular_price' => '80',
		'stock_status'  => 'outofstock',
		'category_ids'  => array( $gifts['term_id'] ),
	)
);
$hidden     = yallapp_seed_simple(
	'Staff Only Item',
	array(
		'regular_price'      => '10',
		'catalog_visibility' => 'hidden',
		'category_ids'       => array( $gifts['term_id'] ),
	)
);

// Two approved reviews on the sunflowers.
foreach ( array(
	5 => 'Beautiful and fresh.',
	4 => 'Lovely, arrived on time.',
) as $rating => $text ) {
	$review_id = wp_insert_comment(
		array(
			'comment_post_ID'      => $sunflowers->get_id(),
			'comment_author'       => 4 === $rating ? 'Elif' : 'Mert',
			'comment_author_email' => 'reviewer' . $rating . '@example.org',
			'comment_content'      => $text,
			'comment_type'         => 'review',
			'comment_approved'     => 1,
		)
	);
	update_comment_meta( $review_id, 'rating', $rating );
}
WC_Comments::clear_transients( $sunflowers->get_id() );

// Flower shop options: a delivery date (1 to 14 days ahead, no Sunday deliveries) and a gift message.
$settings = get_option( 'yallapp_settings', array() );
update_option(
	'yallapp_settings',
	array_merge(
		is_array( $settings ) ? $settings : array(),
		array(
			'store_delivery_date'          => true,
			'store_delivery_date_required' => true,
			'store_delivery_min_days'      => 1,
			'store_delivery_max_days'      => 14,
			'store_closed_weekdays'        => array( '0' ),
			'store_gift_message'           => true,
			'store_gift_message_max'       => 100,
		)
	)
);

update_option(
	'yallapp_seed_ids',
	array(
		'roses'          => $roses->get_id(),
		'roses_small'    => $roses_small,
		'roses_medium'   => $roses_medium,
		'roses_large'    => $roses_large,
		'ribbon'         => $ribbon->get_id(),
		'ribbon_any'     => $ribbon_any,
		'sunflowers'     => $sunflowers->get_id(),
		'chocolates'     => $chocolates->get_id(),
		'gift_card'      => $gift_card->get_id(),
		'vase'           => $vase->get_id(),
		'hidden'         => $hidden->get_id(),
		'flowers'        => (int) $flowers['term_id'],
		'roses_category' => (int) $roses_category['term_id'],
		'gifts'          => (int) $gifts['term_id'],
	)
);

echo "Seeded.\n";
