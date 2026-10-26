<?php
/**
 * End-to-end checks of the store endpoints against a WooCommerce shop seeded by
 * tests/dev-site/seed-store.php (no LMS installed).
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{"roses":8,...}' php store-test.php http://127.0.0.1:8089
 * The site must define YALLAPP_DEV_OTP so the code 123456 works.
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$base  = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' ) . '/wp-json/yallapp/v1';
$seed  = json_decode( (string) getenv( 'SEED_IDS' ), true );
$fails = 0;
$count = 0;
if ( ! is_array( $seed ) ) {
	fwrite( STDERR, "Set SEED_IDS to the yallapp_seed_ids option as JSON.\n" );
	exit( 2 );
}

function call( $method, $path, $body = null, $token = null, array $headers = array() ) {
	global $base;
	$ch = curl_init( 0 === strpos( $path, 'http' ) ? $path : $base . $path );
	$h  = array_merge( array( 'Accept: application/json' ), $headers );
	if ( null !== $body ) {
		$h[] = 'Content-Type: application/json';
		curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $body ) );
	}
	if ( $token ) {
		$h[] = 'Authorization: Bearer ' . $token;
	}
	curl_setopt_array(
		$ch,
		array(
			CURLOPT_CUSTOMREQUEST  => $method,
			CURLOPT_HTTPHEADER     => $h,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HEADER         => true,
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	$size   = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	curl_close( $ch );
	$text = substr( $raw, $size );
	return array(
		'status'  => $status,
		'headers' => strtolower( substr( $raw, 0, $size ) ),
		'raw'     => $text,
		'json'    => json_decode( $text, true ),
	);
}

/**
 * A browser request with a cookie jar, without following redirects.
 */
function browse( $url, $jar ) {
	$ch = curl_init( $url );
	curl_setopt_array(
		$ch,
		array(
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HEADER         => true,
			CURLOPT_FOLLOWLOCATION => false,
			CURLOPT_COOKIEJAR      => $jar,
			CURLOPT_COOKIEFILE     => $jar,
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	$size   = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	$where  = (string) curl_getinfo( $ch, CURLINFO_REDIRECT_URL );
	curl_close( $ch );
	return array(
		'status'   => $status,
		'location' => $where,
		'headers'  => strtolower( substr( $raw, 0, $size ) ),
	);
}

function check( $name, $ok, $detail = '' ) {
	global $fails, $count;
	++$count;
	if ( $ok ) {
		echo "  ok    $name\n";
		return;
	}
	++$fails;
	echo "  FAIL  $name" . ( '' !== $detail ? "\n        " . substr( is_string( $detail ) ? $detail : json_encode( $detail ), 0, 700 ) : '' ) . "\n";
}

function device( $id ) {
	return array(
		'id'          => $id,
		'platform'    => 'android',
		'name'        => 'Test ' . $id,
		'app_version' => '1.0.0',
	);
}

function sign_up( $name ) {
	$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
	$r     = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	$v     = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => device( 'dev-' . $phone ) ) );
	return call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'] ?? '', 'name' => $name, 'device' => device( 'dev-' . $phone ) ) );
}

function wp_eval( $php ) {
	$prefix = (string) getenv( 'WP_CLI' );
	if ( '' === $prefix ) {
		fwrite( STDERR, "Set WP_CLI to the wp command for the dev site.\n" );
		exit( 2 );
	}
	return trim( (string) shell_exec( $prefix . ' eval ' . escapeshellarg( $php ) . ' 2>/dev/null' ) );
}

function ids( $items ) {
	return array_map(
		function ( $item ) {
			return $item['id'];
		},
		$items ?? array()
	);
}

function same_set( array $a, array $b ) {
	sort( $a );
	sort( $b );
	return $a === $b;
}

/**
 * A delivery day $days or more ahead in the shop's time zone that isn't a Sunday.
 */
function delivery_day( $days ) {
	$day = new DateTimeImmutable( 'today +' . $days . ' days', new DateTimeZone( 'Europe/Istanbul' ) );
	while ( '0' === $day->format( 'w' ) ) {
		$day = $day->modify( '+1 day' );
	}
	return $day->format( 'Y-m-d' );
}

echo "App\n";
$r        = call( 'GET', '/config?platform=android&app_version=1.0.0' );
$features = $r['json']['features'] ?? array();
$store    = $r['json']['store'] ?? array();
check( 'config 200', 200 === $r['status'], $r['raw'] );
check( 'no LMS on a shop', array_key_exists( 'lms', $features ) && null === $features['lms'], $features );
check( 'the shop has orders', true === ( $features['orders'] ?? null ), $features );
check( 'store settings', 'TRY' === ( $store['currency'] ?? '' ) && true === ( $store['guest_checkout'] ?? null ) && true === ( $store['reviews'] ?? null ), $store );
check( 'delivery date settings', array( 'enabled' => true, 'required' => true, 'min_days' => 1, 'max_days' => 14, 'closed_weekdays' => array( 0 ) ) === ( $store['delivery_date'] ?? null ), $store );
check( 'gift message settings', array( 'enabled' => true, 'max_length' => 100 ) === ( $store['gift_message'] ?? null ), $store );
check( '91.3 no returns in the app until the shop sets its days', array_key_exists( 'returns', $store ) && null === $store['returns'], $store );
$r = call( 'GET', '/courses' );
check( 'course endpoints say courses are unavailable', 503 === $r['status'] && 'lms_unavailable' === ( $r['json']['code'] ?? '' ), $r['raw'] );

echo "Catalog\n";
$r     = call( 'GET', '/store/categories' );
$names = array();
foreach ( $r['json']['items'] ?? array() as $category ) {
	$names[ $category['name'] ] = $category;
}
check( 'categories without Uncategorized', 200 === $r['status'] && same_set( array( 'Flowers', 'Roses', 'Gifts' ), array_keys( $names ) ), $r['raw'] );
check( 'subcategory parent', $seed['flowers'] === ( $names['Roses']['parent_id'] ?? 0 ) && array_key_exists( 'parent_id', $names['Flowers'] ?? array() ) && null === $names['Flowers']['parent_id'], $names );

$visible = array( $seed['roses'], $seed['ribbon'], $seed['sunflowers'], $seed['chocolates'], $seed['gift_card'], $seed['vase'] );
$r       = call( 'GET', '/store/products?per_page=50' );
check( 'products: every visible product, not the hidden one', 200 === $r['status'] && 6 === ( $r['json']['total'] ?? 0 ) && same_set( $visible, ids( $r['json']['items'] ?? array() ) ), $r['raw'] );
$r = call( 'GET', '/store/products?per_page=2&page=2' );
check( 'paging', 2 === count( $r['json']['items'] ?? array() ) && 2 === ( $r['json']['page'] ?? 0 ) && 3 === ( $r['json']['total_pages'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/store/products?search=roses' );
check( 'search', array( $seed['roses'] ) === ids( $r['json']['items'] ?? array() ), $r['raw'] );
$r = call( 'GET', '/store/products?search=staff' );
check( 'search skips hidden products', 0 === ( $r['json']['total'] ?? -1 ), $r['raw'] );
$r = call( 'GET', '/store/products?category=' . $seed['flowers'] );
check( 'category includes subcategories', same_set( array( $seed['roses'], $seed['sunflowers'] ), ids( $r['json']['items'] ?? array() ) ), $r['raw'] );
$r = call( 'GET', '/store/products?on_sale=true' );
check( 'on sale', same_set( array( $seed['roses'], $seed['sunflowers'] ), ids( $r['json']['items'] ?? array() ) ), $r['raw'] );
$r = call( 'GET', '/store/products?featured=true' );
check( 'featured', same_set( array( $seed['roses'], $seed['chocolates'] ), ids( $r['json']['items'] ?? array() ) ), $r['raw'] );
$r = call( 'GET', '/store/products?orderby=price_asc&per_page=50' );
check( 'cheapest first', array( $seed['ribbon'], $seed['vase'], $seed['gift_card'], $seed['chocolates'], $seed['sunflowers'], $seed['roses'] ) === ids( $r['json']['items'] ?? array() ), ids( $r['json']['items'] ?? array() ) );
$r = call( 'GET', '/store/products?orderby=price_desc&per_page=50' );
check( 'dearest first, each product once', $seed['roses'] === ( $r['json']['items'][0]['id'] ?? 0 ) && 6 === count( array_unique( ids( $r['json']['items'] ?? array() ) ) ) && 6 === count( $r['json']['items'] ?? array() ), ids( $r['json']['items'] ?? array() ) );
$r = call( 'GET', '/store/products?orderby=popular' );
check( 'best seller first', $seed['chocolates'] === ( $r['json']['items'][0]['id'] ?? 0 ), ids( $r['json']['items'] ?? array() ) );
$r = call( 'GET', '/store/products?ids=' . $seed['chocolates'] . ',' . $seed['roses'] );
check( 'ids keep their order', array( $seed['chocolates'], $seed['roses'] ) === ids( $r['json']['items'] ?? array() ), $r['raw'] );
$r = call( 'GET', '/store/products?orderby=cheapest' );
check( 'unknown sort 400', 400 === $r['status'], $r['raw'] );

$by = array();
foreach ( call( 'GET', '/store/products?per_page=50' )['json']['items'] ?? array() as $item ) {
	$by[ $item['id'] ] = $item;
}
$sun = $by[ $seed['sunflowers'] ] ?? array();
check( 'sale price', '200.00' === ( $sun['price']['amount'] ?? '' ) && '250.00' === ( $sun['price']['regular_amount'] ?? '' ) && true === ( $sun['price']['on_sale'] ?? null ) && false !== strpos( (string) ( $sun['price']['formatted'] ?? '' ), '200' ) && 'TRY' === ( $sun['price']['currency'] ?? '' ), $sun['price'] ?? null );
check( 'rating from reviews', 4.5 === (float) ( $sun['rating'] ?? 0 ) && 2 === ( $sun['rating_count'] ?? 0 ), $sun );
check( 'simple product summary', 'simple' === ( $sun['type'] ?? '' ) && 'in_stock' === ( $sun['stock_status'] ?? '' ) && true === ( $sun['purchasable'] ?? null ) && false === ( $sun['digital'] ?? null ), $sun );
check( 'digital product', true === ( $by[ $seed['gift_card'] ]['digital'] ?? null ), $by[ $seed['gift_card'] ] ?? null );
check( 'out of stock', 'out_of_stock' === ( $by[ $seed['vase'] ]['stock_status'] ?? '' ) && false === ( $by[ $seed['vase'] ]['purchasable'] ?? null ), $by[ $seed['vase'] ] ?? null );
check( 'price range', true === ( $by[ $seed['roses'] ]['price']['range'] ?? null ) && '300.00' === ( $by[ $seed['roses'] ]['price']['amount'] ?? '' ) && 'variable' === ( $by[ $seed['roses'] ]['type'] ?? '' ), $by[ $seed['roses'] ] ?? null );

echo "Product\n";
$r     = call( 'GET', '/store/products/' . $seed['roses'] );
$roses = $r['json'] ?? array();
check( 'product detail', 200 === $r['status'] && 'Red Roses Bouquet' === ( $roses['name'] ?? '' ) && false !== strpos( (string) ( $roses['description_html'] ?? '' ), 'hand-tied' ) && false !== strpos( (string) ( $roses['short_description_html'] ?? '' ), 'best-loved' ), $r['raw'] );
check( 'product categories', array( 'Roses' ) === array_map( function ( $c ) { return $c['name']; }, $roses['categories'] ?? array() ), $roses['categories'] ?? null );
$size = $roses['attributes'][0] ?? array();
check( 'size attribute in the shop\'s order', 'pa_size' === ( $size['slug'] ?? '' ) && 'Size' === ( $size['name'] ?? '' ) && true === ( $size['variation'] ?? null ) && array( 'small', 'medium', 'large' ) === array_map( function ( $o ) { return $o['value']; }, $size['options'] ?? array() ) && 'Large' === ( $size['options'][2]['label'] ?? '' ), $size );
$variations = array();
foreach ( $roses['variations'] ?? array() as $variation ) {
	$variations[ $variation['id'] ] = $variation;
}
check( 'three variations', 3 === count( $variations ) && array( 'pa_size' => 'medium' ) === ( $variations[ $seed['roses_medium'] ]['attributes'] ?? null ), $roses['variations'] ?? null );
check( 'variation sale price', '400.00' === ( $variations[ $seed['roses_medium'] ]['price']['amount'] ?? '' ) && '450.00' === ( $variations[ $seed['roses_medium'] ]['price']['regular_amount'] ?? '' ), $variations[ $seed['roses_medium'] ] ?? null );
check( 'variation stock limit', 2 === ( $variations[ $seed['roses_large'] ]['max_quantity'] ?? 0 ) && array_key_exists( 'max_quantity', $variations[ $seed['roses_small'] ] ?? array() ) && null === $variations[ $seed['roses_small'] ]['max_quantity'], $variations );
check( 'sale price text without screen reader text', '₺400.00' === ( $variations[ $seed['roses_medium'] ]['price']['formatted'] ?? '' ) && '₺450.00' === ( $variations[ $seed['roses_medium'] ]['price']['regular_formatted'] ?? '' ), $variations[ $seed['roses_medium'] ]['price'] ?? null );
check( 'range text', false !== strpos( (string) ( $roses['price']['formatted'] ?? '' ), '300' ) && false !== strpos( (string) ( $roses['price']['formatted'] ?? '' ), '600' ) && false === stripos( (string) ( $roses['price']['formatted'] ?? '' ), 'price' ) && null === ( $roses['price']['regular_formatted'] ?? null ), $roses['price'] ?? null );
$r      = call( 'GET', '/store/products/' . $seed['ribbon'] );
$ribbon = $r['json'] ?? array();
check( 'any-colour variation', array( 'color' => '' ) === ( $ribbon['variations'][0]['attributes'] ?? null ) && array( 'Red', 'White', 'Gold' ) === array_map( function ( $o ) { return $o['value']; }, $ribbon['attributes'][0]['options'] ?? array() ), $r['raw'] );
$r = call( 'GET', '/store/products/' . $seed['chocolates'] );
check( 'stock limit on a simple product', 5 === ( $r['json']['max_quantity'] ?? 0 ) && array() === ( $r['json']['variations'] ?? null ), $r['raw'] );
$r = call( 'GET', '/store/products/' . $seed['hidden'] );
check( 'hidden product 404', 404 === $r['status'], $r['raw'] );
$r = call( 'GET', '/store/products/' . $seed['roses_small'] );
check( 'a variation is not a product page', 404 === $r['status'], $r['raw'] );
$r = call( 'GET', '/store/products/999999' );
check( 'missing product 404', 404 === $r['status'], $r['raw'] );

$r = call( 'GET', '/store/products/' . $seed['sunflowers'] . '/reviews' );
check( 'reviews', 200 === $r['status'] && 2 === ( $r['json']['total'] ?? 0 ) && 4.5 === (float) ( $r['json']['summary']['rating'] ?? 0 ) && 1 === ( $r['json']['summary']['counts']['5'] ?? 0 ) && 1 === ( $r['json']['summary']['counts']['4'] ?? 0 ), $r['raw'] );
check( 'review shape', in_array( $r['json']['items'][0]['author']['name'] ?? '', array( 'Elif', 'Mert' ), true ) && 'approved' === ( $r['json']['items'][0]['status'] ?? '' ) && false === ( $r['json']['items'][0]['mine'] ?? null ), $r['json']['items'][0] ?? null );

echo "Home\n";
$r     = call( 'GET', '/store/home' );
$types = array();
foreach ( $r['json']['sections'] ?? array() as $section ) {
	$types[ $section['type'] ] = $section;
}
check( 'home sections in the default order', 200 === $r['status'] && array( 'categories', 'featured_products', 'sale_products', 'new_products' ) === array_keys( $types ), array_keys( $types ) );
check( 'home categories are top-level', same_set( array( 'Flowers', 'Gifts' ), array_map( function ( $c ) { return $c['name']; }, $types['categories']['categories'] ?? array() ) ), $types['categories'] ?? null );
check( 'home featured', same_set( array( $seed['roses'], $seed['chocolates'] ), ids( $types['featured_products']['products'] ?? array() ) ), $types['featured_products'] ?? null );

echo "Pages\n";
require_once __DIR__ . '/pages-helpers.php';
$r = call( 'GET', '/pages?platform=android' );
check_navigation_shape( 'default pages: navigation shape', $r['json'] );
check( 'default pages: shop tabs', array( 'home', 'shop', 'cart', 'account' ) === array_column( $r['json']['tabs'] ?? array(), 'id' ) && 'search' === ( $r['json']['tabs'][1]['target']['screen'] ?? '' ) && 'cart' === ( $r['json']['tabs'][2]['target']['screen'] ?? '' ), $r['json']['tabs'] ?? null );
$r    = call( 'GET', '/pages/home?platform=android' );
$home = $r['json'];
check( 'default home follows the store home settings', array( 'search', 'categories', 'featured-products', 'new-products' ) === page_block_ids( $home ), page_block_ids( $home ) );
check( 'default home: product search', 'products' === ( page_block( $home, 'search' )['source'] ?? '' ), page_block( $home, 'search' ) );
check( 'default home: top-level product categories', same_set( array( 'Flowers', 'Gifts' ), array_column( page_block( $home, 'categories' )['categories'] ?? array(), 'name' ) ) && array( 'id', 'name', 'count' ) === array_keys( page_block( $home, 'categories' )['categories'][0] ?? array() ), page_block( $home, 'categories' ) );
check( 'default home: featured products', same_set( array( (string) $seed['roses'], (string) $seed['chocolates'] ), block_item_ids( page_block( $home, 'featured-products' ) ) ), page_block( $home, 'featured-products' ) );
check_item_shapes( 'default home: item shapes', $home );
$items = array();
foreach ( page_block( $home, 'new-products' )['items'] ?? array() as $item ) {
	$items[ $item['id'] ] = $item;
}
$sunflowers = $items[ (string) $seed['sunflowers'] ] ?? array();
check( 'product item: price label, sale badge, opens the product', false !== strpos( (string) ( $sunflowers['price_label'] ?? '' ), '200' ) && 'Sale' === ( $sunflowers['badge'] ?? '' ) && array( 'type' => 'item', 'item' => array( 'source' => 'products', 'id' => (string) $seed['sunflowers'] ) ) === ( $sunflowers['action'] ?? null ) && ! array_key_exists( 'favorited', $sunflowers ), $sunflowers );
check( 'product item: out of stock badge', 'Out of stock' === ( $items[ (string) $seed['vase'] ]['badge'] ?? '' ), $items[ (string) $seed['vase'] ] ?? null );
check( 'hidden products never listed', ! isset( $items[ (string) $seed['hidden'] ] ), array_keys( $items ) );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: English only, no look without a layout', array( 'default' => 'en', 'available' => array( 'en' ) ) === ( $r['json']['languages'] ?? null ) && ! array_key_exists( 'appearance', $r['json'] ?? array() ), $r['json'] );

$checkout = wp_eval( 'echo wc_get_checkout_url();' );
$cart     = wp_eval( 'echo wc_get_cart_url();' );
$layout   = array(
	'version'    => '2026-10-13T18:00:00Z.7',
	'appearance' => array( 'template' => 'minimal', 'theme_mode' => 'system', 'user_can_change_mode' => false, 'secondary_color' => null, 'font' => 'Manrope', 'corners' => 'soft', 'cards' => 'outlined' ),
	'languages'  => array( 'default' => 'en', 'available' => array( 'en', 'ar', 'xx' ) ),
	'tabs'       => array(
		array( 'id' => 'home', 'label' => 'Home', 'icon' => 'home', 'target' => array( 'type' => 'page', 'page_slug' => 'home' ) ),
		array( 'id' => 'shop', 'label' => 'Shop', 'icon' => 'storefront', 'target' => array( 'type' => 'screen', 'screen' => 'search' ), 'translations' => array( 'ar' => array( 'label' => 'المتجر' ) ) ),
	),
	'pages'      => array(
		array(
			'slug'       => 'home',
			'title'      => 'Home',
			'show_title' => false,
			'updated_at' => '2026-10-13T18:00:00Z',
			'blocks'     => array(
				array( 'id' => 'hero', 'type' => 'banner', 'visibility' => 'everyone', 'image_url' => 'https://example.org/hero.jpg', 'heading' => 'Fresh flowers', 'action' => array( 'type' => 'url', 'url' => $cart ), 'translations' => array( 'ar' => array( 'heading' => 'زهور طازجة' ) ) ),
				array( 'id' => 'picked', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'grid', 'query' => array( 'ids' => array( (string) $seed['vase'], (string) $seed['hidden'], (string) $seed['sunflowers'] ), 'featured' => true, 'limit' => 10 ) ),
				array( 'id' => 'cheapest', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'list', 'query' => array( 'sort' => 'price_asc', 'limit' => 3 ) ),
				array( 'id' => 'dearest', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'list', 'query' => array( 'sort' => 'price_desc', 'limit' => 3 ) ),
				array( 'id' => 'gifts', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'carousel', 'query' => array( 'category_id' => (string) $seed['gifts'], 'limit' => 10 ) ),
				array( 'id' => 'featured', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'products', 'layout' => 'carousel', 'query' => array( 'featured' => true, 'limit' => 10 ) ),
				array( 'id' => 'cats', 'type' => 'categories', 'visibility' => 'everyone', 'source' => 'products', 'style' => 'tiles' ),
				array( 'id' => 'checkout', 'type' => 'button', 'visibility' => 'everyone', 'label' => 'Checkout', 'style' => 'filled', 'action' => array( 'type' => 'url', 'url' => $checkout, 'open_in' => 'browser' ) ),
				array( 'id' => 'courses', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'courses', 'layout' => 'grid', 'query' => array( 'limit' => 6 ) ),
				array( 'id' => 'course-cats', 'type' => 'categories', 'visibility' => 'everyone', 'source' => 'courses' ),
				array( 'id' => 'continue', 'type' => 'continue_learning', 'visibility' => 'everyone' ),
				array( 'id' => 'services', 'type' => 'items', 'visibility' => 'everyone', 'source' => 'services', 'layout' => 'grid', 'query' => array( 'limit' => 6 ) ),
				array( 'id' => 'service-cats', 'type' => 'categories', 'visibility' => 'everyone', 'source' => 'services' ),
				array( 'id' => 'course-button', 'type' => 'button', 'visibility' => 'everyone', 'label' => 'Courses', 'style' => 'text', 'action' => array( 'type' => 'course', 'course_id' => 5 ) ),
			),
		),
	),
);
store_layout( $layout );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config: published look', 'minimal' === ( $r['json']['appearance']['template'] ?? '' ) && null === $r['json']['appearance']['secondary_color'] && false === $r['json']['appearance']['user_can_change_mode'], $r['json']['appearance'] ?? null );
check( 'config: unknown language codes left out', array( 'default' => 'en', 'available' => array( 'en', 'ar' ) ) === ( $r['json']['languages'] ?? null ), $r['json']['languages'] ?? null );
$r = call( 'GET', '/pages?platform=android', null, null, array( 'Accept-Language: ar' ) );
check( 'arabic tab with English fallback', array( 'Home', 'المتجر' ) === array_column( $r['json']['tabs'] ?? array(), 'label' ), $r['json']['tabs'] ?? null );
$r    = call( 'GET', '/pages/home?platform=android', null, null, array( 'Accept-Language: ar' ) );
$page = $r['json'];
check( 'arabic banner heading', 'زهور طازجة' === ( page_block( $page, 'hero' )['heading'] ?? '' ), page_block( $page, 'hero' ) );
check( 'android: links to the cart and checkout kept', $cart === ( page_block( $page, 'hero' )['action']['url'] ?? '' ) && 'browser' === ( page_block( $page, 'checkout' )['action']['open_in'] ?? '' ), $page );
check( 'course and service blocks dropped without an LMS or booking plugin', array( 'hero', 'picked', 'cheapest', 'dearest', 'gifts', 'featured', 'cats', 'checkout' ) === page_block_ids( $page ), page_block_ids( $page ) );
check_item_shapes( 'published home: item shapes', $page );
check( 'hand-picked products in order, hidden left out', array( (string) $seed['vase'], (string) $seed['sunflowers'] ) === block_item_ids( page_block( $page, 'picked' ) ), page_block( $page, 'picked' ) );
check( 'sorted by price, cheapest first', ids( call( 'GET', '/store/products?orderby=price_asc&per_page=3' )['json']['items'] ?? array() ) === array_map( 'intval', block_item_ids( page_block( $page, 'cheapest' ) ) ), page_block( $page, 'cheapest' ) );
check( 'sorted by price, dearest first', ids( call( 'GET', '/store/products?orderby=price_desc&per_page=3' )['json']['items'] ?? array() ) === array_map( 'intval', block_item_ids( page_block( $page, 'dearest' ) ) ), page_block( $page, 'dearest' ) );
check( 'category filter', same_set( ids( call( 'GET', '/store/products?category=' . $seed['gifts'] )['json']['items'] ?? array() ), array_map( 'intval', block_item_ids( page_block( $page, 'gifts' ) ) ) ), page_block( $page, 'gifts' ) );
check( 'featured filter', same_set( array( (string) $seed['roses'], (string) $seed['chocolates'] ), block_item_ids( page_block( $page, 'featured' ) ) ), page_block( $page, 'featured' ) );
check( 'product categories block', 'tiles' === ( page_block( $page, 'cats' )['style'] ?? '' ) && same_set( array( 'Flowers', 'Gifts' ), array_column( page_block( $page, 'cats' )['categories'] ?? array(), 'name' ) ), page_block( $page, 'cats' ) );
$r    = call( 'GET', '/pages/home?platform=ios' );
$page = $r['json'];
check( 'ios: no links to the cart or checkout', null === page_block( $page, 'checkout' ) && null !== page_block( $page, 'hero' ) && ! isset( page_block( $page, 'hero' )['action'] ), page_block_ids( $page ) );
forget_layout();

echo "Cart\n";
$lines = array(
	array( 'product_id' => $seed['roses'], 'variation_id' => $seed['roses_medium'], 'quantity' => 2 ),
	array( 'product_id' => $seed['chocolates'], 'quantity' => 10 ),
	array( 'product_id' => $seed['ribbon'], 'variation_id' => $seed['ribbon_any'], 'quantity' => 1, 'attributes' => array( 'color' => 'Gold' ) ),
	array( 'product_id' => $seed['vase'], 'quantity' => 1 ),
	array( 'product_id' => $seed['gift_card'], 'quantity' => 1 ),
	array( 'product_id' => $seed['roses'], 'quantity' => 1 ),
	array( 'product_id' => $seed['ribbon'], 'variation_id' => $seed['ribbon_any'], 'quantity' => 1 ),
);
$r    = call( 'POST', '/store/cart?platform=android', array( 'lines' => $lines ) );
$cart = $r['json']['lines'] ?? array();
check( 'cart 200', 200 === $r['status'] && 7 === count( $cart ), $r['raw'] );
check( 'variation line priced', true === ( $cart[0]['available'] ?? null ) && false !== strpos( (string) ( $cart[0]['unit_price'] ?? '' ), '400' ) && false !== strpos( (string) ( $cart[0]['line_total'] ?? '' ), '800' ) && array_key_exists( 'problem', $cart[0] ?? array() ) && null === $cart[0]['problem'], $cart[0] ?? null );
check( 'quantity capped at the stock', 5 === ( $cart[1]['quantity'] ?? 0 ) && true === ( $cart[1]['available'] ?? null ) && 'Only 5 left in stock.' === ( $cart[1]['problem'] ?? '' ) && 5 === ( $cart[1]['max_quantity'] ?? 0 ), $cart[1] ?? null );
check( 'chosen colour in the name', true === ( $cart[2]['available'] ?? null ) && false !== strpos( (string) ( $cart[2]['name'] ?? '' ), 'Gold' ), $cart[2] ?? null );
check( 'out of stock line', false === ( $cart[3]['available'] ?? null ) && 'This product is out of stock.' === ( $cart[3]['problem'] ?? '' ), $cart[3] ?? null );
check( 'digital product on Android', true === ( $cart[4]['available'] ?? null ) && true === ( $cart[4]['digital'] ?? null ), $cart[4] ?? null );
check( 'variable product without options', false === ( $cart[5]['available'] ?? null ) && 'Choose the product options.' === ( $cart[5]['problem'] ?? '' ), $cart[5] ?? null );
check( 'any-colour line without a colour', false === ( $cart[6]['available'] ?? null ) && 'Choose the product options.' === ( $cart[6]['problem'] ?? '' ), $cart[6] ?? null );
check( 'subtotal of available lines', '1700.00' === ( $r['json']['subtotal_amount'] ?? '' ) && 9 === ( $r['json']['item_count'] ?? 0 ) && false !== strpos( (string) ( $r['json']['subtotal'] ?? '' ), '1,700' ), $r['raw'] );
$r = call( 'POST', '/store/cart?platform=ios', array( 'lines' => array( array( 'product_id' => $seed['gift_card'], 'quantity' => 1 ) ) ) );
check( 'digital product on iOS', false === ( $r['json']['lines'][0]['available'] ?? null ) && 'Digital products can be bought on the website.' === ( $r['json']['lines'][0]['problem'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/store/cart?platform=android', array( 'lines' => array() ) );
check( 'empty cart 400', 400 === $r['status'], $r['raw'] );

echo "Checkout link\n";
$session = sign_up( 'Ayla Yilmaz' );
$token   = $session['json']['access_token'] ?? '';
$user_id = (int) ( $session['json']['user']['id'] ?? 0 );
check( 'customer signs up without an LMS', 201 === $session['status'] && '' !== $token, $session['raw'] );
$good = array(
	array( 'product_id' => $seed['roses'], 'variation_id' => $seed['roses_medium'], 'quantity' => 2 ),
	array( 'product_id' => $seed['ribbon'], 'variation_id' => $seed['ribbon_any'], 'quantity' => 1, 'attributes' => array( 'color' => 'Gold' ) ),
);
$day  = delivery_day( 2 );
$r    = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => array( array( 'product_id' => $seed['chocolates'], 'quantity' => 10 ) ), 'delivery_date' => $day ), $token );
check( 'changed cart 409 with the lines', 409 === $r['status'] && 'cart_changed' === ( $r['json']['code'] ?? '' ) && $seed['chocolates'] === ( $r['json']['details']['lines'][0]['product_id'] ?? 0 ), $r['raw'] );
$r = call( 'POST', '/store/checkout-link?platform=ios', array( 'lines' => array( array( 'product_id' => $seed['gift_card'], 'quantity' => 1 ) ), 'delivery_date' => $day ), $token );
check( 'digital product on iOS 403', 403 === $r['status'] && 'purchase_not_allowed' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good ), $token );
check( 'delivery date required', 400 === $r['status'], $r['raw'] );
$sunday = new DateTimeImmutable( 'today +2 days', new DateTimeZone( 'Europe/Istanbul' ) );
while ( '0' !== $sunday->format( 'w' ) ) {
	$sunday = $sunday->modify( '+1 day' );
}
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => $sunday->format( 'Y-m-d' ) ), $token );
check( 'no Sunday deliveries', 400 === $r['status'], $r['raw'] );
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => ( new DateTimeImmutable( 'today', new DateTimeZone( 'Europe/Istanbul' ) ) )->format( 'Y-m-d' ) ), $token );
check( 'not today', 400 === $r['status'], $r['raw'] );
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => delivery_day( 20 ) ), $token );
check( 'not too far ahead', 400 === $r['status'], $r['raw'] );
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => $day, 'gift_message' => str_repeat( 'a', 101 ) ), $token );
check( 'gift message length', 400 === $r['status'], $r['raw'] );
$r    = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => $day, 'gift_message' => 'Happy birthday!' ), $token );
$link = (string) ( $r['json']['url'] ?? '' );
check( 'signed-in checkout link', 200 === $r['status'] && false !== strpos( $link, 'yallapp_link=' ) && 'in_app' === ( $r['json']['open_in'] ?? '' ), $r['raw'] );

$jar   = tempnam( sys_get_temp_dir(), 'jar' );
$step1 = browse( $link, $jar );
check( 'link signs in and goes to the cart filler', 302 === $step1['status'] && false !== strpos( $step1['location'], 'yallapp_cart=' ), $step1 );
$step2 = browse( $step1['location'], $jar );
check( 'cart filler opens the checkout', 302 === $step2['status'] && false !== strpos( $step2['location'], '/checkout' ), $step2 );
$saved = json_decode(
	wp_eval(
		'$session = ( new WC_Session_Handler() )->get_session( ' . $user_id . ' );
		$cart = array();
		foreach ( (array) maybe_unserialize( $session["cart"] ?? "" ) as $item ) {
			$cart[] = array( $item["product_id"], $item["variation_id"], $item["quantity"], $item["variation"] );
		}
		echo wp_json_encode( array( "cart" => $cart, "date" => maybe_unserialize( $session["yallapp_delivery_date"] ?? "" ), "gift" => maybe_unserialize( $session["yallapp_gift_message"] ?? "" ) ) );'
	),
	true
);
check(
	'WooCommerce cart filled for the customer',
	array(
		array( $seed['roses'], $seed['roses_medium'], 2, array( 'attribute_pa_size' => 'medium' ) ),
		array( $seed['ribbon'], $seed['ribbon_any'], 1, array( 'attribute_color' => 'Gold' ) ),
	) === ( $saved['cart'] ?? null ),
	$saved
);
check( 'delivery date and gift message kept for the order', $day === ( $saved['date'] ?? '' ) && 'Happy birthday!' === ( $saved['gift'] ?? '' ), $saved );
$again = browse( $step1['location'], $jar );
check( 'the cart link works once', 302 === $again['status'] && false === strpos( $again['location'], '/checkout' ), $again );

$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => $day ) );
check( 'guest checkout link', 200 === $r['status'] && false !== strpos( (string) ( $r['json']['url'] ?? '' ), 'yallapp_cart=' ) && false === strpos( (string) ( $r['json']['url'] ?? '' ), 'yallapp_link=' ), $r['raw'] );
$guest = browse( (string) ( $r['json']['url'] ?? '' ), tempnam( sys_get_temp_dir(), 'jar' ) );
check( 'guest goes to the checkout with a cart session', 302 === $guest['status'] && false !== strpos( $guest['location'], '/checkout' ) && false !== strpos( $guest['headers'], 'wp_woocommerce_session_' ), $guest );
wp_eval( 'update_option( "woocommerce_enable_guest_checkout", "no" );' );
$r = call( 'POST', '/store/checkout-link?platform=android', array( 'lines' => $good, 'delivery_date' => $day ) );
check( 'no guest checkout: sign in first', 401 === $r['status'], $r['raw'] );
wp_eval( 'update_option( "woocommerce_enable_guest_checkout", "yes" );' );

echo "Orders\n";
$meta = json_decode(
	wp_eval(
		'WC()->session = new WC_Session_Handler();
		WC()->session->init();
		WC()->session->set( "yallapp_delivery_date", "' . $day . '" );
		WC()->session->set( "yallapp_gift_message", "With love" );
		$order = wc_create_order( array( "customer_id" => ' . $user_id . ' ) );
		$order->add_product( wc_get_product( ' . (int) $seed['chocolates'] . ' ), 2 );
		do_action( "woocommerce_checkout_create_order", $order, array() );
		$order->calculate_totals();
		$order->set_status( "completed" );
		$order->save();
		$fields = apply_filters( "woocommerce_email_order_meta_fields", array(), false, $order );
		echo wp_json_encode( array( "date" => $order->get_meta( "_yallapp_delivery_date" ), "gift" => $order->get_meta( "_yallapp_gift_message" ), "email" => array_keys( $fields ), "left" => WC()->session->get( "yallapp_gift_message" ) ) );'
	),
	true
);
check( 'order keeps the delivery date and gift message', $day === ( $meta['date'] ?? '' ) && 'With love' === ( $meta['gift'] ?? '' ) && array_key_exists( 'left', (array) $meta ) && null === $meta['left'], $meta );
check( 'order emails show them', array( 'yallapp_delivery_date', 'yallapp_gift_message' ) === ( $meta['email'] ?? null ), $meta );
$r     = call( 'GET', '/me/orders', null, $token );
$order = $r['json']['items'][0] ?? array();
check( 'store orders', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && 'completed' === ( $order['status'] ?? '' ) && false !== strpos( (string) ( $order['total'] ?? '' ), '300' ), $r['raw'] );
check( 'order item shape', $seed['chocolates'] === ( $order['items'][0]['product_id'] ?? 0 ) && 2 === ( $order['items'][0]['quantity'] ?? 0 ) && array_key_exists( 'course_id', $order['items'][0] ?? array() ) && null === $order['items'][0]['course_id'], $order );

// 26 Following an order: its step from the WooCommerce status, one order by ID, only the customer's own.
check( 'a completed order is completed for following it', 'completed' === ( $order['fulfilment_status'] ?? '' ), $order );
wp_eval( '$o = wc_get_order( ' . (int) ( $order['id'] ?? 0 ) . ' ); $o->set_status( "processing" ); $o->save();' );
$r = call( 'GET', '/me/orders/' . (int) ( $order['id'] ?? 0 ), null, $token );
check( 'one order by ID, processing is preparing', 200 === $r['status'] && ( $order['id'] ?? 0 ) === ( $r['json']['id'] ?? -1 ) && 'preparing' === ( $r['json']['fulfilment_status'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/orders/' . ( (int) ( $order['id'] ?? 0 ) + 9999 ), null, $token );
check( 'an unknown order is not found', 404 === $r['status'] && 'not_found' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/orders/' . (int) ( $order['id'] ?? 0 ), null, null );
check( 'orders need a session', 401 === $r['status'], $r['raw'] );

// 91.2 Tracking from the tracking plugins, and order updates in the inbox, each shipment told once.
$order_id = (int) ( $order['id'] ?? 0 );
$updates  = static function () use ( $token, $order_id ) {
	$r = call( 'GET', '/me/notifications?per_page=50', null, $token );
	return array_values(
		array_filter(
			(array) ( $r['json']['items'] ?? array() ),
			static function ( $n ) use ( $order_id ) {
				return 'order_update' === ( $n['type'] ?? '' ) && $order_id === ( $n['order_id'] ?? 0 );
			}
		)
	);
};
$r = call( 'GET', '/me/orders/' . $order_id, null, $token );
check( '91.2 no shipment before tracking', array_key_exists( 'shipment', (array) $r['json'] ) && null === $r['json']['shipment'], $r['raw'] );
$told = $updates();
check( '91.2 the completed order was told', 1 === count( $told ) && 'Your order is complete. Thank you!' === ( $told[0]['body'] ?? '' ), $told );
$track = 'array( array( "tracking_provider" => "", "custom_tracking_provider" => "Aras Kargo", "custom_tracking_link" => "https://kargotakip.araskargo.com.tr/?code=3815602243", "tracking_number" => "3815602243", "date_shipped" => 1793000000 ) )';
wp_eval( '$o = wc_get_order( ' . $order_id . ' ); $o->update_meta_data( "_wc_shipment_tracking_items", ' . $track . ' ); $o->save();' );
$r = call( 'GET', '/me/orders/' . $order_id, null, $token );
check(
	'91.2 the order\'s shipment from the tracking plugin',
	array(
		'carrier'         => 'Aras Kargo',
		'tracking_number' => '3815602243',
		'tracking_url'    => 'https://kargotakip.araskargo.com.tr/?code=3815602243',
		'waybill'         => null,
		'shipped_at'      => gmdate( 'Y-m-d\TH:i:s\Z', 1793000000 ),
	) === ( $r['json']['shipment'] ?? null ),
	$r['raw']
);
$told = $updates();
check( '91.2 the shipment is told with its tracking', 2 === count( $told ) && 'Your order is on its way: Aras Kargo 3815602243. Tap to follow it.' === ( $told[0]['body'] ?? '' ) && 0 === strpos( (string) ( $told[0]['title'] ?? '' ), 'Order #' ), $told );
wp_eval( '$o = wc_get_order( ' . $order_id . ' ); $o->set_customer_note( "Leave at the door" ); $o->save();' );
check( '91.2 saving the order again tells nothing new', 2 === count( $updates() ), $updates() );
wp_eval( '$o = wc_get_order( ' . $order_id . ' ); $o->set_status( "cancelled" ); $o->save();' );
$told = $updates();
check( '91.2 a cancelled order is told', 3 === count( $told ) && 'Your order was cancelled.' === ( $told[0]['body'] ?? '' ), $told );

// 91.3 Returns asked for in the app: within the shop's days of completion, once, answered on the order.
$return = static function ( $body ) use ( $token, $order_id ) {
	return call( 'POST', '/me/orders/' . $order_id . '/return', $body, $token );
};
$r = $return( array( 'reason' => 'damaged' ) );
check( '91.3 a shop without returns says so', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
wp_eval( '$s = get_option( "yallapp_settings" ); $s["store_return_days"] = 14; update_option( "yallapp_settings", $s, false );' );
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( '91.3 the shop\'s return days in the config', array( 'enabled' => true, 'days' => 14 ) === ( $r['json']['store']['returns'] ?? null ), $r['json']['store'] ?? $r['raw'] );
$r = $return( array( 'reason' => 'damaged' ) );
check( '91.3 a cancelled order can\'t be returned', 403 === $r['status'] && 'forbidden' === ( $r['json']['code'] ?? '' ), $r['raw'] );
wp_eval( '$o = wc_get_order( ' . $order_id . ' ); $o->set_status( "completed" ); $o->save();' );
$r = call( 'GET', '/me/orders/' . $order_id, null, $token );
check( '91.3 a completed order can be returned', true === ( $r['json']['can_return'] ?? null ) && array_key_exists( 'return_request', (array) $r['json'] ) && null === $r['json']['return_request'], $r['raw'] );
$r = $return( array( 'reason' => 'other' ) );
check( '91.3 "other" needs a note', 400 === $r['status'] && 'invalid_request' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/me/orders/' . ( $order_id + 9999 ) . '/return', array( 'reason' => 'damaged' ), $token );
check( '91.3 only the customer\'s own orders', 404 === $r['status'], $r['raw'] );
$r = call( 'POST', '/me/orders/' . $order_id . '/return', array( 'reason' => 'damaged' ), null );
check( '91.3 returns need a session', 401 === $r['status'], $r['raw'] );
$r = $return( array( 'reason' => 'damaged', 'note' => 'The box arrived crushed' ) );
check(
	'91.3 the return is asked for',
	200 === $r['status'] && 'requested' === ( $r['json']['return_request']['status'] ?? '' ) && 'damaged' === ( $r['json']['return_request']['reason'] ?? '' ) && 'The box arrived crushed' === ( $r['json']['return_request']['note'] ?? '' ) && false === ( $r['json']['can_return'] ?? null ),
	$r['raw']
);
$r = $return( array( 'reason' => 'damaged' ) );
check( '91.3 once per order', 409 === $r['status'] && 'conflict' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$note = wp_eval( '$n = wc_get_order_notes( array( "order_id" => ' . $order_id . ', "limit" => 1 ) ); echo $n ? $n[0]->content : "";' );
check( '91.3 the shop sees it on the order', false !== strpos( $note, 'Return asked for in the app: It arrived damaged.' ) && false !== strpos( $note, 'The box arrived crushed' ), $note );
$before = count( $updates() );
wp_eval( '( new Yallapp\Commerce\Order_Returns( Yallapp\Plugin::instance() ) )->decide( wc_get_order( ' . $order_id . ' ), "approved", "Our courier picks it up on Monday." );' );
$r    = call( 'GET', '/me/orders/' . $order_id, null, $token );
$told = $updates();
check( '91.3 the shop\'s answer on the order', 'approved' === ( $r['json']['return_request']['status'] ?? '' ) && 'Our courier picks it up on Monday.' === ( $r['json']['return_request']['reply'] ?? '' ) && ! empty( $r['json']['return_request']['decided_at'] ), $r['raw'] );
check( '91.3 the customer is told', $before + 1 === count( $told ) && 'Your return was approved. Our courier picks it up on Monday.' === ( $told[0]['body'] ?? '' ), $told );
$answered = wp_eval( 'echo ( new Yallapp\Commerce\Order_Returns( Yallapp\Plugin::instance() ) )->decide( wc_get_order( ' . $order_id . ' ), "declined", "" ) ? "yes" : "no";' );
check( '91.3 an answered return isn\'t answered again', 'no' === trim( $answered ), $answered );

echo "The site's own pages open the app (48)\n";
require_once __DIR__ . '/links-helpers.php';
$root         = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$saved_links  = links_enable( array( 'app_type' => 'store' ) );
$product_url  = wp_eval( 'echo get_permalink( ' . (int) $seed['sunflowers'] . ' );' );
$category_url = wp_eval( 'echo get_term_link( ' . (int) $seed['flowers'] . ', "product_cat" );' );
$checkout     = wp_eval( 'echo get_permalink( wc_get_page_id( "checkout" ) );' );
$cart         = wp_eval( 'echo get_permalink( wc_get_page_id( "cart" ) );' );
$account      = wp_eval( 'echo get_permalink( wc_get_page_id( "myaccount" ) );' );
$components   = links_components( $root );
check( '48 product and category pages open the app', links_opens_app( $components, (string) parse_url( $product_url, PHP_URL_PATH ) ) && links_opens_app( $components, (string) parse_url( $category_url, PHP_URL_PATH ) ), array( $product_url, $category_url, $components ) );
$opened = array_values(
	array_filter(
		array( $checkout, $cart, $account, $account . 'orders/', $checkout . 'order-received/12/' ),
		function ( $url ) use ( $components ) {
			return links_opens_app( $components, (string) parse_url( $url, PHP_URL_PATH ) );
		}
	)
);
check( '48 the cart, checkout and account pages stay on the website', array() === $opened && in_array( array( '?' => array( 'add-to-cart' => '*' ), 'exclude' => true ), $components, true ), $opened );
$r = links_resolve( $product_url );
check( '48 resolve: the product', array( 'kind' => 'product', 'id' => (string) $seed['sunflowers'] ) === $r['json'], array( $product_url, $r['raw'] ) );
$r = links_resolve( $category_url );
check( '48 resolve: the product category', array( 'kind' => 'product_category', 'id' => (string) $seed['flowers'] ) === $r['json'], array( $category_url, $r['raw'] ) );
foreach ( array( $checkout, $cart, $account, $product_url . '?add-to-cart=' . (int) $seed['sunflowers'] ) as $url ) {
	$r = links_resolve( $url );
	check( '48 resolve: ' . parse_url( $url, PHP_URL_PATH ) . ' is not something the app opens', array( 'kind' => null, 'id' => null ) === $r['json'], array( $url, $r['raw'] ) );
}
$paths = json_decode( wp_eval( 'echo wp_json_encode( Yallapp\Plugin::instance()->license()->site_info( "YALL-TEST" )["link_paths"] );' ), true );
check( '48 the license check reports the product bases for Android', array( '/product-category/', '/product/' ) === $paths, $paths );
links_restore( $saved_links );

// 86.4 The shop's totals the license check sends: a paid order today, less its refund, and the refund, beside the report before it.
$sales = json_decode(
	wp_eval(
		'$before = Yallapp\Site_Sales::report();'
		. ' $order = wc_create_order(); $order->set_currency( "TRY" ); $order->set_total( 300 ); $order->set_date_paid( time() ); $order->set_status( "processing" ); $order->save();'
		. ' wc_create_refund( array( "order_id" => $order->get_id(), "amount" => 50 ) );'
		. ' $after = Yallapp\Site_Sales::report(); $order->delete( true );'
		. ' echo wp_json_encode( array( $before, $after ) );'
	),
	true
);
$try   = static function ( $day ) {
	foreach ( $day['revenue'] ?? array() as $sum ) {
		if ( 'TRY' === $sum['currency'] ) {
			return $sum['cents'];
		}
	}
	return 0;
};
$then  = is_array( $sales[0] ?? null ) ? end( $sales[0] ) : array();
$today = is_array( $sales[1] ?? null ) ? end( $sales[1] ) : array();
check( '86.4 the shop\'s totals of the last eight days', is_array( $sales[1] ?? null ) && 8 === count( $sales[1] ) && trim( wp_eval( 'echo wp_date( "Y-m-d" );' ) ) === ( $today['day'] ?? '' ), $sales );
check(
	'86.4 today: the paid order less its refund, and the refund',
	1 === ( $today['orders'] ?? 0 ) - ( $then['orders'] ?? 0 ) && 25000 === $try( $today ) - $try( $then ) && 1 === ( $today['refunds'] ?? 0 ) - ( $then['refunds'] ?? 0 ),
	array( $then, $today )
);

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
