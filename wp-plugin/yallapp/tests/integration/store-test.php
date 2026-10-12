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

function call( $method, $path, $body = null, $token = null ) {
	global $base;
	$ch = curl_init( 0 === strpos( $path, 'http' ) ? $path : $base . $path );
	$h  = array( 'Accept: application/json' );
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
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	curl_close( $ch );
	return array(
		'status' => $status,
		'raw'    => $raw,
		'json'   => json_decode( $raw, true ),
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
$r = call( 'GET', '/courses' );
check( 'course endpoints say courses are unavailable', 503 === $r['status'] && 'lms_unavailable' === ( $r['json']['code'] ?? '' ), $r['raw'] );

echo "Catalog\n";
$r     = call( 'GET', '/store/categories' );
$names = array();
foreach ( $r['json']['items'] ?? array() as $category ) {
	$names[ $category['name'] ] = $category;
}
check( 'categories without Uncategorized', 200 === $r['status'] && same_set( array( 'Flowers', 'Roses', 'Gifts' ), array_keys( $names ) ), $r['raw'] );
check( 'subcategory parent', $seed['flowers'] === ( $names['Roses']['parent_id'] ?? 0 ) && null === ( $names['Flowers']['parent_id'] ?? 0 ), $names );

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
check( 'size attribute', 'pa_size' === ( $size['slug'] ?? '' ) && 'Size' === ( $size['name'] ?? '' ) && true === ( $size['variation'] ?? null ) && array( 'small', 'medium', 'large' ) === array_map( function ( $o ) { return $o['value']; }, $size['options'] ?? array() ) && 'Large' === ( $size['options'][2]['label'] ?? '' ), $size );
$variations = array();
foreach ( $roses['variations'] ?? array() as $variation ) {
	$variations[ $variation['id'] ] = $variation;
}
check( 'three variations', 3 === count( $variations ) && array( 'pa_size' => 'medium' ) === ( $variations[ $seed['roses_medium'] ]['attributes'] ?? null ), $roses['variations'] ?? null );
check( 'variation sale price', '400.00' === ( $variations[ $seed['roses_medium'] ]['price']['amount'] ?? '' ) && '450.00' === ( $variations[ $seed['roses_medium'] ]['price']['regular_amount'] ?? '' ), $variations[ $seed['roses_medium'] ] ?? null );
check( 'variation stock limit', 2 === ( $variations[ $seed['roses_large'] ]['max_quantity'] ?? 0 ) && null === ( $variations[ $seed['roses_small'] ]['max_quantity'] ?? 0 ), $variations );
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
check( 'variation line priced', true === ( $cart[0]['available'] ?? null ) && false !== strpos( (string) ( $cart[0]['unit_price'] ?? '' ), '400' ) && false !== strpos( (string) ( $cart[0]['line_total'] ?? '' ), '800' ) && null === ( $cart[0]['problem'] ?? 'x' ), $cart[0] ?? null );
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
check( 'order keeps the delivery date and gift message', $day === ( $meta['date'] ?? '' ) && 'With love' === ( $meta['gift'] ?? '' ) && null === ( $meta['left'] ?? 'x' ), $meta );
check( 'order emails show them', array( 'yallapp_delivery_date', 'yallapp_gift_message' ) === ( $meta['email'] ?? null ), $meta );
$r     = call( 'GET', '/me/orders', null, $token );
$order = $r['json']['items'][0] ?? array();
check( 'store orders', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && 'completed' === ( $order['status'] ?? '' ) && false !== strpos( (string) ( $order['total'] ?? '' ), '300' ), $r['raw'] );
check( 'order item shape', $seed['chocolates'] === ( $order['items'][0]['product_id'] ?? 0 ) && 2 === ( $order['items'][0]['quantity'] ?? 0 ) && null === ( $order['items'][0]['course_id'] ?? 'x' ), $order );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
