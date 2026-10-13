<?php
/**
 * Seeds the dev site with the same courses as seed.php, stored the way LearnDash stores
 * them: settings through learndash_update_setting(), the course builder's steps tree and
 * section headings through LDLMS_Course_Steps, and a quiz with its WpProQuiz quiz and
 * question posts.
 * Run with: wp eval-file seed-learndash.php (setup.sh does, with LMS=learndash).
 *
 * yallapp_seed_ids keys: python, design, english, lesson_video, lesson_html, lesson_script,
 * quiz, design_preview, design_locked, design_topic, instructor, certificate, and `expect`
 * for adapter-test.php. "Module 1 quiz" is a course quiz of Python Programming Basics and
 * is taken on LearnDash's quiz page; `website_quiz` is the PHP the checks run to stand in
 * for the student finishing it there (LearnDash's own "mark quiz complete"), since
 * WpProQuiz's tables don't work on the SQLite dev site. "UI Design Fundamentals" is sold
 * with LearnDash's "Buy now" price type, and "Designer tools" has a topic.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

wp_set_current_user( 1 );

LearnDash_Settings_Section::set_section_setting( 'LearnDash_Settings_Section_Payments_Defaults', 'currency', 'TRY' );

$category_programming = wp_insert_term( 'Programming', 'ld_course_category' );
$category_languages   = wp_insert_term( 'Languages', 'ld_course_category' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => 'author',
	)
);
$GLOBALS['yallapp_seed_instructor'] = $instructor_id;

/**
 * Creates a published post with LearnDash settings and returns its ID.
 *
 * @param array $args     Post fields.
 * @param array $settings LearnDash settings (names without the post type prefix).
 * @return int
 */
function yallapp_seed_post( array $args, array $settings = array() ) {
	$post_id = (int) wp_insert_post(
		array_merge(
			array(
				'post_status' => 'publish',
				'post_author' => $GLOBALS['yallapp_seed_instructor'],
			),
			$args
		)
	);
	foreach ( $settings as $key => $value ) {
		learndash_update_setting( $post_id, $key, $value );
	}
	return $post_id;
}

/**
 * Creates a course.
 *
 * @param string $title    Title.
 * @param string $content  Description.
 * @param int    $term     Category term ID.
 * @param array  $settings Course settings.
 * @return int
 */
function yallapp_seed_course( $title, $content, $term, array $settings ) {
	$course_id = yallapp_seed_post(
		array(
			'post_type'    => 'sfwd-courses',
			'post_title'   => $title,
			'post_content' => $content,
		),
		$settings
	);
	wp_set_object_terms( $course_id, array( (int) $term ), 'ld_course_category' );
	return $course_id;
}

/**
 * Creates a lesson, topic or quiz of a course, as the course builder does: its primary course
 * is the course it was created in.
 *
 * @param string $type      sfwd-lessons, sfwd-topic or sfwd-quiz.
 * @param int    $course_id Course ID.
 * @param string $title     Title.
 * @param string $content   Content.
 * @param array  $settings  Step settings.
 * @return int
 */
function yallapp_seed_step( $type, $course_id, $title, $content = '', array $settings = array() ) {
	return yallapp_seed_post(
		array(
			'post_type'    => $type,
			'post_title'   => $title,
			'post_content' => $content,
		),
		array_merge( array( 'course' => $course_id ), $settings )
	);
}

/**
 * Saves a course's steps tree and section headings with the course builder's model.
 *
 * @param int   $course_id Course ID.
 * @param array $tree      Steps tree ('h' format), with 'section-heading' when it has sections.
 * @return void
 */
function yallapp_seed_steps( $course_id, array $tree ) {
	LDLMS_Factory_Post::course_steps( $course_id )->set_steps( $tree );
}

$certificate = yallapp_seed_post(
	array(
		'post_type'    => 'sfwd-certificates',
		'post_title'   => 'Course certificate',
		'post_content' => '<p>This certifies that [usermeta field="display_name"] completed [courseinfo show="course_title"].</p>',
	)
);

// Course 1: free, with video, HTML/code/iframe lessons, a course quiz and a certificate.
$python       = yallapp_seed_course(
	'Python Programming Basics',
	'<p>Learn Python from zero.</p>',
	$category_programming['term_id'],
	array(
		'course_price_type'                 => 'free',
		'course_disable_lesson_progression' => 'on',
		'certificate'                       => $certificate,
	)
);
$lesson_video = yallapp_seed_step(
	'sfwd-lessons',
	$python,
	'Lesson 1: Welcome',
	'<p>Watch the welcome video.</p>',
	array(
		'lesson_video_enabled' => 'on',
		'lesson_video_url'     => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		'lesson_video_shown'   => 'BEFORE',
	)
);
$lesson_html   = yallapp_seed_step(
	'sfwd-lessons',
	$python,
	'Lesson 2: Writing your first function',
	'<p>A function is a reusable block of code.</p>'
		. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
		. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
		. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>'
);
$lesson_script = yallapp_seed_step(
	'sfwd-lessons',
	$python,
	'Lesson 3: Interactive widget',
	'<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>'
);

// The quiz: a WpProQuiz quiz, as the course builder creates one, and three question posts.
$quiz_pro = new WpProQuiz_Model_Quiz();
$quiz_pro->setName( 'Module 1 quiz' );
$quiz_pro->setText( 'AAZZAAZZ' );
$quiz_pro = ( new WpProQuiz_Model_QuizMapper() )->save( $quiz_pro );
$quiz     = yallapp_seed_step(
	'sfwd-quiz',
	$python,
	'Module 1 quiz',
	'',
	array(
		'quiz_pro'          => (int) $quiz_pro->getId(),
		'passingpercentage' => 60,
	)
);
update_post_meta( $quiz, 'quiz_pro_id', (int) $quiz_pro->getId() );
$questions = array();
foreach ( array( 'Python is case sensitive.', 'Which keyword is used to define a function in Python?', 'Which of these are Python data types?' ) as $index => $title ) {
	$question_id = yallapp_seed_post(
		array(
			'post_type'  => 'sfwd-question',
			'post_title' => $title,
			'menu_order' => $index,
		)
	);
	update_post_meta( $question_id, 'quiz_id', $quiz );
	// WpProQuiz keeps the answers in its own question table, which SQLite can't create.
	update_post_meta( $question_id, 'question_pro_id', $index + 1 );
	$questions[ $question_id ] = $index + 1;
}
update_post_meta( $quiz, 'ld_quiz_questions', $questions );

yallapp_seed_steps(
	$python,
	array(
		'sfwd-lessons'    => array(
			$lesson_video  => array(
				'sfwd-topic' => array(),
				'sfwd-quiz'  => array(),
			),
			$lesson_html   => array(
				'sfwd-topic' => array(),
				'sfwd-quiz'  => array(),
			),
			$lesson_script => array(
				'sfwd-topic' => array(),
				'sfwd-quiz'  => array(),
			),
		),
		'sfwd-quiz'       => array( $quiz => array() ),
		'section-heading' => array(
			array(
				'order'      => 0,
				'ID'         => 1700000000001,
				'post_title' => 'Module 1: Getting started',
				'type'       => 'section-heading',
			),
		),
	)
);

// Course 2: sold with "Buy now"; one sample lesson, and a lesson with a topic.
$design         = yallapp_seed_course(
	'UI Design Fundamentals',
	'<p>Design interfaces people love.</p>',
	$category_programming['term_id'],
	array(
		'course_price_type' => 'paynow',
		'course_price'      => '450',
	)
);
$design_preview = yallapp_seed_step( 'sfwd-lessons', $design, 'What is UI design?', '<p>Preview lesson.</p>', array( 'sample_lesson' => 'on' ) );
$design_locked  = yallapp_seed_step( 'sfwd-lessons', $design, 'Designer tools', '<p>Locked lesson.</p>' );
$design_topic   = yallapp_seed_step( 'sfwd-topic', $design, 'Figma basics', '<p>Frames and components.</p>', array( 'lesson' => $design_locked ) );
yallapp_seed_steps(
	$design,
	array(
		'sfwd-lessons' => array(
			$design_preview => array(
				'sfwd-topic' => array(),
				'sfwd-quiz'  => array(),
			),
			$design_locked  => array(
				'sfwd-topic' => array( $design_topic => array( 'sfwd-quiz' => array() ) ),
				'sfwd-quiz'  => array(),
			),
		),
	)
);

// Course 3: free, no content yet.
$english = yallapp_seed_course( 'Business English for Beginners', '', $category_languages['term_id'], array( 'course_price_type' => 'free' ) );

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
		'design_topic'   => $design_topic,
		'instructor'     => $instructor_id,
		'certificate'    => $certificate,
		'website_quiz'   => 'learndash_process_user_course_progress_update( %1$d, array( "quiz" => array( ' . $python . ' => array( ' . $quiz . ' => 1 ) ) ) );',
		'expect'         => array(
			'video'           => 'youtube',
			'paid'            => true,
			'qna'             => false,
			'free_orders'     => false,
			'certificate'     => true,
			'quiz_on_website' => true,
		),
	)
);

echo "Seeded.\n";
