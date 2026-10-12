<?php
/**
 * Seeds the dev site with courses, lessons and a quiz shaped like real Tutor LMS data.
 * Run with: wp eval-file seed.php
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

global $wpdb;

$tutor_options                = (array) get_option( 'tutor_option', array() );
$tutor_options['monetize_by'] = 'tutor';
update_option( 'tutor_option', $tutor_options );

$category_programming = wp_insert_term( 'Programming', 'course-category' );
$category_languages   = wp_insert_term( 'Languages', 'course-category' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => 'editor',
	)
);

/**
 * Creates a published post and returns its ID.
 *
 * @param array $args Post fields.
 * @return int
 */
function yallapp_seed_post( array $args ) {
	return (int) wp_insert_post( array_merge( array( 'post_status' => 'publish' ), $args ) );
}

// A tiny file standing in for an uploaded lesson video.
$uploads    = wp_upload_dir();
$video_path = $uploads['path'] . '/intro.mp4';
file_put_contents( $video_path, str_repeat( 'yallapp-video-bytes-', 4096 ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
$video_id = wp_insert_attachment(
	array(
		'post_title'     => 'intro',
		'post_mime_type' => 'video/mp4',
		'post_status'    => 'inherit',
	),
	$video_path
);

// Course 1: free, with video, HTML/code/iframe lessons and a quiz.
$python = yallapp_seed_post(
	array(
		'post_type'    => 'courses',
		'post_title'   => 'Python Programming Basics',
		'post_content' => '<p>Learn Python from zero.</p>',
		'post_author'  => $instructor_id,
	)
);
update_post_meta( $python, '_tutor_course_price_type', 'free' );
update_post_meta( $python, '_tutor_course_level', 'beginner' );
update_post_meta(
	$python,
	'_course_duration',
	array(
		'hours'   => '2',
		'minutes' => '30',
		'seconds' => '0',
	)
);
wp_set_object_terms( $python, array( (int) $category_programming['term_id'] ), 'course-category' );

$topic_1      = yallapp_seed_post(
	array(
		'post_type'   => 'topics',
		'post_title'  => 'Module 1: Getting started',
		'post_parent' => $python,
		'menu_order'  => 1,
	)
);
$lesson_video = yallapp_seed_post(
	array(
		'post_type'    => 'lesson',
		'post_title'   => 'Lesson 1: Welcome',
		'post_content' => '<p>Watch the welcome video.</p>',
		'post_parent'  => $topic_1,
		'menu_order'   => 1,
	)
);
update_post_meta(
	$lesson_video,
	'_video',
	array(
		'source'          => 'html5',
		'source_video_id' => $video_id,
		'runtime'         => array(
			'hours'   => '00',
			'minutes' => '12',
			'seconds' => '30',
		),
	)
);
update_post_meta( $lesson_video, '_is_preview', 1 );

$lesson_html = yallapp_seed_post(
	array(
		'post_type'    => 'lesson',
		'post_title'   => 'Lesson 2: Writing your first function',
		'post_content' => '<p>A function is a reusable block of code.</p>'
			. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
			. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
			. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>',
		'post_parent'  => $topic_1,
		'menu_order'   => 2,
	)
);

$lesson_script = yallapp_seed_post(
	array(
		'post_type'    => 'lesson',
		'post_title'   => 'Lesson 3: Interactive widget',
		'post_content' => '<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>',
		'post_parent'  => $topic_1,
		'menu_order'   => 3,
	)
);

$quiz = yallapp_seed_post(
	array(
		'post_type'   => 'tutor_quiz',
		'post_title'  => 'Module 1 quiz',
		'post_parent' => $topic_1,
		'menu_order'  => 4,
	)
);
update_post_meta(
	$quiz,
	'tutor_quiz_option',
	array(
		'time_limit'               => array(
			'time_type'  => 'minutes',
			'time_value' => 10,
		),
		'attempts_allowed'         => 3,
		'limit_attempts_allowed'   => '1',
		'passing_grade'            => 60,
		'max_questions_for_answer' => 10,
		'questions_order'          => 'sorting',
	)
);

/**
 * Adds a quiz question with its answers.
 *
 * @param int    $quiz_id Quiz ID.
 * @param string $type    Question type.
 * @param string $title   Question.
 * @param array  $answers Answer title => is correct.
 * @param int    $order   Order.
 * @return int Question ID.
 */
function yallapp_seed_question( $quiz_id, $type, $title, array $answers, $order ) {
	global $wpdb;
	$wpdb->insert(
		$wpdb->prefix . 'tutor_quiz_questions',
		array(
			'quiz_id'           => $quiz_id,
			'question_title'    => $title,
			'question_type'     => $type,
			'question_mark'     => 1,
			'question_settings' => maybe_serialize( array( 'question_type' => $type ) ),
			'question_order'    => $order,
		)
	);
	$question_id = (int) $wpdb->insert_id;
	$position    = 0;
	foreach ( $answers as $answer_title => $is_correct ) {
		$wpdb->insert(
			$wpdb->prefix . 'tutor_quiz_question_answers',
			array(
				'belongs_question_id'   => $question_id,
				'belongs_question_type' => $type,
				'answer_title'          => $answer_title,
				'is_correct'            => $is_correct ? 1 : 0,
				'answer_order'          => ++$position,
			)
		);
	}
	return $question_id;
}

yallapp_seed_question(
	$quiz,
	'true_false',
	'Python is case sensitive.',
	array(
		'True'  => true,
		'False' => false,
	),
	1
);
yallapp_seed_question(
	$quiz,
	'single_choice',
	'Which keyword is used to define a function in Python?',
	array(
		'function' => false,
		'def'      => true,
		'fun'      => false,
	),
	2
);
yallapp_seed_question(
	$quiz,
	'multiple_choice',
	'Which of these are Python data types?',
	array(
		'list'    => true,
		'dict'    => true,
		'pointer' => false,
	),
	3
);

// Course 2: paid with Tutor's own checkout, one free preview lesson.
$design = yallapp_seed_post(
	array(
		'post_type'    => 'courses',
		'post_title'   => 'UI Design Fundamentals',
		'post_content' => '<p>Design interfaces people love.</p>',
		'post_author'  => $instructor_id,
	)
);
update_post_meta( $design, '_tutor_course_price_type', 'paid' );
update_post_meta( $design, 'tutor_course_price', 450 );
update_post_meta( $design, 'tutor_course_sale_price', 0 );
wp_set_object_terms( $design, array( (int) $category_programming['term_id'] ), 'course-category' );
$design_topic   = yallapp_seed_post(
	array(
		'post_type'   => 'topics',
		'post_title'  => 'Module 1: Introduction',
		'post_parent' => $design,
		'menu_order'  => 1,
	)
);
$design_preview = yallapp_seed_post(
	array(
		'post_type'    => 'lesson',
		'post_title'   => 'What is UI design?',
		'post_content' => '<p>Preview lesson.</p>',
		'post_parent'  => $design_topic,
		'menu_order'   => 1,
	)
);
update_post_meta( $design_preview, '_is_preview', 1 );
$design_locked = yallapp_seed_post(
	array(
		'post_type'    => 'lesson',
		'post_title'   => 'Designer tools',
		'post_content' => '<p>Locked lesson.</p>',
		'post_parent'  => $design_topic,
		'menu_order'   => 2,
	)
);

// Course 3: free, no content yet.
$english = yallapp_seed_post(
	array(
		'post_type'   => 'courses',
		'post_title'  => 'Business English for Beginners',
		'post_author' => $instructor_id,
	)
);
update_post_meta( $english, '_tutor_course_price_type', 'free' );
wp_set_object_terms( $english, array( (int) $category_languages['term_id'] ), 'course-category' );

update_option(
	'yallapp_seed_ids',
	array(
		'python'         => $python,
		'design'         => $design,
		'english'        => $english,
		'lesson_video'   => $lesson_video,
		'lesson_html'    => $lesson_html,
		'lesson_script'  => $lesson_script,
		'quiz'           => $quiz,
		'design_preview' => $design_preview,
		'design_locked'  => $design_locked,
		'video_id'       => $video_id,
		'instructor'     => $instructor_id,
	)
);

echo "Seeded.\n";
