<?php
/**
 * Seeds the dev site with the same courses as seed.php, built with LearnPress's own
 * models (the way its sample data installer builds courses).
 * Run with: wp eval-file seed-learnpress.php
 *
 * yallapp_seed_ids keys: python, design, english, lesson_video, lesson_html, lesson_script,
 * quiz, design_preview, design_locked, instructor, and `expect` for adapter-test.php.
 * LearnPress lessons have no video field, so the "video" lesson embeds YouTube in its content.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.WP.GlobalVariablesOverride -- Test fixture.

use LearnPress\Models\CourseModel;
use LearnPress\Models\CoursePostModel;
use LearnPress\Models\CourseSectionModel;
use LearnPress\Models\LessonPostModel;
use LearnPress\Models\QuizPostModel;

global $wpdb;

// LearnPress grants its capabilities on its first admin request, which WP-CLI never makes.
learn_press_add_user_roles();

$category_programming = wp_insert_term( 'Programming', 'course_category' );
$category_languages   = wp_insert_term( 'Languages', 'course_category' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => LP_TEACHER_ROLE,
	)
);
wp_set_current_user( 1 );
$GLOBALS['yallapp_seed_instructor'] = $instructor_id;

/**
 * Creates a course with LearnPress's CoursePostModel, as CourseService::create_info_main() does.
 *
 * @param string $title   Title.
 * @param string $content Description.
 * @param array  $meta    Meta.
 * @param int    $term    Category term ID.
 * @return CoursePostModel
 */
function yallapp_seed_course( $title, $content, array $meta, $term ) {
	$course            = new CoursePostModel(
		array(
			'post_title'   => $title,
			'post_type'    => LP_COURSE_CPT,
			'post_status'  => 'publish',
			'post_content' => $content,
			'post_author'  => $GLOBALS['yallapp_seed_instructor'],
		)
	);
	$course->meta_data = (object) $meta;
	$course->save();
	wp_set_object_terms( $course->get_id(), array( (int) $term ), 'course_category' );
	return $course;
}

/**
 * Creates a lesson and adds it to a section.
 *
 * @param CourseSectionModel $section Section.
 * @param string             $title   Title.
 * @param string             $content Content.
 * @param bool               $preview Free preview.
 * @return int
 */
function yallapp_seed_lesson( CourseSectionModel $section, $title, $content, $preview = false ) {
	$lesson               = new LessonPostModel();
	$lesson->post_title   = $title;
	$lesson->post_status  = 'publish';
	$lesson->post_author  = $GLOBALS['yallapp_seed_instructor'];
	$lesson->post_type    = LP_LESSON_CPT;
	$lesson->post_content = $content;
	$lesson->meta_data->{LessonPostModel::META_KEY_DURATION} = '12 minute';
	$lesson->meta_data->{LessonPostModel::META_KEY_PREVIEW}  = $preview ? 'yes' : 'no';
	$lesson->save();
	$section->add_items(
		array(
			'items' => array(
				array(
					'id'   => $lesson->get_id(),
					'type' => LP_LESSON_CPT,
				),
			),
		)
	);
	return $lesson->get_id();
}

/**
 * Refreshes LearnPress's cached course data after building the curriculum.
 *
 * @param int $course_id Course ID.
 * @return void
 */
function yallapp_seed_refresh( $course_id ) {
	$course = CourseModel::find( $course_id, true );
	unset( $course->first_item_id, $course->total_items, $course->sections_items );
	$course->get_first_item_id();
	$course->get_total_items();
	$course->get_section_items();
	$course->save();
}

// Course 1: free, with video, HTML/code/iframe lessons and a quiz.
$python  = yallapp_seed_course(
	'Python Programming Basics',
	'<p>Learn Python from zero.</p>',
	array(
		CoursePostModel::META_KEY_LEVEL    => 'beginner',
		CoursePostModel::META_KEY_DURATION => '150 minute',
	),
	$category_programming['term_id']
);
$section = $python->add_section( array( 'section_name' => 'Module 1: Getting started' ) );

$lesson_video  = yallapp_seed_lesson(
	$section,
	'Lesson 1: Welcome',
	'<p>Watch the welcome video.</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
);
$lesson_html   = yallapp_seed_lesson(
	$section,
	'Lesson 2: Writing your first function',
	'<p>A function is a reusable block of code.</p>'
		. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
		. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
		. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>'
);
$lesson_script = yallapp_seed_lesson(
	$section,
	'Lesson 3: Interactive widget',
	'<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>'
);

$quiz               = new QuizPostModel();
$quiz->post_title   = 'Module 1 quiz';
$quiz->post_status  = 'publish';
$quiz->post_author  = $GLOBALS['yallapp_seed_instructor'];
$quiz->post_type    = LP_QUIZ_CPT;
$quiz->post_content = '';
$quiz->meta_data->{QuizPostModel::META_KEY_PASSING_GRADE} = 60;
$quiz->meta_data->{QuizPostModel::META_KEY_DURATION}      = '10 minute';
$quiz->meta_data->{QuizPostModel::META_KEY_RETAKE_COUNT}  = 5;
$quiz->save();
$section->add_items(
	array(
		'items' => array(
			array(
				'id'   => $quiz->get_id(),
				'type' => LP_QUIZ_CPT,
			),
		),
	)
);

/**
 * Adds a question with its answers to the quiz, as LearnPress's sample data does.
 *
 * @param int    $quiz_id Quiz ID.
 * @param string $type    true_or_false, single_choice or multi_choice.
 * @param string $title   Question.
 * @param array  $answers Answer title => is correct.
 * @param int    $order   Order.
 * @return int Question ID.
 */
function yallapp_seed_question( $quiz_id, $type, $title, array $answers, $order ) {
	global $wpdb;
	$question_id = wp_insert_post(
		array(
			'post_title'  => $title,
			'post_type'   => LP_QUESTION_CPT,
			'post_status' => 'publish',
			'post_author' => $GLOBALS['yallapp_seed_instructor'],
		)
	);
	update_post_meta( $question_id, '_lp_type', $type );
	update_post_meta( $question_id, '_lp_mark', 1 );
	$wpdb->insert(
		$wpdb->prefix . 'learnpress_quiz_questions',
		array(
			'quiz_id'        => $quiz_id,
			'question_id'    => $question_id,
			'question_order' => $order,
		)
	);
	$position = 0;
	foreach ( $answers as $answer => $is_true ) {
		$wpdb->insert(
			$wpdb->prefix . 'learnpress_question_answers',
			array(
				'question_id' => $question_id,
				'title'       => $answer,
				'value'       => learn_press_random_value(),
				'is_true'     => $is_true ? 'yes' : 'no',
				'order'       => ++$position,
			)
		);
	}
	return $question_id;
}

yallapp_seed_question(
	$quiz->get_id(),
	'true_or_false',
	'Python is case sensitive.',
	array(
		'True'  => true,
		'False' => false,
	),
	1
);
yallapp_seed_question(
	$quiz->get_id(),
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
	$quiz->get_id(),
	'multi_choice',
	'Which of these are Python data types?',
	array(
		'list'    => true,
		'dict'    => true,
		'pointer' => false,
	),
	3
);
yallapp_seed_refresh( $python->get_id() );

// Course 2: paid with LearnPress's checkout, one free preview lesson.
$design         = yallapp_seed_course(
	'UI Design Fundamentals',
	'<p>Design interfaces people love.</p>',
	array(
		CoursePostModel::META_KEY_PRICE         => 450,
		CoursePostModel::META_KEY_REGULAR_PRICE => 450,
	),
	$category_programming['term_id']
);
$design_section = $design->add_section( array( 'section_name' => 'Module 1: Introduction' ) );
$design_preview = yallapp_seed_lesson( $design_section, 'What is UI design?', '<p>Preview lesson.</p>', true );
$design_locked  = yallapp_seed_lesson( $design_section, 'Designer tools', '<p>Locked lesson.</p>' );
yallapp_seed_refresh( $design->get_id() );

// Course 3: free, no content yet.
$english = yallapp_seed_course( 'Business English for Beginners', '', array(), $category_languages['term_id'] );
yallapp_seed_refresh( $english->get_id() );

update_option(
	'yallapp_seed_ids',
	array(
		'python'         => $python->get_id(),
		'design'         => $design->get_id(),
		'english'        => $english->get_id(),
		'lesson_video'   => $lesson_video,
		'lesson_html'    => $lesson_html,
		'lesson_script'  => $lesson_script,
		'quiz'           => $quiz->get_id(),
		'design_preview' => $design_preview,
		'design_locked'  => $design_locked,
		'instructor'     => $instructor_id,
		'expect'         => array(
			'video'       => null,
			'paid'        => true,
			'qna'         => false,
			'free_orders' => true,
		),
	)
);

echo "Seeded.\n";
