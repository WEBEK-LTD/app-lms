<?php
/**
 * Seeds the dev site with the same courses as seed.php, built with LifterLMS's models.
 * Run with: wp eval-file seed-lifterlms.php
 *
 * yallapp_seed_ids keys: python, design, english, lesson_video, lesson_html, lesson_script,
 * quiz, design_preview, design_locked, instructor, and `expect` for adapter-test.php.
 * In LifterLMS a quiz belongs to a lesson: the Python quiz is attached to "Lesson 3".
 * Free courses have a free access plan; "UI Design Fundamentals" has a 450 one-time plan
 * sold with LifterLMS's manual payment gateway, which the seed turns on.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride -- Test fixture.

wp_set_current_user( 1 );
update_option( 'llms_gateway_manual_enabled', 'yes' );

$category_programming = wp_insert_term( 'Programming', 'course_cat' );
$category_languages   = wp_insert_term( 'Languages', 'course_cat' );

$instructor_id = wp_insert_user(
	array(
		'user_login'   => 'instructor',
		'user_pass'    => 'instructor',
		'user_email'   => 'instructor@example.org',
		'display_name' => 'Ayse Demir',
		'role'         => 'instructor',
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
 * Creates a course with an access plan.
 *
 * @param string $title   Title.
 * @param string $content Description.
 * @param int    $term    Category term ID.
 * @param float  $price   Plan price; 0 for a free plan.
 * @return LLMS_Course
 */
function yallapp_seed_course( $title, $content, $term, $price ) {
	$course = new LLMS_Course(
		yallapp_seed_post(
			array(
				'post_type'    => 'course',
				'post_title'   => $title,
				'post_content' => $content,
			)
		)
	);
	wp_set_object_terms( $course->get( 'id' ), array( (int) $term ), 'course_cat' );
	$course->instructors()->set_instructors( array( array( 'id' => $GLOBALS['yallapp_seed_instructor'] ) ) );

	$plan = new LLMS_Access_Plan(
		yallapp_seed_post(
			array(
				'post_type'  => 'llms_access_plan',
				'post_title' => $price > 0 ? 'Lifetime access' : 'Free',
			)
		)
	);
	$plan->set( 'product_id', $course->get( 'id' ) );
	$plan->set( 'is_free', $price > 0 ? 'no' : 'yes' );
	$plan->set( 'price', $price );
	$plan->set( 'frequency', 0 );
	$plan->set( 'access_expiration', 'lifetime' );
	$plan->set( 'availability', 'open' );
	$plan->set( 'on_sale', 'no' );
	$plan->set( 'trial_offer', 'no' );
	$plan->set_visibility( 'visible' );
	return $course;
}

/**
 * Creates a section.
 *
 * @param LLMS_Course $course Course.
 * @param string      $title  Title.
 * @return LLMS_Section
 */
function yallapp_seed_section( LLMS_Course $course, $title ) {
	$section = new LLMS_Section(
		yallapp_seed_post(
			array(
				'post_type'  => 'section',
				'post_title' => $title,
			)
		)
	);
	$section->set( 'parent_course', $course->get( 'id' ) );
	$section->set( 'order', 1 );
	return $section;
}

/**
 * Creates a lesson in a section.
 *
 * @param LLMS_Section $section Section.
 * @param string       $title   Title.
 * @param string       $content Content.
 * @param int          $order   Order.
 * @param bool         $free    Free preview.
 * @return LLMS_Lesson
 */
function yallapp_seed_lesson( LLMS_Section $section, $title, $content, $order, $free = false ) {
	$lesson = new LLMS_Lesson(
		yallapp_seed_post(
			array(
				'post_type'    => 'lesson',
				'post_title'   => $title,
				'post_content' => $content,
			)
		)
	);
	$lesson->set( 'parent_course', $section->get( 'parent_course' ) );
	$lesson->set( 'parent_section', $section->get( 'id' ) );
	$lesson->set( 'order', $order );
	$lesson->set( 'free_lesson', $free ? 'yes' : 'no' );
	return $lesson;
}

// Course 1: free, with video, HTML/code/iframe lessons and a quiz.
$python = yallapp_seed_course( 'Python Programming Basics', '<p>Learn Python from zero.</p>', $category_programming['term_id'], 0 );
wp_set_object_terms( $python->get( 'id' ), array( 'Beginner' ), 'course_difficulty' );
$section = yallapp_seed_section( $python, 'Module 1: Getting started' );

$lesson_video = yallapp_seed_lesson( $section, 'Lesson 1: Welcome', '<p>Watch the welcome video.</p>', 1 );
$lesson_video->set( 'video_embed', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' );
$lesson_html   = yallapp_seed_lesson(
	$section,
	'Lesson 2: Writing your first function',
	'<p>A function is a reusable block of code.</p>'
		. '<pre><code class="language-python">def greet(name):' . "\n" . '    return f"Hello, {name}!"</code></pre>'
		. '<iframe style="border: none;" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen></iframe>'
		. '<iframe style="border: none;" src="https://alphaexam.site/the-alpha-genius-app/" width="100%" height="900"><span data-mce-type="bookmark" style="width: 0px; overflow: hidden; line-height: 0;" class="mce_SELRES_start"></span></iframe>',
	2
);
$lesson_script = yallapp_seed_lesson(
	$section,
	'Lesson 3: Interactive widget',
	'<div id="w"></div><script>document.getElementById("w").textContent="Hi";</script>',
	3
);

$quiz = new LLMS_Quiz(
	yallapp_seed_post(
		array(
			'post_type'  => 'llms_quiz',
			'post_title' => 'Module 1 quiz',
		)
	)
);
$quiz->set( 'lesson_id', $lesson_script->get( 'id' ) );
$quiz->set( 'passing_percent', 60 );
$quiz->set( 'limit_attempts', 'yes' );
$quiz->set( 'allowed_attempts', 5 );
$quiz->set( 'limit_time', 'yes' );
$quiz->set( 'time_limit', 10 );
$quiz->set( 'random_questions', 'no' );
$lesson_script->set( 'quiz', $quiz->get( 'id' ) );
$lesson_script->set( 'quiz_enabled', 'yes' );
$lesson_script->set( 'require_passing_grade', 'yes' );

/**
 * Adds a question with its choices to the quiz.
 *
 * @param LLMS_Quiz $quiz    Quiz.
 * @param string    $type    choice or true_false.
 * @param string    $title   Question.
 * @param array     $choices Choice => is correct.
 * @param bool      $multi   Several correct choices.
 * @return int Question ID.
 */
function yallapp_seed_question( LLMS_Quiz $quiz, $type, $title, array $choices, $multi = false ) {
	$question = new LLMS_Question( $quiz->questions()->create_question( array( 'post_title' => $title ) ) );
	$question->set( 'question_type', $type );
	$question->set( 'points', 1 );
	$question->set( 'multi_choices', $multi ? 'yes' : 'no' );
	foreach ( $choices as $choice => $correct ) {
		$question->create_choice(
			array(
				'choice'  => $choice,
				'correct' => $correct,
			)
		);
	}
	return $question->get( 'id' );
}

yallapp_seed_question(
	$quiz,
	'true_false',
	'Python is case sensitive.',
	array(
		'True'  => true,
		'False' => false,
	)
);
yallapp_seed_question(
	$quiz,
	'choice',
	'Which keyword is used to define a function in Python?',
	array(
		'function' => false,
		'def'      => true,
		'fun'      => false,
	)
);
yallapp_seed_question(
	$quiz,
	'choice',
	'Which of these are Python data types?',
	array(
		'list'    => true,
		'dict'    => true,
		'pointer' => false,
	),
	true
);

// Completing the Python course awards a certificate, through a LifterLMS engagement.
$certificate = yallapp_seed_post(
	array(
		'post_type'    => 'llms_certificate',
		'post_title'   => 'Certificate of completion',
		'post_content' => '<p>{first_name} completed {site_title}.</p>',
	)
);
$engagement  = yallapp_seed_post(
	array(
		'post_type'  => 'llms_engagement',
		'post_title' => 'Python certificate',
	)
);
update_post_meta( $engagement, '_llms_trigger_type', 'course_completed' );
update_post_meta( $engagement, '_llms_engagement_type', 'certificate' );
update_post_meta( $engagement, '_llms_engagement', $certificate );
update_post_meta( $engagement, '_llms_engagement_trigger_post', $python->get( 'id' ) );
update_post_meta( $engagement, '_llms_engagement_delay', 0 );

// Course 2: paid with LifterLMS's checkout, one free preview lesson.
$design         = yallapp_seed_course( 'UI Design Fundamentals', '<p>Design interfaces people love.</p>', $category_programming['term_id'], 450 );
$design_section = yallapp_seed_section( $design, 'Module 1: Introduction' );
$design_preview = yallapp_seed_lesson( $design_section, 'What is UI design?', '<p>Preview lesson.</p>', 1, true );
$design_locked  = yallapp_seed_lesson( $design_section, 'Designer tools', '<p>Locked lesson.</p>', 2 );

// Course 3: free, no content yet.
$english = yallapp_seed_course( 'Business English for Beginners', '', $category_languages['term_id'], 0 );

update_option(
	'yallapp_seed_ids',
	array(
		'python'         => $python->get( 'id' ),
		'design'         => $design->get( 'id' ),
		'english'        => $english->get( 'id' ),
		'lesson_video'   => $lesson_video->get( 'id' ),
		'lesson_html'    => $lesson_html->get( 'id' ),
		'lesson_script'  => $lesson_script->get( 'id' ),
		'quiz'           => $quiz->get( 'id' ),
		'design_preview' => $design_preview->get( 'id' ),
		'design_locked'  => $design_locked->get( 'id' ),
		'instructor'     => $instructor_id,
		'expect'         => array(
			'video'       => 'youtube',
			'paid'        => true,
			'qna'         => false,
			'free_orders' => true,
			'certificate' => true,
		),
	)
);

echo "Seeded.\n";
