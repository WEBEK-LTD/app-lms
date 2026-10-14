<?php
/**
 * Seeds the dev site with the same courses as seed.php, built with MasterStudy LMS's
 * curriculum repositories.
 * Run with: wp eval-file seed-masterstudy.php
 *
 * yallapp_seed_ids keys: python, design, english, lesson_video, lesson_html, lesson_script,
 * quiz, design_preview, design_locked, instructor, and `expect` for adapter-test.php.
 * The Python quiz follows "Lesson 3" in the same section. "UI Design Fundamentals" costs
 * 450 and is sold with MasterStudy's own checkout. Reviews wait for approval, as
 * MasterStudy holds them.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

use MasterStudy\Lms\Repositories\CurriculumMaterialRepository;
use MasterStudy\Lms\Repositories\CurriculumSectionRepository;

wp_set_current_user( 1 );

$category_programming = wp_insert_term( 'Programming', 'stm_lms_course_taxonomy' );
$category_languages   = wp_insert_term( 'Languages', 'stm_lms_course_taxonomy' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => 'stm_lms_instructor',
	)
);
$GLOBALS['yallapp_seed_instructor'] = $instructor_id;

/**
 * Creates a published post and returns its ID.
 *
 * @param array $args Post fields.
 * @param array $meta Post meta.
 * @return int
 */
function yallapp_seed_post( array $args, array $meta = array() ) {
	$post_id = (int) wp_insert_post(
		array_merge(
			array(
				'post_status' => 'publish',
				'post_author' => $GLOBALS['yallapp_seed_instructor'],
			),
			$args
		)
	);
	foreach ( $meta as $key => $value ) {
		update_post_meta( $post_id, $key, $value );
	}
	return $post_id;
}

/**
 * Creates a course.
 *
 * @param string $title   Title.
 * @param string $content Description.
 * @param int    $term    Category term ID.
 * @param float  $price   Price; 0 for a free course.
 * @return int
 */
function yallapp_seed_course( $title, $content, $term, $price = 0.0 ) {
	$course_id = yallapp_seed_post(
		array(
			'post_type'    => 'stm-courses',
			'post_title'   => $title,
			'post_content' => $content,
		),
		array(
			'level' => 'beginner',
			'price' => $price > 0 ? $price : '',
		)
	);
	wp_set_object_terms( $course_id, array( (int) $term ), 'stm_lms_course_taxonomy' );
	return $course_id;
}

/**
 * Creates a section with its materials, in order.
 *
 * @param int    $course_id Course ID.
 * @param string $title     Section title.
 * @param int[]  $items     Lesson and quiz IDs.
 * @return void
 */
function yallapp_seed_section( $course_id, $title, array $items ) {
	$section = ( new CurriculumSectionRepository() )->create(
		array(
			'title'     => $title,
			'course_id' => $course_id,
			'order'     => 1,
		)
	);
	foreach ( $items as $order => $post_id ) {
		( new CurriculumMaterialRepository() )->create(
			array(
				'post_id'    => $post_id,
				'section_id' => $section->id,
				'order'      => $order + 1,
			)
		);
	}
}

/**
 * Creates a lesson.
 *
 * @param string $title   Title.
 * @param string $content Content.
 * @param array  $meta    Lesson settings.
 * @return int
 */
function yallapp_seed_lesson( $title, $content, array $meta = array() ) {
	return yallapp_seed_post(
		array(
			'post_type'    => 'stm-lessons',
			'post_title'   => $title,
			'post_content' => $content,
		),
		array_merge( array( 'type' => 'text' ), $meta )
	);
}

/**
 * Creates a question.
 *
 * @param string $type    single_choice, multi_choice or true_false.
 * @param string $title   Question.
 * @param array  $answers Answer text => is correct.
 * @return int
 */
function yallapp_seed_question( $type, $title, array $answers ) {
	$stored = array();
	foreach ( $answers as $text => $correct ) {
		$stored[] = array(
			'text'   => (string) $text,
			'isTrue' => $correct,
		);
	}
	return yallapp_seed_post(
		array(
			'post_type'  => 'stm-questions',
			'post_title' => $title,
		),
		array(
			'type'    => $type,
			'answers' => $stored,
		)
	);
}

// Course 1: free, with video, HTML/code/iframe lessons and a quiz.
$python       = yallapp_seed_course( 'Python Programming Basics', '<p>Learn Python from zero.</p>', $category_programming['term_id'] );
$lesson_video = yallapp_seed_lesson(
	'Lesson 1: Welcome',
	'<p>Watch the welcome video.</p>',
	array(
		'type'               => 'video',
		'video_type'         => 'youtube',
		'lesson_youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	)
);
$lesson_html   = yallapp_seed_lesson(
	'Lesson 2: Writing your first function',
	'<p>A function is a reusable block of code.</p>'
		. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
		. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
		. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>'
);
$lesson_script = yallapp_seed_lesson(
	'Lesson 3: Interactive widget',
	'<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>'
);
$questions     = array(
	yallapp_seed_question(
		'true_false',
		'Python is case sensitive.',
		array(
			'True'  => true,
			'False' => false,
		)
	),
	yallapp_seed_question(
		'single_choice',
		'Which keyword is used to define a function in Python?',
		array(
			'function' => false,
			'def'      => true,
			'fun'      => false,
		)
	),
	yallapp_seed_question(
		'multi_choice',
		'Which of these are Python data types?',
		array(
			'list'    => true,
			'dict'    => true,
			'pointer' => false,
		)
	),
);
$quiz          = yallapp_seed_post(
	array(
		'post_type'  => 'stm-quizzes',
		'post_title' => 'Module 1 quiz',
	),
	array(
		'questions'        => implode( ',', $questions ),
		'passing_grade'    => 60,
		'duration'         => 10,
		'duration_measure' => 'minutes',
		'random_questions' => '',
		're_take_cut'      => '',
	)
);
yallapp_seed_section( $python, 'Module 1: Getting started', array( $lesson_video, $lesson_html, $lesson_script, $quiz ) );

// Course 2: paid with MasterStudy's checkout, one free preview lesson.
$design         = yallapp_seed_course( 'UI Design Fundamentals', '<p>Design interfaces people love.</p>', $category_programming['term_id'], 450 );
$design_preview = yallapp_seed_lesson( 'What is UI design?', '<p>Preview lesson.</p>', array( 'preview' => 'on' ) );
$design_locked  = yallapp_seed_lesson( 'Designer tools', '<p>Locked lesson.</p>' );
yallapp_seed_section( $design, 'Module 1: Introduction', array( $design_preview, $design_locked ) );

// Course 3: free, no content yet.
$english = yallapp_seed_course( 'Business English for Beginners', '', $category_languages['term_id'] );

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
		'instructor'     => $instructor_id,
		'expect'         => array(
			'video'             => 'youtube',
			'paid'              => true,
			'qna'               => false,
			'free_orders'       => false,
			'certificate'       => false,
			'reviews_moderated' => true,
		),
	)
);

echo "Seeded.\n";
