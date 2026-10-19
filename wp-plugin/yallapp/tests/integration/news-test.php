<?php
/**
 * End-to-end checks of the News & blog endpoints against a news site seeded by
 * tests/dev-site/seed-news.php (no LMS, no shop): articles, categories, the home screen,
 * page blocks and the notification for a new post.
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{"ferry":4,...}' php news-test.php http://127.0.0.1:8089
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

function device( $id ) {
	return array(
		'id'          => $id,
		'platform'    => 'android',
		'name'        => 'Test ' . $id,
		'app_version' => '1.0.0',
	);
}

require __DIR__ . '/pages-helpers.php';

$s = array_map( 'strval', $seed );

echo "Config\n";
$r = call( 'GET', '/config?platform=android&app_version=1.0.0' );
check( 'config 200', 200 === $r['status'], $r['raw'] );
check(
	'Config.news: author and dates shown, no new-post push yet',
	array(
		'show_author'        => true,
		'show_dates'         => true,
		'breaking_news_push' => false,
	) === ( $r['json']['news'] ?? null ),
	$r['json']['news'] ?? null
);

echo "Articles\n";
$r = call( 'GET', '/news/articles' );
check( 'only published, public posts, newest first', 200 === $r['status'] && array( $s['ferry'], $s['match'], $s['tram'] ) === ids( $r['json']['items'] ?? null ) && 3 === ( $r['json']['total'] ?? 0 ), $r['raw'] );
$ferry = $r['json']['items'][0] ?? array();
check(
	'an article summary',
	'Night ferries return' === ( $ferry['title'] ?? '' ) && 'Late boats are back.' === ( $ferry['excerpt'] ?? '' ) && 'Ayla Demir' === ( $ferry['author'] ?? '' )
		&& '2026-10-13T08:00:00Z' === ( $ferry['published_at'] ?? '' ) && false !== strpos( (string) ( $ferry['image_url'] ?? '' ), 'ferry' )
		&& array(
			array(
				'id'   => $s['city'],
				'name' => 'City',
			),
		) === ( $ferry['categories'] ?? null ) && true === ( $ferry['featured'] ?? null ) && false !== strpos( (string) ( $ferry['url'] ?? '' ), 'night-ferries-return' ),
	$ferry
);
$r = call( 'GET', '/news/articles?category=' . $s['sport'] );
check( 'by category', array( $s['match'] ) === ids( $r['json']['items'] ?? null ), $r['raw'] );
$r = call( 'GET', '/news/articles?search=tram' );
check( 'search', array( $s['tram'] ) === ids( $r['json']['items'] ?? null ), $r['raw'] );
$r = call( 'GET', '/news/articles?search=rota' );
check( 'search never finds private posts', 0 === ( $r['json']['total'] ?? -1 ), $r['raw'] );
$r = call( 'GET', '/news/articles?featured=true' );
check( 'featured: sticky posts', array( $s['ferry'] ) === ids( $r['json']['items'] ?? null ), $r['raw'] );
$r = call( 'GET', '/news/articles?ids=' . $s['tram'] . ',' . $s['private'] . ',' . $s['ferry'] . ',' . $s['page'] );
check( 'ids keep their order and skip what isn\'t public', array( $s['tram'], $s['ferry'] ) === ids( $r['json']['items'] ?? null ), $r['raw'] );
$r = call( 'GET', '/news/articles?per_page=2&page=2' );
check( 'pages', array( $s['tram'] ) === ids( $r['json']['items'] ?? null ) && 2 === ( $r['json']['total_pages'] ?? 0 ) && 2 === ( $r['json']['page'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/news/articles?search=' . str_repeat( 'x', 101 ) );
check( 'a search over 100 characters is refused', 400 === $r['status'], $r['raw'] );

$r    = call( 'GET', '/news/articles/' . $s['ferry'] );
$body = $r['json'] ?? array();
check( 'an article is processed like a lesson', 200 === $r['status'] && 'native' === ( $body['render_mode'] ?? '' ) && false !== strpos( (string) ( $body['html'] ?? '' ), '<div data-yallapp-embed="yallapp-embed-1"></div>' ) && false === strpos( (string) $body['html'], '<iframe' ), $r['raw'] );
check( 'its embed', 'youtube' === ( $body['embeds'][0]['provider'] ?? '' ) && 'https://www.youtube.com/embed/abc123' === ( $body['embeds'][0]['src'] ?? '' ) && 1.7778 === ( $body['embeds'][0]['aspect_ratio'] ?? null ), $body['embeds'] ?? null );
foreach ( array( 'private', 'locked', 'draft', 'page' ) as $key ) {
	$r = call( 'GET', '/news/articles/' . $s[ $key ] );
	check( "no article for the $key post", 404 === $r['status'] && 'not_found' === ( $r['json']['code'] ?? '' ), $r['raw'] );
}

echo "Categories and home\n";
$r = call( 'GET', '/news/categories' );
check(
	'categories with public posts, counted without private ones, no Uncategorized',
	array(
		array(
			'id'    => $s['city'],
			'name'  => 'City',
			'count' => 3,
		),
		array(
			'id'    => $s['sport'],
			'name'  => 'Sport',
			'count' => 1,
		),
	) === ( $r['json']['items'] ?? null ),
	$r['raw']
);
$r    = call( 'GET', '/news/home' );
$home = $r['json'] ?? array();
check( 'home: the sticky post is the top story', array( $s['ferry'] ) === ids( $home['featured'] ?? null ), $r['raw'] );
check( 'home: the latest without repeating it', array( $s['match'], $s['tram'] ) === ids( $home['latest'] ?? null ), $home['latest'] ?? null );
check( 'home: a rail per category', array( 'City', 'Sport' ) === array_map( function ( $rail ) { return $rail['category']['name']; }, $home['rails'] ?? array() ) && 3 === count( $home['rails'][0]['articles'] ?? array() ), $home['rails'] ?? null );

wp_eval( '$s = Yallapp\Plugin::instance()->settings(); $s->update( array( "news_show_author" => false ) );' );
$r = call( 'GET', '/news/articles' );
check( 'authors hidden when the owner turns them off', array( null, null, null ) === array_column( $r['json']['items'] ?? array(), 'author' ) && 3 === count( $r['json']['items'] ), $r['raw'] );
wp_eval( '$s = Yallapp\Plugin::instance()->settings(); $s->update( array( "news_show_author" => true ) );' );

echo "Pages\n";
// The type chosen in the dashboard: a News & blog app gets the news pages before any are published.
wp_eval( 'update_option( "yallapp_license", array( "app_type" => "news" ), false );' );
$r = call( 'GET', '/pages?platform=android' );
check_navigation_shape( 'navigation', $r['json'] ?? null );
check( 'tabs: Home, Latest, Saved, Account', array( 'home', 'articles', 'saved', 'account' ) === ids( $r['json']['tabs'] ?? null ), $r['json']['tabs'] ?? null );
$r    = call( 'GET', '/pages/home?platform=android' );
$page = $r['json'] ?? array();
check( 'the news home page', array( 'search', 'top-stories', 'categories', 'latest' ) === page_block_ids( $page ), $page );
check_item_shapes( 'article cards', $page );
check( 'top stories: the sticky post, opened in the app', array( $s['ferry'] ) === block_item_ids( page_block( $page, 'top-stories' ) ) && array( 'type' => 'item', 'item' => array( 'source' => 'articles', 'id' => $s['ferry'] ) ) === ( page_block( $page, 'top-stories' )['items'][0]['action'] ?? null ), page_block( $page, 'top-stories' ) );
check( 'latest: every public post', array( $s['ferry'], $s['match'], $s['tram'] ) === block_item_ids( page_block( $page, 'latest' ) ), page_block( $page, 'latest' ) );
check( 'sections', array( 'City', 'Sport' ) === array_column( page_block( $page, 'categories' )['categories'] ?? array(), 'name' ), page_block( $page, 'categories' ) );

echo "A new post\n";
$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
$r     = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
$v     = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => device( 'dev-' . $phone ) ) );
$reg   = call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'] ?? '', 'name' => 'Reader', 'device' => device( 'dev-' . $phone ) ) );
$token = $reg['json']['access_token'] ?? '';
check( 'a reader signs up', '' !== $token, $reg['raw'] );
$r = call( 'PUT', '/me/push-token', array( 'token' => 'fcm-reader', 'preferences' => array( 'news' => true ) ), $token );
check( 'the reader allows news', 204 === $r['status'], $r['raw'] );

$off = (int) wp_eval( 'echo wp_insert_post( array( "post_title" => "Quiet post", "post_content" => "<p>Shh.</p>", "post_status" => "publish", "post_author" => 1 ) );' );
check( 'with the setting off, publishing schedules nothing', '' === wp_eval( 'echo wp_next_scheduled( "yallapp_notify_post", array( ' . $off . ' ) ) ?: "";' ) );

wp_eval( '$s = Yallapp\Plugin::instance()->settings(); $s->update( array( "notify_new_post" => true ) );' );
$new = (int) wp_eval( 'echo wp_insert_post( array( "post_title" => "Breaking: bridge opens", "post_excerpt" => "Cars from Monday.", "post_content" => "<p>Cars from Monday.</p>", "post_status" => "publish", "post_author" => 1 ) );' );
check( 'publishing schedules the notification', '' !== wp_eval( 'echo wp_next_scheduled( "yallapp_notify_post", array( ' . $new . ' ) ) ?: "";' ) );
$skip = (int) wp_eval( '$id = wp_insert_post( array( "post_title" => "Correction", "post_content" => "<p>Small fix.</p>", "post_status" => "draft", "post_author" => 1 ) ); update_post_meta( $id, "_yallapp_no_push", 1 ); wp_publish_post( $id ); echo $id;' );
$sent = wp_eval( '$p = Yallapp\Plugin::instance()->push(); echo wp_json_encode( array( $p->notify_post( ' . $new . ' ), $p->notify_post( ' . $new . ' ), $p->notify_post( ' . $skip . ' ), $p->notify_post( ' . $s['private'] . ' ) ) );' );
check( 'sent once; not for a post left out in its box, nor a private one', '[true,false,false,false]' === $sent, $sent );
$r     = call( 'GET', '/me/notifications', null, $token );
$items = $r['json']['items'] ?? array();
check(
	'the reader\'s inbox opens the article',
	200 === $r['status'] && 1 === count( $items ) && 'article' === ( $items[0]['type'] ?? '' ) && (string) $new === ( $items[0]['article_id'] ?? '' )
		&& 'Breaking: bridge opens' === ( $items[0]['title'] ?? '' ) && 'Cars from Monday.' === ( $items[0]['body'] ?? '' ),
	$r['raw']
);
$r = call( 'GET', '/news/articles' );
check( 'the new post is an article', in_array( (string) $new, ids( $r['json']['items'] ?? null ), true ), $r['raw'] );

echo "The site's own pages open the app (48)\n";
require_once __DIR__ . '/links-helpers.php';
$root        = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$saved_links = links_enable( array( 'app_type' => 'news' ) );
$structure   = wp_eval( 'echo get_option( "permalink_structure" );' );
foreach ( array( '/%postname%/' => array(), '/blog/%postname%/' => array( '/blog/' ), '/%year%/%monthnum%/%postname%/' => array() ) as $permalinks => $android ) {
	wp_eval( 'global $wp_rewrite; $wp_rewrite->set_permalink_structure( ' . var_export( $permalinks, true ) . ' ); flush_rewrite_rules( false );' );
	$post_url   = wp_eval( 'echo get_permalink( ' . (int) $seed['ferry'] . ' );' );
	$page_url   = wp_eval( 'echo get_permalink( ' . (int) $seed['page'] . ' );' );
	$components = links_components( $root );
	$label      = '48 ' . $permalinks . ': ';
	check( $label . 'a post opens the app', links_opens_app( $components, (string) parse_url( $post_url, PHP_URL_PATH ) ), array( $post_url, $components ) );
	check( $label . 'the home page, admin, sign-in, REST and feeds stay on the website', ! links_opens_app( $components, '/' ) && ! links_opens_app( $components, '/wp-admin/' ) && ! links_opens_app( $components, '/wp-login.php' ) && ! links_opens_app( $components, '/wp-json/wp/v2/posts' ) && ! links_opens_app( $components, '/feed/' ), $components );
	$r = links_resolve( $post_url );
	check( $label . 'resolve: the post is an article', array( 'kind' => 'article', 'id' => (string) $seed['ferry'] ) === $r['json'], array( $post_url, $r['raw'] ) );
	$r = links_resolve( $page_url );
	check( $label . 'resolve: a page opens the in-app browser', array( 'kind' => null, 'id' => null ) === $r['json'], array( $page_url, $r['raw'] ) );
	$paths = json_decode( wp_eval( 'echo wp_json_encode( Yallapp\Plugin::instance()->license()->site_info( "YALL-TEST" )["link_paths"] );' ), true );
	check( $label . 'Android gets the posts only under a fixed folder', $android === $paths, $paths );
}
$r = links_resolve( wp_eval( 'echo get_permalink( ' . (int) $seed['draft'] . ' );' ) );
check( '48 resolve: a draft is not named', array( 'kind' => null, 'id' => null ) === $r['json'], $r['raw'] );
$r = links_resolve( wp_eval( 'echo get_permalink( ' . (int) $seed['locked'] . ' );' ) );
check( '48 resolve: a post with a password is not named', array( 'kind' => null, 'id' => null ) === $r['json'], $r['raw'] );
wp_eval( 'global $wp_rewrite; $wp_rewrite->set_permalink_structure( ' . var_export( $structure, true ) . ' ); flush_rewrite_rules( false );' );
links_restore( $saved_links );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
