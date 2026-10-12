<?php
/**
 * End-to-end checks of every adapter-backed endpoint against a dev site seeded
 * by tests/dev-site/seed-<lms>.php. Tutor LMS has its own, longer suite (api-test.php).
 *
 * Usage: LMS=learnpress WP_CLI='wp --path=<site>' SEED_IDS='{"python":8,...}' php adapter-test.php http://127.0.0.1:8089
 * The site must define YALLAPP_DEV_OTP so the code 123456 works.
 *
 * SEED_IDS holds the course, lesson and quiz IDs the seed created, plus `expect`:
 * - video: the source of the video lesson's video (upload, youtube, vimeo, external, embed), or null;
 * - paid:  whether "UI Design Fundamentals" is sold by the site (checkout on Android);
 * - qna:   whether students can ask questions in "Python Programming Basics";
 * - free_orders: whether the LMS records a free enrollment as an order (LearnPress does);
 * - certificate: whether completing "Python Programming Basics" awards a certificate;
 * - reviews_moderated: whether reviews wait for approval (the test approves by publishing the review post).
 * Everything else follows from the features GET /config reports.
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$base   = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' ) . '/wp-json/yallapp/v1';
$lms_id = (string) getenv( 'LMS' );
$seed   = json_decode( (string) getenv( 'SEED_IDS' ), true );
$fails  = 0;
$count  = 0;
if ( ! is_array( $seed ) || '' === $lms_id ) {
	fwrite( STDERR, "Set LMS to the LMS id and SEED_IDS to the yallapp_seed_ids option as JSON.\n" );
	exit( 2 );
}
$expect = array_merge(
	array(
		'video'             => null,
		'paid'              => true,
		'qna'               => false,
		'free_orders'       => false,
		'certificate'       => false,
		'reviews_moderated' => false,
	),
	(array) ( $seed['expect'] ?? array() )
);

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
			CURLOPT_FOLLOWLOCATION => false,
			CURLOPT_TIMEOUT        => 60,
		)
	);
	$raw    = (string) curl_exec( $ch );
	$status = (int) curl_getinfo( $ch, CURLINFO_RESPONSE_CODE );
	$size   = (int) curl_getinfo( $ch, CURLINFO_HEADER_SIZE );
	curl_close( $ch );
	return array(
		'status'  => $status,
		'headers' => strtolower( substr( $raw, 0, $size ) ),
		'raw'     => substr( $raw, $size ),
		'json'    => json_decode( substr( $raw, $size ), true ),
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
	echo "  FAIL  $name" . ( '' !== $detail ? "\n        " . substr( is_string( $detail ) ? $detail : json_encode( $detail ), 0, 600 ) : '' ) . "\n";
}

function device( $id, $platform = 'android' ) {
	return array(
		'id'          => $id,
		'platform'    => $platform,
		'name'        => 'Test ' . $id,
		'app_version' => '1.0.0',
	);
}

/**
 * Signs a new number up with the dev code and returns the session.
 */
function sign_up( $name ) {
	$phone = '53' . str_pad( (string) random_int( 0, 99999999 ), 8, '0', STR_PAD_LEFT );
	$r     = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	$v     = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => device( 'dev-' . $phone ) ) );
	return call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'] ?? '', 'name' => $name, 'device' => device( 'dev-' . $phone ) ) );
}

/**
 * Runs PHP in the dev site with WP-CLI (WP_CLI env: the command prefix) and returns what it echoes.
 */
function wp_eval( $php ) {
	$prefix = (string) getenv( 'WP_CLI' );
	if ( '' === $prefix ) {
		fwrite( STDERR, "Set WP_CLI to the wp command for the dev site.\n" );
		exit( 2 );
	}
	return trim( (string) shell_exec( $prefix . ' eval ' . escapeshellarg( $php ) . ' 2>/dev/null' ) );
}

/**
 * Curriculum items by ID, in course order.
 */
function curriculum_items( $course_id, $token ) {
	$r     = call( 'GET', '/courses/' . $course_id . '/curriculum', null, $token );
	$items = array();
	foreach ( $r['json']['topics'] ?? array() as $topic ) {
		foreach ( $topic['items'] as $item ) {
			$items[ $item['id'] ] = $item;
		}
	}
	return $items;
}

echo "App ($lms_id)\n";
$r        = call( 'GET', '/config?platform=android&app_version=1.0.0' );
$features = $r['json']['features'] ?? array();
check( 'config 200', 200 === $r['status'], $r['raw'] );
check( 'config reports the LMS', $lms_id === ( $features['lms'] ?? '' ) && '' !== ( $features['lms_version'] ?? '' ), $features );
check( 'config says whether the site sells courses', ( $features['orders'] ?? null ) === $expect['paid'], $features );
$r     = call( 'GET', '/home?platform=android' );
$types = array_map( function ( $s ) { return $s['type']; }, $r['json']['sections'] ?? array() );
check( 'home lists categories', 200 === $r['status'] && in_array( 'categories', $types, true ), $r['raw'] );

echo "Sign-in\n";
$session = sign_up( 'Deniz Kaya' );
$token   = $session['json']['access_token'] ?? '';
check( 'student signs up with the code', 201 === $session['status'] && '' !== $token, $session['raw'] );
$me_id = (int) ( $session['json']['user']['id'] ?? 0 );

echo "Catalog\n";
$r     = call( 'GET', '/categories' );
$names = array_map( function ( $c ) { return $c['name']; }, $r['json']['items'] ?? array() );
check( 'categories', 200 === $r['status'] && in_array( 'Programming', $names, true ) && in_array( 'Languages', $names, true ), $r['raw'] );
$languages = 0;
foreach ( $r['json']['items'] ?? array() as $category ) {
	if ( 'Languages' === $category['name'] ) {
		$languages = $category['id'];
	}
}
$r = call( 'GET', '/courses' );
check( 'three courses', 200 === $r['status'] && 3 === ( $r['json']['total'] ?? 0 ) && 3 === count( $r['json']['items'] ?? array() ), $r['raw'] );
$r      = call( 'GET', '/courses?orderby=title' );
$titles = array_map( function ( $c ) { return $c['title']; }, $r['json']['items'] ?? array() );
check( 'sorted by title', array( 'Business English for Beginners', 'Python Programming Basics', 'UI Design Fundamentals' ) === $titles, $titles );
$r = call( 'GET', '/courses?search=Python' );
check( 'search', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && $seed['python'] === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/courses?category=' . $languages );
check( 'category filter', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && $seed['english'] === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
$r   = call( 'GET', '/courses?price=free' );
$ids = array_map( function ( $c ) { return $c['id']; }, $r['json']['items'] ?? array() );
sort( $ids );
$free = $expect['paid'] ? array( $seed['python'], $seed['english'] ) : array( $seed['python'], $seed['design'], $seed['english'] );
sort( $free );
check( 'free filter', 200 === $r['status'] && $free === $ids, $r['raw'] );
$r = call( 'GET', '/courses?price=paid' );
check( 'paid filter', 200 === $r['status'] && ( $expect['paid'] ? ( 1 === $r['json']['total'] && $seed['design'] === $r['json']['items'][0]['id'] ) : 0 === $r['json']['total'] ), $r['raw'] );

$r      = call( 'GET', '/courses/' . $seed['python'] . '?platform=ios', null, $token );
$course = $r['json'] ?? array();
check( 'course detail', 200 === $r['status'] && 'Python Programming Basics' === ( $course['title'] ?? '' ) && false !== strpos( (string) ( $course['description_html'] ?? '' ), 'Learn Python from zero.' ), $r['raw'] );
check( 'course is free, three lessons', true === ( $course['price']['is_free'] ?? null ) && 3 === ( $course['lesson_count'] ?? 0 ), $course );
check( 'course instructor', 'Ayse Demir' === ( $course['instructor']['name'] ?? '' ) && $seed['instructor'] === ( $course['instructor']['id'] ?? 0 ), $course['instructor'] ?? null );
check( 'course categories', array( 'Programming' ) === array_map( function ( $c ) { return $c['name']; }, $course['categories'] ?? array() ), $course['categories'] ?? null );
check( 'course q&a flag', $expect['qna'] === ( $course['qna'] ?? null ), $course );
check( 'free course on ios: enroll_free', 'enroll_free' === ( $course['purchase']['action'] ?? '' ) && ! array_key_exists( 'has_checkout', $course ), $course );
$r = call( 'GET', '/courses/' . $seed['design'] . '?platform=android', null, $token );
if ( $expect['paid'] ) {
	check( 'paid course price', false === ( $r['json']['price']['is_free'] ?? null ) && '450.00' === ( $r['json']['price']['amount'] ?? '' ) && false !== strpos( (string) ( $r['json']['price']['formatted'] ?? '' ), '450' ), $r['json']['price'] ?? $r['raw'] );
	check( 'paid course on android: checkout', 'checkout' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
	$r = call( 'GET', '/courses/' . $seed['design'] . '?platform=ios', null, $token );
	check( 'paid course on ios: none', 'none' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
	$r = call( 'POST', '/auth/checkout-link', array( 'platform' => 'android', 'course_id' => $seed['design'] ), $token );
	check( 'android checkout link', 200 === $r['status'] && false !== strpos( $r['json']['url'] ?? '', 'yallapp_link=' ), $r['raw'] );
} else {
	check( 'unsold course on android: enroll_free', 'enroll_free' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
}
$r = call( 'GET', '/courses/999999?platform=android' );
check( 'missing course 404', 404 === $r['status'], $r['raw'] );

$items = curriculum_items( $seed['design'], $token );
check( 'preview lesson unlocked', isset( $items[ $seed['design_preview'] ] ) && false === $items[ $seed['design_preview'] ]['locked'] && true === $items[ $seed['design_preview'] ]['preview'], $items );
check( 'other lesson locked', isset( $items[ $seed['design_locked'] ] ) && true === $items[ $seed['design_locked'] ]['locked'], $items );
$items = curriculum_items( $seed['python'], $token );
$order = array( $seed['lesson_video'], $seed['lesson_html'], $seed['lesson_script'] );
if ( ! empty( $seed['quiz'] ) ) {
	$order[] = $seed['quiz'];
}
check( 'curriculum in course order', $order === array_keys( $items ), array_keys( $items ) );
check( 'curriculum types', 'lesson' === ( $items[ $seed['lesson_html'] ]['type'] ?? '' ) && ( empty( $seed['quiz'] ) || ( 'quiz' === $items[ $seed['quiz'] ]['type'] && 3 === $items[ $seed['quiz'] ]['question_count'] ) ), $items );
check( 'curriculum locked before enrolling', true === ( $items[ $seed['lesson_html'] ]['locked'] ?? null ), $items );

echo "Learning\n";
$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'lesson before enrolling 403', 403 === $r['status'] && 'not_enrolled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_preview'] );
check( 'preview lesson opens signed out', 200 === $r['status'] && $seed['design'] === ( $r['json']['course_id'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_locked'] );
check( 'locked lesson signed out 401', 401 === $r['status'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['design_locked'], null, $token );
check( 'locked lesson signed in 403', 403 === $r['status'], $r['raw'] );
$r = call( 'POST', '/lessons/' . $seed['lesson_html'] . '/complete', array(), $token );
check( 'complete before enrolling 403', 403 === $r['status'], $r['raw'] );

$r = call( 'POST', '/courses/' . $seed['python'] . '/enroll', array(), $token );
check( 'free enroll', 200 === $r['status'] && $seed['python'] === ( $r['json']['course_id'] ?? 0 ) && ! empty( $r['json']['enrolled_at'] ), $r['raw'] );
$r = call( 'POST', '/courses/' . $seed['python'] . '/enroll', array(), $token );
check( 'enroll again is harmless', 200 === $r['status'], $r['raw'] );
if ( $expect['paid'] ) {
	$r = call( 'POST', '/courses/' . $seed['design'] . '/enroll', array(), $token );
	check( 'paid course enroll refused', 403 === $r['status'], $r['raw'] );
}
$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=ios', null, $token );
check( 'course says enrolled, continue', true === ( $r['json']['enrolled'] ?? null ) && 'continue' === ( $r['json']['purchase']['action'] ?? '' ), $r['raw'] );
$r = call( 'GET', '/me/courses', null, $token );
$mine = $r['json']['items'][0] ?? array();
check( 'my courses lists python', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && $seed['python'] === ( $mine['course']['id'] ?? 0 ), $r['raw'] );
check( 'my course progress and next item', 0 === ( $mine['progress']['completed_items'] ?? -1 ) && ( $mine['progress']['total_items'] ?? 0 ) >= 3 && $seed['lesson_video'] === ( $mine['next_item']['id'] ?? 0 ), $mine );
$r = call( 'GET', '/me/courses?status=completed', null, $token );
check( 'no completed courses yet', 200 === $r['status'] && 0 === ( $r['json']['total'] ?? -1 ), $r['raw'] );
$items = curriculum_items( $seed['python'], $token );
check( 'curriculum unlocked after enrolling', false === ( $items[ $seed['lesson_html'] ]['locked'] ?? null ), $items );

$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'html lesson native', 200 === $r['status'] && 'native' === ( $r['json']['render_mode'] ?? '' ) && $seed['python'] === ( $r['json']['course_id'] ?? 0 ), $r['raw'] );
$html   = (string) ( $r['json']['html'] ?? '' );
$embeds = $r['json']['embeds'] ?? array();
check( 'bookmark span removed', false === strpos( $html, 'mce_SELRES' ) && false === strpos( $html, 'data-mce-type' ), $html );
check( 'iframes became placeholders', false === stripos( $html, '<iframe' ) && 2 === substr_count( $html, 'data-yallapp-embed=' ), $html );
$by = array();
foreach ( $embeds as $embed ) {
	$by[ $embed['provider'] ] = $embed;
}
check( 'youtube embed 16:9', isset( $by['youtube'] ) && abs( $by['youtube']['aspect_ratio'] - 16 / 9 ) < 0.01, $embeds );
check( 'other embed keeps height 900', isset( $by['other'] ) && '900' === $by['other']['height'], $embeds );
check( 'code block kept', false !== strpos( $html, '<pre' ) && false !== strpos( $html, 'def greet' ), $html );
check( 'previous and next lessons', $seed['lesson_video'] === ( $r['json']['previous_id'] ?? 0 ) && $seed['lesson_script'] === ( $r['json']['next_id'] ?? 0 ), $r['json'] );

$r = call( 'GET', '/lessons/' . $seed['lesson_script'], null, $token );
check( 'script lesson uses web view', 200 === $r['status'] && 'webview' === ( $r['json']['render_mode'] ?? '' ) && false !== strpos( (string) $r['json']['webview_url'], 'yallapp_link=' ), $r['raw'] );

$r     = call( 'GET', '/lessons/' . $seed['lesson_video'], null, $token );
$video = $r['json']['video'] ?? null;
if ( null === $expect['video'] ) {
	check( 'lesson without a video field', 200 === $r['status'] && null === $video, $r['raw'] );
} else {
	check( 'video lesson: ' . $expect['video'], 200 === $r['status'] && $expect['video'] === ( $video['source'] ?? '' ), $r['raw'] );
	if ( 'upload' === $expect['video'] ) {
		$url = (string) ( $video['url'] ?? '' );
		check( 'uploaded video has a signed url', false !== strpos( $url, 'sig=' ), $video );
		$m = call( 'GET', $url, null, null, array( 'Range: bytes=0-9' ) );
		check( 'video range 206', 206 === $m['status'] && 10 === strlen( $m['raw'] ), $m['status'] );
	} elseif ( 'embed' !== $expect['video'] ) {
		check( 'video url', 0 === strpos( (string) ( $video['url'] ?? '' ), 'https://' ), $video );
	}
}
$r = call( 'PUT', '/lessons/' . $seed['lesson_video'] . '/progress', array( 'position_seconds' => 42, 'watched_percent' => 30 ), $token );
check( 'video position saved', 204 === $r['status'], $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['lesson_video'], null, $token );
check( 'video position restored', 42 === ( $r['json']['position_seconds'] ?? 0 ), $r['json'] );

$r = call( 'POST', '/lessons/' . $seed['lesson_html'] . '/complete', array(), $token );
check( 'complete lesson returns progress', 200 === $r['status'] && 1 === ( $r['json']['completed_items'] ?? 0 ) && $seed['python'] === ( $r['json']['course_id'] ?? 0 ) && ( $r['json']['percent'] ?? 0 ) > 0 && false === ( $r['json']['course_completed'] ?? null ), $r['raw'] );
$r = call( 'POST', '/lessons/' . $seed['lesson_html'] . '/complete', array(), $token );
check( 'complete again keeps progress', 200 === $r['status'] && 1 === ( $r['json']['completed_items'] ?? 0 ), $r['raw'] );
$r = call( 'GET', '/lessons/' . $seed['lesson_html'], null, $token );
check( 'lesson marked complete', true === ( $r['json']['completed'] ?? null ), $r['json'] );
$items = curriculum_items( $seed['python'], $token );
check( 'curriculum shows it completed', true === ( $items[ $seed['lesson_html'] ]['completed'] ?? null ) && false === ( $items[ $seed['lesson_video'] ]['completed'] ?? null ), $items );
$r = call( 'GET', '/me/courses', null, $token );
check( 'my courses progress updated', 1 === ( $r['json']['items'][0]['progress']['completed_items'] ?? 0 ), $r['raw'] );

echo "Wishlist\n";
if ( ! empty( $features['wishlist'] ) ) {
	$r = call( 'PUT', '/me/wishlist/' . $seed['design'], array(), $token );
	check( 'wishlist add', 204 === $r['status'], $r['raw'] );
	$r = call( 'GET', '/me/wishlist', null, $token );
	check( 'wishlist lists course', 200 === $r['status'] && $seed['design'] === ( $r['json']['items'][0]['id'] ?? 0 ) && true === ( $r['json']['items'][0]['wishlisted'] ?? null ), $r['raw'] );
	$r = call( 'DELETE', '/me/wishlist/' . $seed['design'], null, $token );
	$l = call( 'GET', '/me/wishlist', null, $token );
	check( 'wishlist remove', 204 === $r['status'] && 0 === count( $l['json']['items'] ?? array( 1 ) ), $l['raw'] );
	$r = call( 'PUT', '/me/wishlist/999999', array(), $token );
	check( 'wishlist unknown course 404', 404 === $r['status'], $r['raw'] );
} else {
	$r = call( 'PUT', '/me/wishlist/' . $seed['design'], array(), $token );
	check( 'no wishlist: add 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
	$r = call( 'GET', '/me/wishlist', null, $token );
	check( 'no wishlist: empty list', 200 === $r['status'] && array() === ( $r['json']['items'] ?? null ), $r['raw'] );
}

echo "Quiz\n";
if ( ! empty( $features['quizzes'] ) && ! empty( $seed['quiz'] ) ) {
	$r = call( 'GET', '/quizzes/' . $seed['quiz'], null, $token );
	check( 'quiz details', 200 === $r['status'] && 60 === (int) ( $r['json']['pass_percent'] ?? 0 ) && 3 === ( $r['json']['question_count'] ?? 0 ) && $seed['python'] === ( $r['json']['course_id'] ?? 0 ) && 0 === ( $r['json']['attempts_used'] ?? -1 ), $r['raw'] );
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts', array(), $token );
	check( 'attempt started', 201 === $r['status'] && ! empty( $r['json']['id'] ) && 3 === count( $r['json']['questions'] ?? array() ), $r['raw'] );
	$attempt = $r['json'] ?? array();
	$native  = array_filter( $attempt['questions'] ?? array(), function ( $q ) { return 'native' === $q['render_mode'] && count( $q['options'] ) >= 2; } );
	check( 'questions are native with options', 3 === count( $native ), $attempt['questions'] ?? null );
	$qtypes = array_map( function ( $q ) { return $q['type']; }, $attempt['questions'] ?? array() );
	sort( $qtypes );
	check( 'question types', array( 'multiple_choice', 'single_choice', 'true_false' ) === $qtypes, $qtypes );
	$answers = array();
	foreach ( $attempt['questions'] ?? array() as $q ) {
		$correct   = array_values(
			array_map(
				function ( $o ) { return $o['id']; },
				array_filter( $q['options'], function ( $o ) { return in_array( $o['label'], array( 'True', 'def', 'list', 'dict' ), true ); } )
			)
		);
		$answers[] = array( 'question_id' => $q['id'], 'option_ids' => $correct );
	}
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts/' . ( $attempt['id'] ?? 0 ) . '/submit', array( 'answers' => $answers ), $token );
	check( 'quiz passed with correct answers', 200 === $r['status'] && 'passed' === ( $r['json']['status'] ?? '' ) && 100.0 === (float) ( $r['json']['score_percent'] ?? 0 ) && $seed['quiz'] === ( $r['json']['quiz_id'] ?? 0 ), $r['raw'] );
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts/' . ( $attempt['id'] ?? 0 ) . '/submit', array( 'answers' => $answers ), $token );
	check( 'submitting twice 409', 409 === $r['status'], $r['raw'] );
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts', array(), $token );
	$second = $r['json'] ?? array();
	check( 'second attempt started', 201 === $r['status'] && ! empty( $second['id'] ), $r['raw'] );
	$wrong = array();
	foreach ( $second['questions'] ?? array() as $q ) {
		$wrong[] = array( 'question_id' => $q['id'], 'option_ids' => array( $q['options'][ count( $q['options'] ) - 1 ]['id'] ) );
	}
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts/' . ( $second['id'] ?? 0 ) . '/submit', array( 'answers' => $wrong ), $token );
	check( 'wrong answers fail', 200 === $r['status'] && 'failed' === ( $r['json']['status'] ?? '' ) && (float) ( $r['json']['score_percent'] ?? 100 ) < 60, $r['raw'] );
	$r = call( 'GET', '/quizzes/' . $seed['quiz'], null, $token );
	check( 'quiz counts attempts', 2 === ( $r['json']['attempts_used'] ?? 0 ) && 'failed' === ( $r['json']['last_result']['status'] ?? '' ), $r['raw'] );
	$r = call( 'GET', '/me/quiz-attempts', null, $token );
	check( 'attempt history', 200 === $r['status'] && 2 === ( $r['json']['total'] ?? 0 ) && $seed['quiz'] === ( $r['json']['items'][0]['quiz_id'] ?? 0 ) && 'Module 1 quiz' === ( $r['json']['items'][0]['quiz_title'] ?? '' ), $r['raw'] );
	$items = curriculum_items( $seed['python'], $token );
	check( 'quiz completed in curriculum', true === ( $items[ $seed['quiz'] ]['completed'] ?? null ), $items );
	$other = sign_up( 'Not Enrolled' );
	$r     = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts', array(), $other['json']['access_token'] ?? '' );
	check( 'quiz needs enrollment', 403 === $r['status'] && 'not_enrolled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
} else {
	check( 'no quizzes on this site', empty( $features['quizzes'] ), $features );
}

echo "Certificates and orders\n";
$r = call( 'GET', '/me/certificates', null, $token );
check( 'certificates 200', 200 === $r['status'] && is_array( $r['json']['items'] ?? null ), $r['raw'] );
$r = call( 'GET', '/me/orders', null, $token );
check( 'orders 200', 200 === $r['status'] && is_array( $r['json']['items'] ?? null ) && ( $expect['free_orders'] ? 1 : 0 ) === ( $r['json']['total'] ?? -1 ), $r['raw'] );
if ( $expect['free_orders'] ) {
	$o = $r['json']['items'][0] ?? array();
	check( 'free enrollment order', 'completed' === ( $o['status'] ?? '' ) && '' !== ( $o['status_label'] ?? '' ) && '' !== ( $o['number'] ?? '' ) && false === strpos( (string) ( $o['total'] ?? '<' ), '<' ) && $seed['python'] === ( $o['items'][0]['course_id'] ?? 0 ), $o );
}

echo "Notifications\n";
$r = call( 'GET', '/me/notifications', null, $token );
check( 'enrollment notification in the inbox', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && 'enrolled' === ( $r['json']['items'][0]['type'] ?? '' ) && $seed['python'] === ( $r['json']['items'][0]['course_id'] ?? 0 ), $r['raw'] );
wp_eval( 'Yallapp\Plugin::instance()->push()->announce( "Exam on Friday", "Bring a pencil.", ' . (int) $seed['python'] . ' );' );
wp_eval( 'Yallapp\Plugin::instance()->push()->announce( "Design only", "Not for Python students.", ' . (int) $seed['design'] . ' );' );
$r     = call( 'GET', '/me/notifications', null, $token );
$types = array_map( function ( $n ) { return $n['type']; }, $r['json']['items'] ?? array() );
check( 'course announcement reaches enrolled students only', array( 'announcement', 'enrolled' ) === $types && 2 === ( $r['json']['unread_count'] ?? 0 ), $r['raw'] );
$r = call( 'POST', '/me/notifications/read', array(), $token );
$l = call( 'GET', '/me/notifications', null, $token );
check( 'mark read', 204 === $r['status'] && 0 === ( $l['json']['unread_count'] ?? -1 ), $l['raw'] );

echo "Reviews\n";
if ( ! empty( $features['reviews'] ) ) {
	$r = call( 'GET', '/courses/' . $seed['python'] . '/reviews', null, $token );
	check( 'no reviews yet, can review', 200 === $r['status'] && 0 === ( $r['json']['total'] ?? -1 ) && true === ( $r['json']['can_review'] ?? null ) && array_key_exists( 'mine', (array) $r['json'] ) && null === $r['json']['mine'], $r['raw'] );
	$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 4, 'text' => "Clear lessons.\nGood pace." ), $token );
	check( 'review saved', 200 === $r['status'] && 4 === ( $r['json']['rating'] ?? 0 ) && true === ( $r['json']['mine'] ?? null ) && "Clear lessons.\nGood pace." === ( $r['json']['text'] ?? '' ), $r['raw'] );
	$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 5, 'text' => 'Even better.' ), $token );
	check( 'review edited', 200 === $r['status'] && 5 === ( $r['json']['rating'] ?? 0 ) && 'Even better.' === ( $r['json']['text'] ?? '' ), $r['raw'] );
	if ( $expect['reviews_moderated'] ) {
		check( 'review waits for approval', 'pending' === ( $r['json']['status'] ?? '' ), $r['raw'] );
		$l = call( 'GET', '/courses/' . $seed['python'] . '/reviews' );
		check( 'pending review not listed', 200 === $l['status'] && 0 === ( $l['json']['total'] ?? -1 ), $l['raw'] );
		wp_eval( 'wp_update_post( array( "ID" => ' . (int) ( $r['json']['id'] ?? 0 ) . ', "post_status" => "publish" ) );' );
	}
	$r = call( 'GET', '/courses/' . $seed['python'] . '/reviews' );
	check( 'one review, summary counts it', 1 === ( $r['json']['total'] ?? 0 ) && 5.0 === (float) ( $r['json']['summary']['rating'] ?? 0 ) && 1 === ( $r['json']['summary']['counts']['5'] ?? 0 ) && 0 === ( $r['json']['summary']['counts']['4'] ?? -1 ), $r['raw'] );
	check( 'review author', 'Deniz Kaya' === ( $r['json']['items'][0]['author']['name'] ?? '' ) && false === ( $r['json']['items'][0]['author']['instructor'] ?? null ) && false === ( $r['json']['items'][0]['mine'] ?? null ), $r['json'] );
	$r = call( 'GET', '/courses/' . $seed['python'] . '?platform=android' );
	check( 'course rating updated', 5.0 === (float) ( $r['json']['rating'] ?? 0 ) && 1 === ( $r['json']['rating_count'] ?? 0 ), $r['json'] );
	$r = call( 'PUT', '/courses/' . $seed['design'] . '/reviews/mine', array( 'rating' => 5 ), $token );
	check( 'review needs enrollment', 403 === $r['status'] && 'not_enrolled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
} else {
	$r = call( 'GET', '/courses/' . $seed['python'] . '/reviews', null, $token );
	check( 'no reviews: list 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
	$r = call( 'PUT', '/courses/' . $seed['python'] . '/reviews/mine', array( 'rating' => 5 ), $token );
	check( 'no reviews: save 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
}

echo "Questions\n";
if ( $expect['qna'] ) {
	$r        = call( 'POST', '/courses/' . $seed['python'] . '/questions', array( 'text' => 'What does <b>range</b> return?' ), $token );
	$question = $r['json']['id'] ?? 0;
	check( 'question asked 201', 201 === $r['status'] && $question && 'What does range return?' === ( $r['json']['text'] ?? '' ) && true === ( $r['json']['mine'] ?? null ) && 0 === ( $r['json']['answer_count'] ?? -1 ), $r['raw'] );
	$r = call( 'GET', '/courses/' . $seed['python'] . '/questions', null, $token );
	check( 'question listed', 200 === $r['status'] && 1 === ( $r['json']['total'] ?? 0 ) && $question === ( $r['json']['items'][0]['id'] ?? 0 ), $r['raw'] );
	$r = call( 'POST', '/questions/' . $question . '/answers', array( 'text' => 'Also: is it a list?' ), $token );
	check( 'reply 201', 201 === $r['status'] && true === ( $r['json']['mine'] ?? null ) && false === ( $r['json']['author']['instructor'] ?? null ), $r['raw'] );
	wp_eval( 'wp_set_current_user( ' . (int) $seed['instructor'] . ' ); Yallapp\Plugin::instance()->lms()->answer( ' . (int) $question . ', ' . (int) $seed['instructor'] . ', "It returns a range object." );' );
	$r = call( 'GET', '/questions/' . $question, null, $token );
	check( 'thread with answers in order', 200 === $r['status'] && 2 === count( $r['json']['answers'] ?? array() ) && true === ( $r['json']['answers'][1]['author']['instructor'] ?? null ) && 2 === ( $r['json']['answer_count'] ?? 0 ) && $seed['python'] === ( $r['json']['course_id'] ?? 0 ), $r['raw'] );
	$r = call( 'GET', '/me/notifications', null, $token );
	check( 'instructor answer notifies the asker', 'qna_answer' === ( $r['json']['items'][0]['type'] ?? '' ) && $question === ( $r['json']['items'][0]['question_id'] ?? 0 ) && 1 === ( $r['json']['unread_count'] ?? 0 ), $r['raw'] );
	$r = call( 'GET', '/courses/' . $seed['design'] . '/questions', null, $token );
	check( 'questions need enrollment', 403 === $r['status'], $r['raw'] );
	$r = call( 'GET', '/questions/999999', null, $token );
	check( 'missing question 404', 404 === $r['status'], $r['raw'] );
} else {
	$r = call( 'GET', '/courses/' . $seed['python'] . '/questions', null, $token );
	check( 'no q&a: list 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
	$r = call( 'POST', '/courses/' . $seed['python'] . '/questions', array( 'text' => 'Hello?' ), $token );
	check( 'no q&a: ask 403', 403 === $r['status'] && 'feature_disabled' === ( $r['json']['code'] ?? '' ), $r['raw'] );
}

echo "Course completion\n";
foreach ( array( $seed['lesson_video'], $seed['lesson_script'] ) as $lesson ) {
	call( 'POST', '/lessons/' . $lesson . '/complete', array(), $token );
}
if ( ! empty( $features['quizzes'] ) && ! empty( $seed['quiz'] ) ) {
	$r = call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts', array(), $token );
	$a = $r['json'] ?? array();
	$answers = array();
	foreach ( $a['questions'] ?? array() as $q ) {
		$correct   = array_values( array_map( function ( $o ) { return $o['id']; }, array_filter( $q['options'], function ( $o ) { return in_array( $o['label'], array( 'True', 'def', 'list', 'dict' ), true ); } ) ) );
		$answers[] = array( 'question_id' => $q['id'], 'option_ids' => $correct );
	}
	call( 'POST', '/quizzes/' . $seed['quiz'] . '/attempts/' . ( $a['id'] ?? 0 ) . '/submit', array( 'answers' => $answers ), $token );
}
$r = call( 'GET', '/me/courses?status=completed', null, $token );
check( 'course completed after every item', 200 === $r['status'] && $seed['python'] === ( $r['json']['items'][0]['course']['id'] ?? 0 ) && 100 === ( $r['json']['items'][0]['progress']['percent'] ?? 0 ) && true === ( $r['json']['items'][0]['progress']['course_completed'] ?? null ), $r['raw'] );
$r = call( 'GET', '/me/courses', null, $token );
check( 'no longer in progress', 200 === $r['status'] && 0 === ( $r['json']['total'] ?? -1 ), $r['raw'] );
$r = call( 'GET', '/me/certificates', null, $token );
if ( $expect['certificate'] ) {
	$c = $r['json']['items'][0] ?? array();
	check( 'certificate earned', 200 === $r['status'] && 1 === count( $r['json']['items'] ?? array() ) && $seed['python'] === ( $c['course_id'] ?? 0 ) && 'Python Programming Basics' === ( $c['course_title'] ?? '' ) && 0 === strpos( (string) ( $c['url'] ?? '' ), 'http' ), $r['raw'] );
	$r = call( 'GET', '/me/courses?status=completed', null, $token );
	check( 'completed course links the certificate', ( $c['url'] ?? '' ) === ( $r['json']['items'][0]['certificate_url'] ?? null ), $r['raw'] );
} else {
	check( 'certificates still 200', 200 === $r['status'], $r['raw'] );
}

printf( "\n%d checks, %d failed\n", $count, $fails );
exit( $fails ? 1 : 0 );
