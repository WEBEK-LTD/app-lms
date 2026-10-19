<?php
/**
 * 39 Sells the Tutor LMS dev site's paid courses with WooCommerce, the way most Tutor
 * academies do (Tutor LMS > Settings > Monetization: WooCommerce). Runs after seed.php.
 * Run with: wp eval-file seed-tutor-woo.php
 *
 * Adds to yallapp_seed_ids: design_product (the WooCommerce product of "UI Design
 * Fundamentals"), photo (a second paid course, on sale), photo_product, photo_lesson (with a
 * PDF attachment), photo_lesson_2, photo_quiz, photo_assignment and photo_pdf.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

global $wpdb;

wp_set_current_user( 1 );

$tutor_options                = (array) get_option( 'tutor_option', array() );
$tutor_options['monetize_by'] = 'wc';
update_option( 'tutor_option', $tutor_options );

update_option( 'woocommerce_currency', 'USD' );
update_option( 'woocommerce_enable_guest_checkout', 'no' );
update_option( 'woocommerce_enable_signup_and_login_from_checkout', 'yes' );
// Cash on delivery and bank transfer: payments that need no outside service.
update_option(
	'woocommerce_cod_settings',
	array(
		'enabled'            => 'yes',
		'title'              => 'Cash on delivery',
		'enable_for_virtual' => 'yes',
	)
);
update_option(
	'woocommerce_bacs_settings',
	array(
		'enabled' => 'yes',
		'title'   => 'Direct bank transfer',
	)
);
WC_Install::create_pages();

$seed = (array) get_option( 'yallapp_seed_ids', array() );

/**
 * A virtual WooCommerce product that sells a Tutor course, linked the way Tutor links them.
 *
 * @param int    $course_id Course ID.
 * @param string $price     Regular price.
 * @param string $sale      Sale price, or ''.
 * @return int Product ID.
 */
function yallapp_seed_course_product( $course_id, $price, $sale = '' ) {
	$product = new WC_Product_Simple();
	$product->set_name( get_the_title( $course_id ) );
	$product->set_status( 'publish' );
	$product->set_virtual( true );
	$product->set_regular_price( $price );
	if ( '' !== $sale ) {
		$product->set_sale_price( $sale );
	}
	$product->update_meta_data( '_tutor_product', 'yes' );
	$product->save();
	update_post_meta( $course_id, '_tutor_course_product_id', $product->get_id() );
	return $product->get_id();
}

$design_product = yallapp_seed_course_product( (int) $seed['design'], '450' );

// A second paid course: a lesson with a PDF, a second lesson, a quiz and an assignment.
$photo = (int) wp_insert_post(
	array(
		'post_type'    => 'courses',
		'post_status'  => 'publish',
		'post_title'   => 'Clinical Photography',
		'post_content' => '<p>Take clear photos of every case.</p>',
		'post_author'  => (int) $seed['instructor'],
	)
);
update_post_meta( $photo, '_tutor_course_price_type', 'paid' );
$photo_product = yallapp_seed_course_product( $photo, '300', '250' );

$photo_topic = (int) wp_insert_post(
	array(
		'post_type'   => 'topics',
		'post_status' => 'publish',
		'post_title'  => 'Module 1: The camera',
		'post_parent' => $photo,
		'menu_order'  => 1,
	)
);

$uploads  = wp_upload_dir();
$pdf_path = $uploads['path'] . '/camera-settings.pdf';
file_put_contents( $pdf_path, "%PDF-1.4\n% Yallapp test file\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
$pdf = wp_insert_attachment(
	array(
		'post_title'     => 'camera-settings',
		'post_mime_type' => 'application/pdf',
		'post_status'    => 'inherit',
	),
	$pdf_path
);

$photo_lesson = (int) wp_insert_post(
	array(
		'post_type'    => 'lesson',
		'post_status'  => 'publish',
		'post_title'   => 'Camera settings',
		'post_content' => '<p>Aperture, shutter speed and ISO for intraoral photos.</p>',
		'post_parent'  => $photo_topic,
		'menu_order'   => 1,
	)
);
update_post_meta( $photo_lesson, '_tutor_attachments', array( $pdf ) );

$photo_assignment = (int) wp_insert_post(
	array(
		'post_type'    => 'tutor_assignments',
		'post_status'  => 'publish',
		'post_title'   => 'Photograph a model',
		'post_content' => '<p>Upload five photos.</p>',
		'post_parent'  => $photo_topic,
		'menu_order'   => 2,
	)
);

$photo_lesson_2 = (int) wp_insert_post(
	array(
		'post_type'    => 'lesson',
		'post_status'  => 'publish',
		'post_title'   => 'Lighting',
		'post_content' => '<p>Ring flash or twin flash.</p>',
		'post_parent'  => $photo_topic,
		'menu_order'   => 3,
	)
);

$photo_quiz = (int) wp_insert_post(
	array(
		'post_type'   => 'tutor_quiz',
		'post_status' => 'publish',
		'post_title'  => 'Camera quiz',
		'post_parent' => $photo_topic,
		'menu_order'  => 4,
	)
);
update_post_meta(
	$photo_quiz,
	'tutor_quiz_option',
	array(
		'passing_grade'   => 50,
		'questions_order' => 'sorting',
	)
);
$wpdb->insert(
	$wpdb->prefix . 'tutor_quiz_questions',
	array(
		'quiz_id'           => $photo_quiz,
		'question_title'    => 'A small aperture gives a deeper depth of field.',
		'question_type'     => 'true_false',
		'question_mark'     => 1,
		'question_settings' => maybe_serialize( array( 'question_type' => 'true_false' ) ),
		'question_order'    => 1,
	)
);
$question = (int) $wpdb->insert_id;
foreach ( array(
	'True'  => 1,
	'False' => 0,
) as $answer => $correct ) {
	$wpdb->insert(
		$wpdb->prefix . 'tutor_quiz_question_answers',
		array(
			'belongs_question_id'   => $question,
			'belongs_question_type' => 'true_false',
			'answer_title'          => $answer,
			'is_correct'            => $correct,
			'answer_order'          => $correct ? 1 : 2,
		)
	);
}

// Tutor LMS Pro's assignments add their post type to a topic's contents like this.
wp_mkdir_p( WPMU_PLUGIN_DIR );
file_put_contents( // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	WPMU_PLUGIN_DIR . '/tutor-assignments.php',
	"<?php\nadd_filter( 'tutor_course_contents_post_types', static function ( \$types ) { \$types[] = 'tutor_assignments'; return \$types; } );\n"
);

update_option(
	'yallapp_seed_ids',
	array_merge(
		$seed,
		array(
			'design_product'   => $design_product,
			'photo'            => $photo,
			'photo_product'    => $photo_product,
			'photo_lesson'     => $photo_lesson,
			'photo_lesson_2'   => $photo_lesson_2,
			'photo_quiz'       => $photo_quiz,
			'photo_assignment' => $photo_assignment,
			'photo_pdf'        => $pdf,
		)
	)
);

echo "Seeded WooCommerce.\n";
