<?php
/**
 * LMS integration contract.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;

/**
 * What the REST layer needs from an LMS. Methods return data already shaped like the
 * API contract (docs/api/openapi.yaml), so every LMS looks the same to the app.
 */
interface Lms_Adapter {

	/**
	 * Machine name, e.g. "tutor".
	 *
	 * @return string
	 */
	public function id();

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version();

	/**
	 * Whether the LMS's paid edition is active.
	 *
	 * @return bool
	 */
	public function is_pro();

	/**
	 * Feature flags: certificates, quizzes, wishlist, reviews, qna.
	 *
	 * @return array<string, bool>
	 */
	public function features();

	/**
	 * Connects the LMS's own events to the plugin's notifications, so they fire whether the
	 * student acts on the website or in the app. Called once when the plugin boots.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID) after a student is enrolled.
	 * @param callable $on_answered Called with (question ID, asker's user ID, course ID, replier's user ID)
	 *                              after someone who teaches the course replies to a question.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered );

	/**
	 * Post types holding lessons and quizzes, used to resolve courses from content.
	 *
	 * @return array{course: string, lesson: string, quiz: string, announcement: string}
	 */
	public function post_types();

	/**
	 * Course categories.
	 *
	 * @return array[] Category shapes.
	 */
	public function categories();

	/**
	 * Lists courses.
	 *
	 * @param array $args    page, per_page, search, category, price (all|free|paid), orderby (newest|popular|title), ids.
	 * @param int   $user_id Current user, or 0.
	 * @return array{items: array[], total: int} CourseSummary shapes.
	 */
	public function courses( array $args, $user_id );

	/**
	 * Course details without the platform-dependent purchase action.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user, or 0.
	 * @return array|null CourseDetail shape minus `purchase`, plus `has_checkout` (bool).
	 */
	public function course( $course_id, $user_id );

	/**
	 * Topics and their items.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user, or 0.
	 * @return array[]|null Topic shapes.
	 */
	public function curriculum( $course_id, $user_id );

	/**
	 * 50 Whether a user may see and open a course: a published one, or a private one they are
	 * enrolled in or may read on the website (Course_Visibility).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID, or 0.
	 * @return bool
	 */
	public function course_visible( $course_id, $user_id );

	/**
	 * Whether a user is enrolled.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id );

	/**
	 * Whether a course is free.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id );

	/**
	 * Enrolls a user in a free course.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error Enrollment shape.
	 */
	public function enroll_free( $course_id, $user_id );

	/**
	 * Enrolled courses.
	 *
	 * @param int    $user_id  User ID.
	 * @param string $status   in_progress|completed.
	 * @param int    $page     Page.
	 * @param int    $per_page Page size.
	 * @return array{items: array[], total: int} MyCourse shapes.
	 */
	public function my_courses( $user_id, $status, $page, $per_page );

	/**
	 * Wishlisted courses.
	 *
	 * @param int $user_id User ID.
	 * @return array[] CourseSummary shapes.
	 */
	public function wishlist( $user_id );

	/**
	 * Adds or removes a course from the wishlist.
	 *
	 * @param int  $user_id   User ID.
	 * @param int  $course_id Course ID.
	 * @param bool $on        Add when true.
	 * @return true|WP_Error
	 */
	public function set_wishlist( $user_id, $course_id, $on );

	/**
	 * Raw lesson data for the content renderer.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user, or 0.
	 * @return array|null id, course_id, title, content, video (raw), attachments, preview, completed, previous_id, next_id.
	 */
	public function lesson( $lesson_id, $user_id );

	/**
	 * Whether a user may open a lesson.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID, or 0.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id );

	/**
	 * Marks a lesson complete.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error Progress shape.
	 */
	public function complete_lesson( $lesson_id, $user_id );

	/**
	 * Course progress.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array Progress shape.
	 */
	public function progress( $course_id, $user_id );

	/**
	 * Quiz details.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return array|WP_Error Quiz shape.
	 */
	public function quiz( $quiz_id, $user_id );

	/**
	 * Starts a quiz attempt.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return array|WP_Error Attempt shape.
	 */
	public function start_attempt( $quiz_id, $user_id );

	/**
	 * Grades and ends an attempt.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error AttemptResult shape.
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers );

	/**
	 * Finished attempts.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int} AttemptResult shapes.
	 */
	public function attempts( $user_id, $page, $per_page );

	/**
	 * Certificates the user has earned.
	 *
	 * @param int $user_id User ID.
	 * @return array[] Certificate shapes.
	 */
	public function certificates( $user_id );

	/**
	 * Where the website sells the course.
	 *
	 * @param int $course_id Course ID.
	 * @return string URL on this site.
	 */
	public function checkout_url( $course_id );

	/**
	 * The course a lesson, quiz or topic belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id );

	/**
	 * Users enrolled in a course.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id );

	/**
	 * Courses a user is enrolled in.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id );

	/**
	 * Whether the site sells courses, so students have orders.
	 *
	 * @return bool
	 */
	public function sells_courses();

	/**
	 * The user's orders, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int} Order shapes.
	 */
	public function orders( $user_id, $page, $per_page );

	/**
	 * Approved reviews of a course, newest first, and the rating summary.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user, or 0 (marks their own review as `mine`).
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int, summary: array} Review shapes and a RatingSummary shape.
	 */
	public function reviews( $course_id, $user_id, $page, $per_page );

	/**
	 * The user's own review of a course, approved or not.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|null Review shape.
	 */
	public function my_review( $course_id, $user_id );

	/**
	 * Writes or edits the user's review. The caller checks enrollment.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param int    $rating    1 to 5.
	 * @param string $text      Review text, may be empty.
	 * @return array|WP_Error Review shape.
	 */
	public function save_review( $course_id, $user_id, $rating, $text );

	/**
	 * Whether students can ask questions in this course (the site setting and the course's own).
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function qna_enabled( $course_id );

	/**
	 * A course's questions, newest first, without answers.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int} CourseQuestion shapes.
	 */
	public function questions( $course_id, $user_id, $page, $per_page );

	/**
	 * A question with its answers, oldest answer first.
	 *
	 * @param int $question_id Question ID.
	 * @param int $user_id     Current user.
	 * @return array|null CourseQuestionThread shape, with course_id.
	 */
	public function question( $question_id, $user_id );

	/**
	 * Asks a question. The caller checks access.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param string $text      Question.
	 * @return array|WP_Error CourseQuestion shape.
	 */
	public function ask( $course_id, $user_id, $text );

	/**
	 * Replies to a question. The caller checks access.
	 *
	 * @param int    $question_id Question ID.
	 * @param int    $user_id     User ID.
	 * @param string $text        Reply.
	 * @return array|WP_Error QuestionAnswer shape.
	 */
	public function answer( $question_id, $user_id, $text );
}
