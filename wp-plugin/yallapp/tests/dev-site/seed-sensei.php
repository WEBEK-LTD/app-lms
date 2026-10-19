<?php
/**
 * Seeds the dev site with the same courses as seed.php, built with Sensei LMS's course
 * structure and quiz functions.
 * Run with: wp eval-file seed-sensei.php
 *
 * yallapp_seed_ids keys: python, design, english, lesson_video, lesson_html, lesson_script,
 * quiz, design_preview, design_locked, instructor, and `expect` for adapter-test.php.
 * In Sensei a quiz belongs to a lesson: the Python quiz is attached to "Lesson 3" and has to
 * be passed to complete it. Sensei sells courses only with Sensei Pro, so every course here
 * is free to join.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

wp_set_current_user( 1 );

$category_programming = wp_insert_term( 'Programming', 'course-category' );
$category_languages   = wp_insert_term( 'Languages', 'course-category' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => 'teacher',
	)
);
$GLOBALS['yallapp_seed_instructor'] = $instructor_id;

/**
 * Creates a published post and returns its ID.
 *
 * @param array $args Post fields.
 * @return int
 */
function yallapp_seed_post( array $args ) {
	return (int) wp_insert_post(
		array_merge(
			array(
				'post_status' => 'publish',
				'post_author' => $GLOBALS['yallapp_seed_instructor'],
			),
			$args
		)
	);
}

/**
 * Creates a course.
 *
 * @param string $title   Title.
 * @param string $content Description.
 * @param int    $term    Category term ID.
 * @return int
 */
function yallapp_seed_course( $title, $content, $term ) {
	$course_id = yallapp_seed_post(
		array(
			'post_type'    => 'course',
			'post_title'   => $title,
			'post_content' => $content,
		)
	);
	wp_set_object_terms( $course_id, array( (int) $term ), 'course-category' );
	return $course_id;
}

/**
 * Creates a lesson of a course.
 *
 * @param int    $course_id Course ID.
 * @param string $title     Title.
 * @param string $content   Content.
 * @param bool   $preview   Free preview.
 * @return int
 */
function yallapp_seed_lesson( $course_id, $title, $content, $preview = false ) {
	$lesson_id = yallapp_seed_post(
		array(
			'post_type'    => 'lesson',
			'post_title'   => $title,
			'post_content' => $content,
		)
	);
	update_post_meta( $lesson_id, '_lesson_course', $course_id );
	if ( $preview ) {
		update_post_meta( $lesson_id, '_lesson_preview', 'preview' );
	}
	return $lesson_id;
}

/**
 * Puts lessons in one module of a course, in order, with Sensei's course structure.
 *
 * @param int    $course_id Course ID.
 * @param string $module    Module title.
 * @param int[]  $lessons   Lesson IDs.
 * @return void
 */
function yallapp_seed_structure( $course_id, $module, array $lessons ) {
	$items = array();
	foreach ( $lessons as $lesson_id ) {
		$items[] = array(
			'type'  => 'lesson',
			'id'    => $lesson_id,
			'title' => get_the_title( $lesson_id ),
		);
	}
	$result = Sensei_Course_Structure::instance( $course_id )->save(
		array(
			array(
				'type'        => 'module',
				'id'          => null,
				'title'       => $module,
				'description' => '',
				'lessons'     => $items,
			),
		)
	);
	if ( true !== $result ) {
		WP_CLI::error( 'Could not save the course structure: ' . ( is_wp_error( $result ) ? $result->get_error_message() : 'unknown error' ) );
	}
}

// Course 1: free, with video, HTML/code/iframe lessons and a quiz.
$python       = yallapp_seed_course( 'Python Programming Basics', '<p>Learn Python from zero.</p>', $category_programming['term_id'] );
$lesson_video = yallapp_seed_lesson( $python, 'Lesson 1: Welcome', '<p>Watch the welcome video.</p>' );
update_post_meta( $lesson_video, '_lesson_video_embed', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' );
$lesson_html   = yallapp_seed_lesson(
	$python,
	'Lesson 2: Writing your first function',
	'<p>A function is a reusable block of code.</p>'
		. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
		. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
		. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>'
);
$lesson_script = yallapp_seed_lesson(
	$python,
	'Lesson 3: Interactive widget',
	'<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>'
);
yallapp_seed_structure( $python, 'Module 1: Getting started', array( $lesson_video, $lesson_html, $lesson_script ) );

$quiz = yallapp_seed_post(
	array(
		'post_type'   => 'quiz',
		'post_title'  => 'Module 1 quiz',
		'post_parent' => $lesson_script,
	)
);
update_post_meta( $quiz, '_quiz_lesson', $lesson_script );
update_post_meta( $lesson_script, '_lesson_quiz', $quiz );
update_post_meta( $quiz, '_quiz_grade_type', 'auto' );
update_post_meta( $quiz, '_pass_required', 'on' );
update_post_meta( $quiz, '_quiz_passmark', 60 );
update_post_meta( $quiz, '_enable_quiz_reset', 'on' );

/**
 * Creates a question.
 *
 * @param string          $type  multiple-choice or boolean.
 * @param string          $title Question.
 * @param string|string[] $right Right answer(s).
 * @param string[]        $wrong Wrong answers, shown after the right ones.
 * @return int Question ID.
 */
function yallapp_seed_question( $type, $title, $right, array $wrong = array() ) {
	$question_id = yallapp_seed_post(
		array(
			'post_type'  => 'question',
			'post_title' => $title,
		)
	);
	wp_set_object_terms( $question_id, array( $type ), 'question-type' );
	update_post_meta( $question_id, '_question_grade', 1 );
	update_post_meta( $question_id, '_question_right_answer', $right );
	if ( 'multiple-choice' === $type ) {
		update_post_meta( $question_id, '_question_wrong_answers', $wrong );
		update_post_meta( $question_id, '_random_order', 'no' );
		update_post_meta( $question_id, '_answer_order', implode( ',', array_map( array( Sensei()->lesson, 'get_answer_id' ), array_merge( (array) $right, $wrong ) ) ) );
	}
	return $question_id;
}

Sensei()->quiz->set_questions(
	$quiz,
	array(
		yallapp_seed_question( 'boolean', 'Python is case sensitive.', 'true' ),
		yallapp_seed_question( 'multiple-choice', 'Which keyword is used to define a function in Python?', array( 'def' ), array( 'function', 'fun' ) ),
		yallapp_seed_question( 'multiple-choice', 'Which of these are Python data types?', array( 'list', 'dict' ), array( 'pointer' ) ),
	)
);

// Course 2: one free preview lesson; Sensei without Sensei Pro doesn't sell it.
$design         = yallapp_seed_course( 'UI Design Fundamentals', '<p>Design interfaces people love.</p>', $category_programming['term_id'] );
$design_preview = yallapp_seed_lesson( $design, 'What is UI design?', '<p>Preview lesson.</p>', true );
$design_locked  = yallapp_seed_lesson( $design, 'Designer tools', '<p>Locked lesson.</p>' );
yallapp_seed_structure( $design, 'Module 1: Introduction', array( $design_preview, $design_locked ) );

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
			'video'           => 'youtube',
			'paid'            => false,
			'qna'             => false,
			'free_orders'     => false,
			'certificate'     => false,
			// 50 Sensei counts no one as enrolled in a course that isn't published.
			'private_courses' => false,
		),
	)
);

echo "Seeded.\n";
