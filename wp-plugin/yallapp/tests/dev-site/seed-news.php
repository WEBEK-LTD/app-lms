<?php
/**
 * Seeds a news site (no LMS, no shop) for the News & blog checks.
 * Run with: wp eval-file seed-news.php
 *
 * yallapp_seed_ids keys: ferry (City, sticky, featured image, a YouTube embed), match
 * (Sport and City), tram (City), private (City, private), locked (City, password),
 * draft (City, draft), page (a page, not a post), city, sport, author.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

wp_set_current_user( 1 );
wp_update_user(
	array(
		'ID'           => 1,
		'display_name' => 'Ayla Demir',
	)
);
update_option( 'timezone_string', 'UTC' );
// WordPress's "Hello world!" post isn't news.
wp_delete_post( 1, true );

$city  = wp_insert_term( 'City', 'category' );
$sport = wp_insert_term( 'Sport', 'category' );

/**
 * Creates a post.
 *
 * @param string $title   Title.
 * @param string $content Content.
 * @param array  $cats    Category IDs.
 * @param string $date    Date (UTC).
 * @param array  $extra   More wp_insert_post fields.
 * @return int
 */
function yallapp_seed_post( $title, $content, array $cats, $date, array $extra = array() ) {
	return (int) wp_insert_post(
		array_merge(
			array(
				'post_type'     => 'post',
				'post_status'   => 'publish',
				'post_title'    => $title,
				'post_content'  => $content,
				'post_category' => $cats,
				'post_author'   => 1,
				'post_date'     => $date,
				'post_date_gmt' => $date,
			),
			$extra
		)
	);
}

$ferry = yallapp_seed_post(
	'Night ferries return',
	"<!-- wp:paragraph --><p>Boats every 40 minutes until 1:00.</p><!-- /wp:paragraph -->\n\n<iframe src=\"https://www.youtube.com/embed/abc123\" width=\"560\" height=\"315\" allowfullscreen></iframe>",
	array( $city['term_id'] ),
	'2026-10-13 08:00:00',
	array( 'post_excerpt' => 'Late boats are back.' )
);
$match = yallapp_seed_post( 'A late goal wins the derby', '<p>A header in the 89th minute.</p>', array( $sport['term_id'], $city['term_id'] ), '2026-10-12 08:00:00' );
$tram  = yallapp_seed_post( 'Tram line 3 extends', '<p>Four new stops next spring.</p>', array( $city['term_id'] ), '2026-10-11 08:00:00' );

$private = yallapp_seed_post( 'Staff only: the rota', '<p>Private.</p>', array( $city['term_id'] ), '2026-10-13 09:00:00', array( 'post_status' => 'private' ) );
$locked  = yallapp_seed_post( 'Members: the plan', '<p>Locked.</p>', array( $city['term_id'] ), '2026-10-13 10:00:00', array( 'post_password' => 'secret' ) );
$draft   = yallapp_seed_post( 'Next week', '<p>Draft.</p>', array( $city['term_id'] ), '2026-10-13 11:00:00', array( 'post_status' => 'draft' ) );
$page    = yallapp_seed_post( 'About us', '<p>A page.</p>', array(), '2026-10-13 12:00:00', array( 'post_type' => 'page' ) );

stick_post( $ferry );

// A featured image: a 1x1 PNG in the uploads folder.
$upload = wp_upload_bits( 'ferry.png', null, base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- A fixture picture.
$image  = wp_insert_attachment(
	array(
		'post_mime_type' => 'image/png',
		'post_title'     => 'Ferry',
		'post_status'    => 'inherit',
	),
	$upload['file'],
	$ferry
);
set_post_thumbnail( $ferry, $image );

update_option(
	'yallapp_seed_ids',
	array(
		'ferry'   => $ferry,
		'match'   => $match,
		'tram'    => $tram,
		'private' => $private,
		'locked'  => $locked,
		'draft'   => $draft,
		'page'    => $page,
		'city'    => (int) $city['term_id'],
		'sport'   => (int) $sport['term_id'],
		'author'  => 1,
	),
	false
);
echo "Seeded a news site.\n";
