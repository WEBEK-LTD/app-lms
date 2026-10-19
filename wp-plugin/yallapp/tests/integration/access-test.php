<?php
/**
 * 39 Every way a student gets a Tutor LMS course opens it in the app, and nothing else does.
 *
 * Runs against the Tutor LMS dev site with WooCommerce selling the paid courses (setup.sh
 * with WOO=1): a free course enrolled in the app and on the website, a paid course bought on
 * the website's WooCommerce checkout (opened from the app's checkout link) through every
 * order status, a course the admin enrolls a student in, the lesson preview flag, Tutor's
 * own enrollment filter, and a guest on Android and iOS. Locked content must be refused by
 * the API itself, not only hidden.
 *
 * Usage: WP_CLI='wp --path=<site>' SEED_IDS='{...}' php access-test.php http://127.0.0.1:8089
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$site  = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' );
$base  = $site . '/wp-json/yallapp/v1';
$seed  = json_decode( (string) getenv( 'SEED_IDS' ), true );
$fails = 0;
$count = 0;
if ( ! is_array( $seed ) || empty( $seed['photo'] ) ) {
	fwrite( STDERR, "Set SEED_IDS to the yallapp_seed_ids option of a site built with WOO=1.\n" );
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
 * A browser request with a cookie jar (the in-app browser the checkout opens in).
 */
function browse( $jar, $url, $method = 'GET', $body = null, array $headers = array() ) {
	$ch = curl_init( $url );
	curl_setopt_array(
		$ch,
		array(
			CURLOPT_CUSTOMREQUEST  => $method,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_HEADER         => true,
			CURLOPT_COOKIEJAR      => $jar,
			CURLOPT_COOKIEFILE     => $jar,
			CURLOPT_HTTPHEADER     => array_merge( array( 'Accept: text/html,application/json' ), $headers ),
			CURLOPT_TIMEOUT        => 120,
		)
	);
	if ( null !== $body ) {
		curl_setopt( $ch, CURLOPT_POSTFIELDS, is_string( $body ) ? $body : json_encode( $body ) );
	}
	$raw  = (string) curl_exec( $ch );
	$size = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	$out  = array(
		'status'  => (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE ),
		'url'     => (string) curl_getinfo( $ch, CURLINFO_EFFECTIVE_URL ),
		'headers' => strtolower( substr( $raw, 0, $size ) ),
		'raw'     => substr( $raw, $size ),
	);
	curl_close( $ch );
	$out['json'] = json_decode( $out['raw'], true );
	return $out;
}

function check( $name, $ok, $detail = '' ) {
	global $fails, $count;
	++$count;
	if ( $ok ) {
		echo "  ok    $name\n";
		return;
	}
	++$fails;
	echo "  FAIL  $name" . ( '' !== $detail ? "\n        " . substr( is_string( $detail ) ? $detail : json_encode( $detail ), 0, 600 ) : '' ) . "\n";
}

function device( $id, $platform = 'android' ) {
	return array(
		'id'          => $id,
		'platform'    => $platform,
		'name'        => 'Phone ' . $id,
		'app_version' => '1.0.0',
	);
}

function sign_up( $name, $device ) {
	$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
	$r     = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	$r     = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => $device ) );
	$r     = call( 'POST', '/auth/register', array( 'signup_token' => $r['json']['signup_token'] ?? '', 'name' => $name, 'device' => $device ) );
	return $r['json'] ?? array();
}

function wp_cli( $args ) {
	return (string) shell_exec( getenv( 'WP_CLI' ) . ' ' . $args . ' 2>/dev/null' );
}

function wp_eval( $php ) {
	return trim( wp_cli( 'eval ' . escapeshellarg( $php ) ) );
}

/**
 * IDs of a student's courses on the My courses screen (both tabs).
 */
function my_course_ids( $token ) {
	$ids = array();
	foreach ( array( 'in_progress', 'completed' ) as $status ) {
		$r = call( 'GET', '/me/courses?status=' . $status, null, $token );
		foreach ( (array) ( $r['json']['items'] ?? array() ) as $item ) {
			$ids[] = (int) ( $item['course']['id'] ?? 0 );
		}
	}
	return $ids;
}

/**
 * Whether the app opens everything in a course: course page, each lesson, the quiz.
 * Returns the failures, or an empty array.
 */
function opens_everything( $token, $course_id, $lessons, $quiz ) {
	$problems = array();
	$r        = call( 'GET', '/courses/' . $course_id . '?platform=android', null, $token );
	if ( true !== ( $r['json']['enrolled'] ?? null ) || 'continue' !== ( $r['json']['purchase']['action'] ?? '' ) ) {
		$problems[] = 'course page ' . $r['raw'];
	}
	$r = call( 'GET', '/courses/' . $course_id . '/curriculum', null, $token );
	foreach ( (array) ( $r['json']['topics'] ?? array() ) as $topic ) {
		foreach ( $topic['items'] as $item ) {
			if ( $item['locked'] ) {
				$problems[] = 'locked item ' . $item['id'];
			}
		}
	}
	foreach ( $lessons as $lesson ) {
		$r = call( 'GET', '/lessons/' . $lesson, null, $token );
		if ( 200 !== $r['status'] ) {
			$problems[] = 'lesson ' . $lesson . ' ' . $r['status'];
		}
	}
	if ( $quiz ) {
		$r = call( 'GET', '/quizzes/' . $quiz, null, $token );
		if ( 200 !== $r['status'] ) {
			$problems[] = 'quiz ' . $r['status'];
		}
	}
	return $problems;
}

/**
 * Whether the API refuses a course's content: lessons, progress, completing, the quiz.
 */
function refuses_everything( $token, $lessons, $quiz ) {
	$problems = array();
	foreach ( $lessons as $lesson ) {
		$r = call( 'GET', '/lessons/' . $lesson, null, $token );
		if ( 403 !== $r['status'] || 'not_enrolled' !== ( $r['json']['code'] ?? '' ) || false !== strpos( $r['raw'], 'content_html' ) ) {
			$problems[] = 'lesson ' . $lesson . ' ' . $r['status'];
		}
		$r = call( 'POST', '/lessons/' . $lesson . '/complete', array(), $token );
		if ( 403 !== $r['status'] ) {
			$problems[] = 'complete ' . $lesson . ' ' . $r['status'];
		}
		$r = call( 'PUT', '/lessons/' . $lesson . '/progress', array( 'position_seconds' => 5, 'watched_percent' => 10 ), $token );
		if ( 403 !== $r['status'] ) {
			$problems[] = 'progress ' . $lesson . ' ' . $r['status'];
		}
	}
	if ( $quiz ) {
		foreach ( array( array( 'GET', '' ), array( 'POST', '/attempts' ) ) as $q ) {
			$r = call( $q[0], '/quizzes/' . $quiz . $q[1], 'POST' === $q[0] ? array() : null, $token );
			if ( 403 !== $r['status'] ) {
				$problems[] = 'quiz' . $q[1] . ' ' . $r['status'];
			}
		}
	}
	return $problems;
}

/**
 * The newest WooCommerce order of a user: id, status and the Tutor enrollment's status.
 */
function last_order( $user_id, $course_id ) {
	return json_decode(
		wp_eval(
			'$o = wc_get_orders( array( "customer_id" => ' . (int) $user_id . ', "limit" => 1, "orderby" => "date", "order" => "DESC" ) ); $o = $o ? $o[0] : null;'
			. ' global $wpdb; $e = $wpdb->get_var( $wpdb->prepare( "SELECT post_status FROM {$wpdb->posts} WHERE post_type = %s AND post_parent = %d AND post_author = %d ORDER BY ID DESC LIMIT 1", "tutor_enrolled", ' . (int) $course_id . ', ' . (int) $user_id . ' ) );'
			. ' echo wp_json_encode( array( "id" => $o ? $o->get_id() : 0, "status" => $o ? $o->get_status() : "", "enrollment" => $e ) );'
		),
		true
	);
}

/**
 * Buys a course on the website as the app sends the student there: the app's signed-in
 * checkout link, then WooCommerce's checkout (the block checkout's Store API).
 */
function buy_on_website( $token, $course_id, $product_id, $gateway ) {
	global $site;
	$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'android', 'course_id' => $course_id ), $token );
	if ( 200 !== $r['status'] ) {
		return array( 'error' => 'checkout link ' . $r['raw'] );
	}
	$jar  = tempnam( sys_get_temp_dir(), 'yallapp-jar' );
	$page = browse( $jar, $r['json']['url'] );
	$out  = array( 'landing' => $page['url'] );
	// The checkout page's nonces, as the block checkout sends them.
	$rest_nonce  = preg_match( '/createNonceMiddleware\(\s*"([0-9a-f]+)"\s*\)/', $page['raw'], $m ) ? $m[1] : '';
	$cart        = browse( $jar, $site . '/wp-json/wc/store/v1/cart', 'GET', null, array( 'X-WP-Nonce: ' . $rest_nonce ) );
	$store_nonce = preg_match( '/^nonce: *(\S+)/m', $cart['headers'], $m ) ? $m[1] : '';
	$out['cart'] = array_column( (array) ( $cart['json']['items'] ?? array() ), 'id' );
	$checkout    = browse(
		$jar,
		$site . '/wp-json/wc/store/v1/checkout',
		'POST',
		array(
			'billing_address' => array(
				'first_name' => 'Test',
				'last_name'  => 'Student',
				'email'      => 'student' . random_int( 1000, 99999 ) . '@example.org',
				'address_1'  => 'Tahrir Square 1',
				'city'       => 'Cairo',
				'postcode'   => '11511',
				'country'    => 'EG',
				'phone'      => '+201001234567',
			),
			'payment_method'  => $gateway,
		),
		array( 'Content-Type: application/json', 'X-WP-Nonce: ' . $rest_nonce, 'Nonce: ' . $store_nonce )
	);
	@unlink( $jar );
	$out['checkout'] = $checkout['status'];
	$out['order']    = (int) ( $checkout['json']['order_id'] ?? 0 );
	$out['raw']      = $checkout['raw'];
	return $out;
}

$photo_lessons = array( $seed['photo_lesson'], $seed['photo_lesson_2'] );

echo "Guest\n";
$r = call( 'GET', '/courses/' . $seed['photo'] . '?platform=android' );
check( 'paid course: price from WooCommerce', 200 === $r['status'] && false === $r['json']['price']['is_free'] && '300.00' === $r['json']['price']['amount'] && '250.00' === $r['json']['price']['sale_amount'] && 'USD' === $r['json']['price']['currency'], $r['json']['price'] ?? $r['raw'] );
check( 'paid course: the price reads as the website shows it, without screen-reader text', '$250.00' === ( $r['json']['price']['formatted'] ?? '' ), $r['json']['price'] ?? null );
check( 'android: buy on the website', 'checkout' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? null );
$r = call( 'GET', '/courses/' . $seed['photo'] . '?platform=ios' );
check( 'ios: no purchase button', 200 === $r['status'] && 'none' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? $r['raw'] );
$r = call( 'GET', '/config?platform=ios&app_version=1.0.0' );
check( 'ios: enroll button off', false === ( $r['json']['purchases']['enroll_button'] ?? null ), $r['json']['purchases'] ?? null );
$r = call( 'GET', '/courses/' . $seed['photo'] . '/curriculum' );
$locked = array();
foreach ( (array) ( $r['json']['topics'][0]['items'] ?? array() ) as $item ) {
	$locked[ $item['type'] ] = $item['locked'];
}
check( 'guest: every item of the paid course locked', array( 'lesson' => true, 'assignment' => true, 'quiz' => true ) === $locked, $r['raw'] );
foreach ( $photo_lessons as $lesson ) {
	$r = call( 'GET', '/lessons/' . $lesson );
	check( "guest: lesson $lesson refused by the API", 401 === $r['status'] && false === strpos( $r['raw'], 'content_html' ), $r['raw'] );
}
$r = call( 'GET', '/quizzes/' . $seed['photo_quiz'] );
check( 'guest: quiz refused', 401 === $r['status'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_preview'] );
check( 'guest: the preview lesson of a paid course opens', 200 === $r['status'] && ! empty( $r['json']['id'] ), $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_locked'] );
check( 'guest: its other lesson does not', 401 === $r['status'], $r['raw'] );
$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'android', 'course_id' => $seed['photo'] ) );
check( 'guest: checkout needs a sign-in', 401 === $r['status'], $r['raw'] );

echo "Free course, enrolled in the app\n";
$a    = sign_up( 'Mona Adel', device( 'acc-a' ) );
$a_id = (int) ( $a['user']['id'] ?? 0 );
check( 'student signs up', $a_id > 0, $a );
$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=ios', null, $a['access_token'] );
check( 'free course on ios: enroll for free', 'enroll_free' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $a['access_token'] );
check( 'free course: lessons refused before enrolling', 403 === $r['status'] && 'not_enrolled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/enroll', array(), $a['access_token'] );
check( 'enroll for free', in_array( $r['status'], array( 200, 201 ), true ) && $seed['python'] === ( $r['json']['course_id'] ?? 0 ), $r['raw'] );
check( 'listed in My courses', in_array( $seed['python'], my_course_ids( $a['access_token'] ), true ) );
check( 'every lesson and the quiz open', ! opens_everything( $a['access_token'], $seed['python'], array( $seed['lesson_video'], $seed['lesson_html'], $seed['lesson_script'] ), $seed['quiz'] ), opens_everything( $a['access_token'], $seed['python'], array( $seed['lesson_video'], $seed['lesson_html'], $seed['lesson_script'] ), $seed['quiz'] ) );
$r = call( 'POST', '/courses/' . $seed['photo'] . '/enroll', array(), $a['access_token'] );
check( 'a paid course can not be enrolled in for free', 403 === $r['status'] && 'purchase_required' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'ios', 'course_id' => $seed['photo'] ), $a['access_token'] );
check( 'ios: no checkout link', 403 === $r['status'] && 'purchase_not_allowed' === ( $r['json']['code'] ?? '' ), $r['raw'] );
check( 'paid course refused before buying', ! refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ), refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ) );

echo "Free course, enrolled on the website\n";
$b    = sign_up( 'Omar Said', device( 'acc-b' ) );
$b_id = (int) ( $b['user']['id'] ?? 0 );
// Tutor's own "Enroll now" on the course page.
wp_eval( 'wp_set_current_user( ' . $b_id . ' ); tutor_utils()->do_enroll( ' . (int) $seed['english'] . ', 0, ' . $b_id . ' );' );
check( 'listed in My courses', in_array( $seed['english'], my_course_ids( $b['access_token'] ), true ), my_course_ids( $b['access_token'] ) );
$r = call( 'GET', '/courses/' . $seed['english'] . '?platform=android', null, $b['access_token'] );
check( 'course page: continue', true === ( $r['json']['enrolled'] ?? null ) && 'continue' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );

echo "Paid course bought with WooCommerce: bank transfer\n";
$buy = buy_on_website( $a['access_token'], $seed['photo'], $seed['photo_product'], 'bacs' );
check( 'the checkout link signs the student in on the checkout with the course in the cart', false !== strpos( (string) ( $buy['landing'] ?? '' ), '/checkout' ) && array( $seed['photo_product'] ) === ( $buy['cart'] ?? null ), $buy );
check( 'order placed', 200 === ( $buy['checkout'] ?? 0 ) && ( $buy['order'] ?? 0 ) > 0, $buy );
$order = last_order( $a_id, $seed['photo'] );
check( 'bank transfer: order on hold, enrollment not complete', 'on-hold' === $order['status'] && 'completed' !== $order['enrollment'], $order );
check( 'on hold: no access', ! refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ), refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ) );
check( 'on hold: not in My courses', ! in_array( $seed['photo'], my_course_ids( $a['access_token'] ), true ) );
$r = call( 'GET', '/me/orders', null, $a['access_token'] );
check( 'on hold: the order is listed with its course', 'on_hold' === ( $r['json']['items'][0]['status'] ?? '' ) && $seed['photo'] === ( $r['json']['items'][0]['items'][0]['course_id'] ?? 0 ), $r['raw'] );

wp_eval( 'wc_get_order( ' . (int) $order['id'] . ' )->update_status( "completed" );' );
$order = last_order( $a_id, $seed['photo'] );
check( 'order completed: enrolled', 'completed' === $order['status'] && 'completed' === $order['enrollment'], $order );
check( 'listed in My courses', in_array( $seed['photo'], my_course_ids( $a['access_token'] ), true ), my_course_ids( $a['access_token'] ) );
check( 'every lesson and the quiz open', ! opens_everything( $a['access_token'], $seed['photo'], $photo_lessons, $seed['photo_quiz'] ), opens_everything( $a['access_token'], $seed['photo'], $photo_lessons, $seed['photo_quiz'] ) );
$r = call( 'GET', '/courses/' . $seed['photo'] . '?platform=ios', null, $a['access_token'] );
check( 'ios: continue', 'continue' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? null );
$r = call( 'GET', '/lessons/' . $seed['photo_lesson'], null, $a['access_token'] );
$attachment = $r['json']['attachments'][0] ?? array();
check( 'the lesson attachment comes with it', 'application/pdf' === ( $attachment['mime_type'] ?? '' ) && 'camera-settings.pdf' === ( $attachment['name'] ?? '' ) && ! empty( $attachment['url'] ), $r['json']['attachments'] ?? $r['raw'] );
$file = browse( tempnam( sys_get_temp_dir(), 'yallapp-jar' ), (string) ( $attachment['url'] ?? '' ) );
check( 'the attachment downloads', 200 === $file['status'] && 0 === strpos( $file['raw'], '%PDF' ), $file['status'] );
$r = call( 'GET', '/courses/' . $seed['photo'] . '/curriculum', null, $a['access_token'] );
$types = array_column( (array) ( $r['json']['topics'][0]['items'] ?? array() ), 'type' );
check( 'the assignment is in the curriculum, open', array( 'lesson', 'assignment', 'lesson', 'quiz' ) === $types && false === ( $r['json']['topics'][0]['items'][1]['locked'] ?? true ), $r['raw'] );
$r = call( 'POST', '/quizzes/' . $seed['photo_quiz'] . '/attempts', array(), $a['access_token'] );
$attempt = $r['json'];
check( 'quiz attempt starts', in_array( $r['status'], array( 200, 201 ), true ) && 1 === count( $attempt['questions'] ?? array() ), $r['raw'] );
$question = $attempt['questions'][0] ?? array();
$true     = '';
foreach ( (array) ( $question['options'] ?? array() ) as $option ) {
	if ( 'True' === ( $option['label'] ?? '' ) ) {
		$true = $option['id'];
	}
}
$r = call( 'POST', '/quizzes/' . $seed['photo_quiz'] . '/attempts/' . ( $attempt['id'] ?? 0 ) . '/submit', array( 'answers' => array( array( 'question_id' => $question['id'] ?? 0, 'option_ids' => array( $true ) ) ) ), $a['access_token'] );
check( 'quiz passed', 200 === $r['status'] && 'passed' === ( $r['json']['status'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/lessons/' . $seed['photo_lesson'] . '/complete', array(), $a['access_token'] );
check( 'first lesson completed', 200 === $r['status'], $r['raw'] );
$r    = call( 'GET', '/me/courses', null, $a['access_token'] );
$mine = array();
foreach ( (array) ( $r['json']['items'] ?? array() ) as $item ) {
	if ( $seed['photo'] === ( $item['course']['id'] ?? 0 ) ) {
		$mine = $item;
	}
}
check( 'continue goes to the next lesson, past the assignment the app opens on the website', $seed['photo_lesson_2'] === ( $mine['next_item']['id'] ?? 0 ) && 'lesson' === ( $mine['next_item']['type'] ?? '' ), $mine['next_item'] ?? $r['raw'] );

$r = call( 'GET', '/me/orders', null, $a['access_token'] );
check( 'the order is completed in the app', 'completed' === ( $r['json']['items'][0]['status'] ?? '' ), $r['raw'] );

echo "Refunded\n";
wp_eval( 'wc_create_refund( array( "order_id" => ' . (int) $order['id'] . ', "amount" => wc_get_order( ' . (int) $order['id'] . ' )->get_total(), "reason" => "Changed my mind" ) );' );
$order = last_order( $a_id, $seed['photo'] );
check( 'refunded: enrollment ended', 'refunded' === $order['status'] && 'completed' !== $order['enrollment'], $order );
check( 'refunded: no access', ! refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ), refuses_everything( $a['access_token'], $photo_lessons, $seed['photo_quiz'] ) );
check( 'refunded: not in My courses', ! in_array( $seed['photo'], my_course_ids( $a['access_token'] ), true ) );
$r = call( 'GET', '/courses/' . $seed['photo'] . '?platform=android', null, $a['access_token'] );
check( 'refunded: the course can be bought again', false === ( $r['json']['enrolled'] ?? null ) && 'checkout' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/orders', null, $a['access_token'] );
check( 'refunded: the order says so', 'refunded' === ( $r['json']['items'][0]['status'] ?? '' ), $r['raw'] );

echo "Cash on delivery: processing, then cancelled\n";
$buy   = buy_on_website( $b['access_token'], $seed['design'], $seed['design_product'], 'cod' );
$order = last_order( $b_id, $seed['design'] );
check( 'order placed and processing', 200 === ( $buy['checkout'] ?? 0 ) && 'processing' === $order['status'] && 'completed' !== $order['enrollment'], array( $buy, $order ) );
$design_lessons = array( $seed['design_locked'] );
check( 'processing (not paid yet): no access', ! refuses_everything( $b['access_token'], $design_lessons, 0 ), refuses_everything( $b['access_token'], $design_lessons, 0 ) );
check( 'processing: not in My courses', ! in_array( $seed['design'], my_course_ids( $b['access_token'] ), true ) );
wp_eval( 'wc_get_order( ' . (int) $order['id'] . ' )->update_status( "cancelled" );' );
$order = last_order( $b_id, $seed['design'] );
check( 'cancelled: enrollment cancelled', 'cancelled' === $order['status'] && 'completed' !== $order['enrollment'], $order );
check( 'cancelled: no access', ! refuses_everything( $b['access_token'], $design_lessons, 0 ), refuses_everything( $b['access_token'], $design_lessons, 0 ) );
$r = call( 'GET', '/lessons/' . $seed['design_preview'], null, $b['access_token'] );
check( 'the preview lesson still opens', 200 === $r['status'], $r['raw'] );

echo "Paid course, the admin enrolls the student\n";
$c    = sign_up( 'Laila Hassan', device( 'acc-c', 'ios' ) );
$c_id = (int) ( $c['user']['id'] ?? 0 );
// Tutor LMS Pro's manual enrollment: a completed enrollment without an order.
wp_eval( 'add_filter( "tutor_enroll_data", static function ( $data ) { $data["post_status"] = "completed"; return $data; } ); tutor_utils()->do_enroll( ' . (int) $seed['photo'] . ', 0, ' . $c_id . ' );' );
check( 'listed in My courses', in_array( $seed['photo'], my_course_ids( $c['access_token'] ), true ), my_course_ids( $c['access_token'] ) );
check( 'every lesson and the quiz open', ! opens_everything( $c['access_token'], $seed['photo'], $photo_lessons, $seed['photo_quiz'] ), opens_everything( $c['access_token'], $seed['photo'], $photo_lessons, $seed['photo_quiz'] ) );
$r = call( 'GET', '/courses/' . $seed['photo'] . '?platform=ios', null, $c['access_token'] );
check( 'ios: continue, no purchase', 'continue' === ( $r['json']['purchase']['action'] ?? '' ), $r['json']['purchase'] ?? null );
// The admin removes the student again (Tutor sets the enrollment to cancel).
wp_eval( 'tutor_utils()->cancel_course_enrol( ' . (int) $seed['photo'] . ', ' . $c_id . ' );' );
check( 'removed by the admin: no access', ! refuses_everything( $c['access_token'], $photo_lessons, $seed['photo_quiz'] ), refuses_everything( $c['access_token'], $photo_lessons, $seed['photo_quiz'] ) );
check( 'removed: not in My courses', ! in_array( $seed['photo'], my_course_ids( $c['access_token'] ), true ) );

echo "Tutor's own enrollment rules (an expired enrollment)\n";
// Tutor LMS Pro ends an expired enrollment through Tutor's enrollment check; stand in for it.
wp_eval( 'add_filter( "tutor_enroll_data", static function ( $data ) { $data["post_status"] = "completed"; return $data; } ); tutor_utils()->do_enroll( ' . (int) $seed['photo'] . ', 0, ' . $c_id . ' );' );
check( 'enrolled again', in_array( $seed['photo'], my_course_ids( $c['access_token'] ), true ) );
file_put_contents(
	getenv( 'SITE_DIR' ) . '/wp-content/mu-plugins/yallapp-expiry.php',
	"<?php\nadd_filter( 'tutor_is_enrolled', static function ( \$enrolled, \$course_id, \$user_id ) { return " . (int) $c_id . " === (int) \$user_id && " . (int) $seed['photo'] . " === (int) \$course_id ? false : \$enrolled; }, 10, 3 );\n"
);
check( 'expired: no access', ! refuses_everything( $c['access_token'], $photo_lessons, $seed['photo_quiz'] ), refuses_everything( $c['access_token'], $photo_lessons, $seed['photo_quiz'] ) );
check( 'expired: not in My courses', ! in_array( $seed['photo'], my_course_ids( $c['access_token'] ), true ), my_course_ids( $c['access_token'] ) );
unlink( getenv( 'SITE_DIR' ) . '/wp-content/mu-plugins/yallapp-expiry.php' );

echo "Paid course sold with Tutor LMS's own checkout\n";
wp_eval( '$o = (array) get_option( "tutor_option", array() ); $o["monetize_by"] = "tutor"; update_option( "tutor_option", $o );' );
$d    = sign_up( 'Karim Nabil', device( 'acc-d' ) );
$d_id = (int) ( $d['user']['id'] ?? 0 );
$r    = call( 'GET', '/courses/' . $seed['design'] . '?platform=android', null, $d['access_token'] );
check( "Tutor's checkout: price and the website's checkout", '450.00' === ( $r['json']['price']['amount'] ?? '' ) && 'checkout' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'android', 'course_id' => $seed['design'] ), $d['access_token'] );
check( "Tutor's checkout: the link opens the course on the website", 200 === $r['status'] && false !== strpos( (string) ( $r['json']['url'] ?? '' ), 'yallapp_link=' ), $r['raw'] );
// The student places an order paid by bank transfer (a manual payment), as Tutor's checkout does.
$tutor_order = (int) wp_eval(
	'echo ( new \Tutor\Ecommerce\OrderController( false ) )->create_order( ' . $d_id . ', array( array( "item_id" => ' . (int) $seed['design'] . ', "regular_price" => 450, "sale_price" => null, "discount_price" => null, "coupon_code" => null ) ), "unpaid", "single_order", null, array( "payment_method" => "bank_transfer" ) );'
);
check( "Tutor's checkout: order placed, unpaid", $tutor_order > 0 );
check( 'unpaid: no access', ! refuses_everything( $d['access_token'], $design_lessons, 0 ), refuses_everything( $d['access_token'], $design_lessons, 0 ) );
$r = call( 'GET', '/me/orders', null, $d['access_token'] );
check( 'unpaid: the order is listed as pending', $tutor_order === ( $r['json']['items'][0]['id'] ?? 0 ) && 'pending' === ( $r['json']['items'][0]['status'] ?? '' ), $r['raw'] );
// The admin marks it paid (Tutor LMS > Orders > Mark as paid).
wp_eval( '( new \Tutor\Models\OrderModel() )->mark_as_paid( ' . $tutor_order . ' );' );
check( 'paid: listed in My courses', in_array( $seed['design'], my_course_ids( $d['access_token'] ), true ), my_course_ids( $d['access_token'] ) );
check( 'paid: every lesson opens', ! opens_everything( $d['access_token'], $seed['design'], array( $seed['design_preview'], $seed['design_locked'] ), 0 ), opens_everything( $d['access_token'], $seed['design'], array( $seed['design_preview'], $seed['design_locked'] ), 0 ) );
$r = call( 'GET', '/me/orders', null, $d['access_token'] );
check( 'paid: the order is completed', 'completed' === ( $r['json']['items'][0]['status'] ?? '' ), $r['raw'] );
// A refund (Tutor LMS > Orders > Refund) ends the enrollment.
wp_eval( '( new \Tutor\Models\OrderModel() )->update_order( ' . $tutor_order . ', array( "payment_status" => "refunded", "order_status" => "refunded" ) ); do_action( "tutor_order_payment_status_changed", ' . $tutor_order . ', "paid", "refunded" );' );
check( 'refunded: no access', ! refuses_everything( $d['access_token'], $design_lessons, 0 ), refuses_everything( $d['access_token'], $design_lessons, 0 ) );
check( 'refunded: not in My courses', ! in_array( $seed['design'], my_course_ids( $d['access_token'] ), true ) );
$r = call( 'GET', '/me/orders', null, $d['access_token'] );
check( 'refunded: the order says so', 'refunded' === ( $r['json']['items'][0]['status'] ?? '' ), $r['raw'] );
wp_eval( '$o = (array) get_option( "tutor_option", array() ); $o["monetize_by"] = "wc"; update_option( "tutor_option", $o );' );

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
