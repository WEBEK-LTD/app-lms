<?php
/**
 * End-to-end checks of the bookings endpoints against a booking plugin seeded by
 * tests/dev-site/seed-bookings-<plugin>.php: a salon with Haircut (30 min, ₺300) and
 * Hair colouring (90 min, ₺900; Ayşe charges ₺950) in Hair, Massage (60 min, ₺600) in
 * Spa, a hidden service, and Ayşe and Mehmet working Monday to Saturday 09:00-17:00.
 * Only Mehmet does massages. When the plugin books one employee only (Amelia Lite,
 * SEED_IDS one_staff), Mehmet and the massage aren't offered and the checks expect that.
 * When it has no staff at all (BookingPress, SEED_IDS no_staff), the business is one
 * calendar: no staff anywhere, and a booked time is gone for everyone.
 *
 * Usage: BOOKING=amelia WP_CLI='wp --path=<site>' SEED_IDS='{...}' php bookings-test.php http://127.0.0.1:8089
 * The site must define YALLAPP_DEV_OTP so the code 123456 works.
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test script, not loaded by WordPress.

$base    = rtrim( $argv[1] ?? 'http://127.0.0.1:8089', '/' ) . '/wp-json/yallapp/v1';
$seed    = json_decode( (string) getenv( 'SEED_IDS' ), true );
$booking = (string) getenv( 'BOOKING' );
$one     = ! empty( $seed['one_staff'] );
$none    = ! empty( $seed['no_staff'] );
$fails   = 0;
$count   = 0;
if ( ! is_array( $seed ) ) {
	fwrite( STDERR, "Set SEED_IDS to the yallapp_seed_ids option as JSON.\n" );
	exit( 2 );
}

function call( $method, $path, $body = null, $token = null ) {
	global $base;
	$ch = curl_init( $base . $path );
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

function check( $name, $ok, $detail = '' ) {
	global $fails, $count;
	++$count;
	if ( $ok ) {
		echo "  ok    $name\n";
		return;
	}
	++$fails;
	echo "  FAIL  $name" . ( '' !== $detail ? "\n        " . substr( is_string( $detail ) ? $detail : json_encode( $detail ), 0, 900 ) : '' ) . "\n";
}

function sign_up( $phone, $name ) {
	$device = array(
		'id'          => 'dev-' . $phone,
		'platform'    => 'android',
		'name'        => 'Test phone',
		'app_version' => '1.0.0',
	);
	$r      = call( 'POST', '/auth/otp/request', array( 'country_code' => '+90', 'phone' => $phone ) );
	$v      = call( 'POST', '/auth/otp/verify', array( 'request_id' => $r['json']['request_id'] ?? '', 'code' => '123456', 'device' => $device ) );
	$s      = call( 'POST', '/auth/register', array( 'signup_token' => $v['json']['signup_token'] ?? '', 'name' => $name, 'device' => $device ) );
	return $s['json']['access_token'] ?? '';
}

function names( $items ) {
	return array_map(
		static function ( $item ) {
			return $item['name'];
		},
		(array) $items
	);
}

$tz = new DateTimeZone( 'Europe/Istanbul' );
// A Monday at least two days ahead, in the salon's time zone.
$monday = new DateTimeImmutable( 'now', $tz );
$monday = $monday->modify( '+2 days' )->modify( 'next monday' );
$date   = $monday->format( 'Y-m-d' );
$sunday = $monday->modify( '+6 days' )->format( 'Y-m-d' );

echo "Config\n";
$config = call( 'GET', '/config?platform=android&app_version=1.0.0' );
$b      = $config['json']['bookings'] ?? null;
check( 'bookings config present', is_array( $b ), $config['raw'] );
check( 'plugin is ' . $booking, ( $b['plugin'] ?? '' ) === $booking, $b );
check( 'business time zone', ( $b['timezone'] ?? '' ) === 'Europe/Istanbul', $b );
check( 'currency', ( $b['currency'] ?? '' ) === 'TRY', $b );
check( 'staff choice', ( $b['staff_choice'] ?? null ) === ( ! $one && ! $none ), $b );
check( 'cancel rule', array_key_exists( 'cancel_before_minutes', (array) $b ) && 60 === ( $b['cancel_before_minutes'] ?? null ), $b );
check( 'no LMS', array_key_exists( 'lms', $config['json']['features'] ?? array() ) && null === $config['json']['features']['lms'], $config['json']['features'] ?? null );

echo "Services\n";
$cats = call( 'GET', '/bookings/categories' );
check( 'categories', names( $cats['json']['items'] ?? array() ) === ( $one ? array( 'Hair' ) : array( 'Hair', 'Spa' ) ), $cats['raw'] );
check( 'category counts skip hidden services', array_column( $cats['json']['items'] ?? array(), 'count' ) === ( $one ? array( 2 ) : array( 2, 1 ) ), $cats['raw'] );
$all = call( 'GET', '/bookings/services' );
check( 'services in order, hidden left out', names( $all['json']['items'] ?? array() ) === ( $one ? array( 'Haircut', 'Hair colouring' ) : array( 'Haircut', 'Hair colouring', 'Massage' ) ), $all['raw'] );
check( 'page meta', ( $one ? 2 : 3 ) === ( $all['json']['total'] ?? 0 ) && 1 === ( $all['json']['total_pages'] ?? 0 ), $all['raw'] );
$haircut = $all['json']['items'][0] ?? array();
check( 'duration', 30 === ( $haircut['duration_minutes'] ?? 0 ), $haircut );
check( 'price', '300.00' === ( $haircut['price']['amount'] ?? '' ) && 'TRY' === ( $haircut['price']['currency'] ?? '' ) && false !== strpos( (string) ( $haircut['price']['formatted'] ?? '' ), '300' ), $haircut );
$search = call( 'GET', '/bookings/services?search=hair' );
check( 'search', names( $search['json']['items'] ?? array() ) === array( 'Haircut', 'Hair colouring' ), $search['raw'] );
$spa = call( 'GET', '/bookings/services?category=' . $seed['spa'] );
check( 'category filter', names( $spa['json']['items'] ?? array() ) === ( $one ? array() : array( 'Massage' ) ), $spa['raw'] );
$detail = call( 'GET', '/bookings/services/' . $seed['haircut'] );
check( 'service detail', 200 === $detail['status'] && false !== strpos( (string) ( $detail['json']['description_html'] ?? '' ), 'Haircut' ), $detail['raw'] );
check( 'service staff', names( $detail['json']['staff'] ?? array() ) === ( $none ? array() : ( $one ? array( 'Ayşe Kaya' ) : array( 'Ayşe Kaya', 'Mehmet Demir' ) ) ), $detail['raw'] );
$colour = call( 'GET', '/bookings/services/' . $seed['colouring'] );
if ( $none ) {
	check( 'service price', '900.00' === ( $colour['json']['price']['amount'] ?? '' ), $colour['raw'] );
} else {
	check( 'own staff price', '950.00' === ( $colour['json']['staff'][0]['price']['amount'] ?? '' ), $colour['raw'] );
}
check( 'hidden service is 404', 404 === call( 'GET', '/bookings/services/' . $seed['hidden'] )['status'] );
if ( $one ) {
	check( 'a service only others provide is 404', 404 === call( 'GET', '/bookings/services/' . $seed['massage'] )['status'] );
}

echo "Free times\n";
$week = call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . '&from=' . $date . '&days=7' );
$days = $week['json']['days'] ?? array();
check( 'seven days', 7 === count( $days ) && ( $days[0]['date'] ?? '' ) === $date, $week['raw'] );
$monday_slots = $days[0]['slots'] ?? array();
check( 'Monday opens at 09:00', ( $monday_slots[0]['local_time'] ?? '' ) === '09:00', $monday_slots[0] ?? $week['raw'] );
check( 'UTC start (Istanbul is UTC+3)', ( $monday_slots[0]['start'] ?? '' ) === $date . 'T06:00:00Z', $monday_slots[0] ?? null );
check( 'end after the service', ( $monday_slots[0]['end'] ?? '' ) === $date . 'T06:30:00Z', $monday_slots[0] ?? null );
check( 'last start leaves time for the service', '16:30' === ( end( $monday_slots )['local_time'] ?? '' ), end( $monday_slots ) );
$free_staff = $none ? array() : ( $one ? array( (int) $seed['ayse'] ) : array( (int) $seed['ayse'], (int) $seed['mehmet'] ) );
check( $none ? 'no staff' : ( $one ? 'only the bookable stylist' : 'both stylists free' ), $free_staff === array_map( 'intval', ( function ( $ids ) { sort( $ids ); return $ids; } )( $monday_slots[0]['staff_ids'] ?? array() ) ), $monday_slots[0] ?? null );
check( 'closed on Sunday', array() === ( $days[6]['slots'] ?? null ) && $days[6]['date'] === $sunday, $days[6] ?? null );
if ( $none ) {
	check( 'a staff member that doesn\'t exist', 400 === call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . '&staff=999&from=' . $date )['status'] );
} else {
	$ayse_only = call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . '&staff=' . $seed['ayse'] . '&from=' . $date . '&days=1' );
	check( 'one stylist', array( (int) $seed['ayse'] ) === ( $ayse_only['json']['days'][0]['slots'][0]['staff_ids'] ?? null ), $ayse_only['raw'] );
	check( 'staff who don\'t provide it', 400 === call( 'GET', '/bookings/availability?service=' . $seed['colouring'] . '&staff=' . $seed['mehmet'] . '&from=' . $date )['status'] );
}
// Free times for her, or for anyone when there's no staff.
$her = $none ? '' : '&staff=' . $seed['ayse'];

echo "Booking\n";
$start = $date . 'T07:00:00Z'; // 10:00 in Istanbul.
check( 'signed out is 401', 401 === call( 'POST', '/bookings/appointments?platform=android', array( 'service_id' => $seed['haircut'], 'start' => $start ) )['status'] );
$token = sign_up( '5551230001', 'Elif Şahin' );
check( 'customer signed up', '' !== $token );
$booked = call(
	'POST',
	'/bookings/appointments?platform=android',
	array_filter(
		array(
			'service_id' => $seed['haircut'],
			'staff_id'   => $none ? null : $seed['ayse'],
			'start'      => $start,
			'notes'      => 'Short on the sides.',
		)
	),
	$token
);
$a = $booked['json'] ?? array();
check( 'booked', 201 === $booked['status'], $booked['raw'] );
check( 'approved', 'approved' === ( $a['status'] ?? '' ), $a );
check( 'local time', '10:00' === ( $a['local_time'] ?? '' ) && $date === ( $a['local_date'] ?? '' ), $a );
check( 'UTC times', $start === ( $a['start'] ?? '' ) && $date . 'T07:30:00Z' === ( $a['end'] ?? '' ), $a );
check( 'service and staff', 'Haircut' === ( $a['service']['name'] ?? '' ) && ( $none ? array_key_exists( 'staff', $a ) && null === $a['staff'] : 'Ayşe Kaya' === ( $a['staff']['name'] ?? '' ) ), $a );
check( 'price', '300.00' === ( $a['price']['amount'] ?? '' ), $a );
check( 'can cancel', true === ( $a['can_cancel'] ?? null ), $a );
$again = call( 'POST', '/bookings/appointments?platform=android', array_filter( array( 'service_id' => $seed['haircut'], 'staff_id' => $none ? null : $seed['ayse'], 'start' => $start ) ), $token );
check( 'the same time again is slot_taken', 409 === $again['status'] && 'slot_taken' === ( $again['json']['code'] ?? '' ), $again['raw'] );
$after = call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . $her . '&from=' . $date . '&days=1' );
check( $none ? 'the time is no longer free' : 'the time is no longer free for her', ! in_array( '10:00', array_column( $after['json']['days'][0]['slots'] ?? array(), 'local_time' ), true ), $after['raw'] );
$still = call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . '&staff=' . $seed['mehmet'] . '&from=' . $date . '&days=1' );
if ( $none ) {
	// One calendar: nobody else to book.
} elseif ( $one ) {
	check( 'the other stylist can\'t be booked', 400 === $still['status'], $still['raw'] );
} else {
	check( 'but still free for him', in_array( '10:00', array_column( $still['json']['days'][0]['slots'] ?? array(), 'local_time' ), true ), $still['raw'] );
}
$sunday_try = call( 'POST', '/bookings/appointments?platform=android', array( 'service_id' => $seed['haircut'], 'start' => $sunday . 'T07:00:00Z' ), $token );
check( 'a closed day is slot_taken', 409 === $sunday_try['status'], $sunday_try['raw'] );
$second = $one ? 'Haircut' : 'Massage';
$anyone = call( 'POST', '/bookings/appointments?platform=android', array( 'service_id' => $seed[ $one ? 'haircut' : 'massage' ], 'start' => $date . 'T11:00:00Z' ), $token );
check( 'anyone free: the plugin picks', 201 === $anyone['status'] && ( $none ? array_key_exists( 'staff', (array) ( $anyone['json'] ?? array() ) ) && null === $anyone['json']['staff'] : ( $one ? 'Ayşe Kaya' : 'Mehmet Demir' ) === ( $anyone['json']['staff']['name'] ?? '' ) ), $anyone['raw'] );

echo "My appointments\n";
$upcoming = call( 'GET', '/me/appointments', null, $token );
check( 'upcoming, soonest first', array( 'Haircut', $second ) === array_column( array_column( $upcoming['json']['items'] ?? array(), 'service' ), 'name' ), $upcoming['raw'] );
$single = call( 'GET', '/me/appointments/' . ( $a['id'] ?? 0 ), null, $token );
check( 'one appointment', 200 === $single['status'] && ( $single['json']['id'] ?? 0 ) === ( $a['id'] ?? -1 ), $single['raw'] );
$other = sign_up( '5551230002', 'Can Yıldız' );
check( 'someone else\'s is 404', 404 === call( 'GET', '/me/appointments/' . ( $a['id'] ?? 0 ), null, $other )['status'] );
check( 'someone else can\'t cancel it', 404 === call( 'POST', '/me/appointments/' . ( $a['id'] ?? 0 ) . '/cancel', null, $other )['status'] );
$home = call( 'GET', '/bookings/home', null, $token );
$types = array_column( $home['json']['sections'] ?? array(), 'type' );
// The team section needs at least two people.
check( 'home sections', ( $one || $none ? array( 'next_appointment', 'categories', 'services' ) : array( 'next_appointment', 'categories', 'services', 'staff' ) ) === $types, $home['raw'] );
check( 'next appointment on home', 'Haircut' === ( $home['json']['sections'][0]['appointment']['service']['name'] ?? '' ), $home['raw'] );

echo "Cancelling\n";
$cancel = call( 'POST', '/me/appointments/' . ( $a['id'] ?? 0 ) . '/cancel', null, $token );
check( 'cancelled', 200 === $cancel['status'] && 'cancelled' === ( $cancel['json']['status'] ?? '' ) && false === ( $cancel['json']['can_cancel'] ?? null ), $cancel['raw'] );
$free = call( 'GET', '/bookings/availability?service=' . $seed['haircut'] . $her . '&from=' . $date . '&days=1' );
check( 'the time is free again', in_array( '10:00', array_column( $free['json']['days'][0]['slots'] ?? array(), 'local_time' ), true ), $free['raw'] );
$past = call( 'GET', '/me/appointments?status=past', null, $token );
check( 'cancelled ones are under past', 1 === ( $past['json']['total'] ?? 0 ) && 'cancelled' === ( $past['json']['items'][0]['status'] ?? '' ), $past['raw'] );
check( 'cancelling twice is too_late', 409 === call( 'POST', '/me/appointments/' . ( $a['id'] ?? 0 ) . '/cancel', null, $token )['status'] );

echo "\n$count checks, $fails failed\n";
exit( $fails ? 1 : 0 );
