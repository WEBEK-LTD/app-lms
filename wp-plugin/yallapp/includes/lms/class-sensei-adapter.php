<?php
/**
 * Sensei LMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use Sensei_Course;
use Sensei_Course_Enrolment;
use Sensei_Course_Structure;
use Sensei_Learner;
use Sensei_Lesson;
use Sensei_Quiz;
use Sensei_Utils;
use WP_Error;
use WP_Post;
use WP_Query;
use Yallapp\Commerce\Woo_Orders;

/**
 * Sensei LMS 4.0.0 and later; the end-to-end checks run against 4.26.4. Uses Sensei's own
 * enrollment, lesson completion and quiz grading, so its emails, course completion and
 * reports work as on the website.
 *
 * Sensei keeps only a student's latest quiz submission, so the plugin records each graded
 * submission (from the app or the website) in the student's user meta for the attempt
 * history. Retaking a quiz resets the earlier result first, as Sensei's "Restart Quiz"
 * button does, and is only possible when the quiz allows retakes.
 *
 * Courses are free unless self-enrollment is turned off or Sensei Pro sells them through
 * WooCommerce. Selling through Sensei Pro is supported but not covered by the end-to-end
 * checks, since Sensei Pro is a paid plugin. Sensei has no course reviews, wishlist or Q&A,
 * and its certificates come from an add-on, so certificates use the `yallapp_certificate_url`
 * filter.
 */
class Sensei_Adapter extends Base_Adapter {

	const NATIVE_QUESTION_TYPES = array( 'multiple-choice', 'boolean' );

	/** User meta with the quiz attempt history, oldest first. */
	const ATTEMPTS_META = 'yallapp_sensei_attempts';

	/** User meta with the attempt started in the app and not submitted yet. */
	const OPEN_ATTEMPT_META = 'yallapp_sensei_open_attempt';

	/** User meta with the last attempt number given out. */
	const ATTEMPT_SEQ_META = 'yallapp_sensei_attempt_seq';

	/** How many attempts the history keeps per student. */
	const MAX_ATTEMPTS = 200;

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'sensei';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'SENSEI_LMS_VERSION' ) ? (string) SENSEI_LMS_VERSION : '';
	}

	/**
	 * Whether Sensei Pro is active.
	 *
	 * @return bool
	 */
	public function is_pro() {
		return defined( 'SENSEI_PRO_VERSION' ) || defined( 'SENSEI_WC_PAID_COURSES_VERSION' );
	}

	/**
	 * Feature flags.
	 *
	 * @return array<string, bool>
	 */
	public function features() {
		return array(
			'certificates' => has_filter( 'yallapp_certificate_url' ),
			'quizzes'      => true,
			'wishlist'     => false,
			'reviews'      => false,
			'qna'          => false,
		);
	}

	/**
	 * Connects Sensei's enrollment hook, and records graded quiz submissions for the
	 * attempt history.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Unused: Sensei has no Q&A.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'sensei_course_enrolment_status_changed', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Sensei hook.
			static function ( $user_id, $course_id, $is_enrolled ) use ( $on_enrolled ) {
				if ( $is_enrolled ) {
					call_user_func( $on_enrolled, (int) $course_id, (int) $user_id );
				}
			},
			10,
			3
		);
		add_action( 'sensei_user_quiz_submitted', array( $this, 'record_submission' ), 10, 5 ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Sensei hook.
		add_action( 'sensei_user_quiz_grade', array( $this, 'record_grade' ), 10, 5 ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Sensei hook.
	}

	/**
	 * Post types.
	 *
	 * @return array{course: string, lesson: string, quiz: string, announcement: string}
	 */
	public function post_types() {
		return array(
			'course'       => 'course',
			'lesson'       => 'lesson',
			'quiz'         => 'quiz',
			'announcement' => '',
		);
	}

	/**
	 * Course categories.
	 *
	 * @return array[]
	 */
	public function categories() {
		return $this->terms( 'course-category' );
	}

	/**
	 * Lists courses. Paid means students can't enroll themselves.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, 'course', 'course-category' );
		$price      = $args['price'] ?? 'all';
		if ( 'free' === $price || 'paid' === $price ) {
			$paid = $this->paid_course_ids();
			if ( 'paid' === $price ) {
				$query_args['post__in'] = $paid ? ( isset( $query_args['post__in'] ) ? array_intersect( $query_args['post__in'], $paid ) : $paid ) : array( 0 );
			} else {
				$query_args['post__not_in'] = $paid; // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_post__not_in -- A handful of paid courses.
			}
		}
		$query = new WP_Query( $query_args );
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->summary( $post, $user_id );
		}
		return array(
			'items' => $items,
			'total' => (int) $query->found_posts,
		);
	}

	/**
	 * Course details.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	public function course( $course_id, $user_id ) {
		$post = $this->published( $course_id, 'course' );
		if ( ! $post ) {
			return null;
		}
		$product = $this->product( $post->ID );
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => self::video_from_value( (string) get_post_meta( $post->ID, '_course_video_embed', true ) ),
				'duration_minutes' => null,
				'level'            => null,
				'has_certificate'  => (bool) has_filter( 'yallapp_certificate_url' ),
				'categories'       => $this->terms( 'course-category', $post->ID ),
				'has_checkout'     => $product && $product->is_purchasable(),
				'qna'              => false,
			)
		);
	}

	/**
	 * Modules and their lessons, each lesson followed by its quiz. Lessons outside a module
	 * come last, as on the course page.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array[]|null
	 */
	public function curriculum( $course_id, $user_id ) {
		$post = $this->published( $course_id, 'course' );
		if ( ! $post ) {
			return null;
		}
		$topics = array();
		$loose  = array();
		foreach ( Sensei_Course_Structure::instance( $post->ID )->get( 'view' ) as $item ) {
			if ( 'module' === $item['type'] ) {
				$items = array();
				foreach ( $item['lessons'] as $lesson ) {
					$items = array_merge( $items, $this->lesson_items( (int) $lesson['id'], $user_id ) );
				}
				$topics[] = array(
					'id'    => (int) $item['id'],
					'title' => html_entity_decode( (string) $item['title'], ENT_QUOTES, 'UTF-8' ),
					'items' => $items,
				);
			} else {
				$loose = array_merge( $loose, $this->lesson_items( (int) $item['id'], $user_id ) );
			}
		}
		if ( $loose ) {
			$topics[] = array(
				'id'    => 0,
				'title' => $topics ? __( 'Other lessons', 'yallapp' ) : __( 'Lessons', 'yallapp' ),
				'items' => $loose,
			);
		}
		return $topics;
	}

	/**
	 * A lesson's curriculum item, and its quiz's when the quiz has questions.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user.
	 * @return array[]
	 */
	private function lesson_items( $lesson_id, $user_id ) {
		$lesson = $this->published( $lesson_id, 'lesson' );
		if ( ! $lesson ) {
			return array();
		}
		$preview = Sensei_Utils::is_preview_lesson( $lesson_id );
		$open    = $user_id > 0 && $this->can_view_lesson( $lesson_id, $user_id );
		$length  = (int) get_post_meta( $lesson_id, '_lesson_length', true );
		$items   = array(
			array(
				'id'               => $lesson_id,
				'type'             => 'lesson',
				'title'            => html_entity_decode( (string) $lesson->post_title, ENT_QUOTES, 'UTF-8' ),
				'duration_minutes' => $length > 0 ? $length : null,
				'question_count'   => null,
				'preview'          => $preview,
				'locked'           => ! ( $open || $preview ),
				'completed'        => $user_id > 0 && Sensei_Utils::user_completed_lesson( $lesson_id, $user_id ),
			),
		);
		$quiz    = $this->lesson_quiz( $lesson_id );
		if ( $quiz ) {
			$items[] = array(
				'id'               => (int) $quiz->ID,
				'type'             => 'quiz',
				'title'            => html_entity_decode( (string) $quiz->post_title, ENT_QUOTES, 'UTF-8' ),
				'duration_minutes' => null,
				'question_count'   => $this->question_count( $quiz->ID ),
				'preview'          => false,
				'locked'           => ! ( $open && ( $this->is_enrolled( $this->course_of( $lesson_id ), $user_id ) || $this->teaches( $user_id, $this->course_of( $lesson_id ) ) ) ),
				'completed'        => $user_id > 0 && $this->quiz_submitted( $quiz->ID, $user_id ),
			);
		}
		return $items;
	}

	/**
	 * Whether a user is enrolled.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id ) {
		return $user_id > 0 && $course_id > 0 && Sensei_Course::is_user_enrolled( (int) $course_id, (int) $user_id );
	}

	/**
	 * Whether students can enroll themselves without paying.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		return ! Sensei_Course::is_self_enrollment_not_allowed( (int) $course_id ) && ! $this->product_ids( (int) $course_id );
	}

	/**
	 * Enrolls the way the course page's "Take course" button does.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function enroll_free( $course_id, $user_id ) {
		if ( ! $this->published( $course_id, 'course' ) ) {
			return self::not_found( __( 'Course not found.', 'yallapp' ) );
		}
		if ( ! $this->is_free( $course_id ) ) {
			return new WP_Error( 'purchase_required', __( 'This course is not free.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
			if ( ! Sensei_Course::can_current_user_manually_enrol( (int) $course_id ) || ! Sensei_Course::is_prerequisite_complete( (int) $course_id ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
			Sensei()->frontend->manually_enrol_learner( (int) $user_id, (int) $course_id );
			if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
			// As the course page does after enrolling: the course is started.
			Sensei_Utils::user_start_course( (int) $user_id, (int) $course_id );
		}
		$progress = Sensei()->course_progress_repository->get( (int) $course_id, (int) $user_id );
		$started  = $progress ? $progress->get_started_at() : null;
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => self::iso( gmdate( 'Y-m-d H:i:s', $started ? $started->getTimestamp() : time() ) ),
		);
	}

	/**
	 * Enrolled courses.
	 *
	 * @param int    $user_id  User ID.
	 * @param string $status   in_progress|completed.
	 * @param int    $page     Page.
	 * @param int    $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function my_courses( $user_id, $status, $page, $per_page ) {
		$enrolled  = $this->enrolled_course_ids( $user_id );
		$completed = array();
		foreach ( $enrolled as $course_id ) {
			if ( Sensei_Utils::user_completed_course( $course_id, $user_id ) ) {
				$completed[] = $course_id;
			}
		}
		return $this->my_course_page( $enrolled, $completed, $status, $user_id, $page, $per_page );
	}

	/**
	 * Raw lesson data.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	public function lesson( $lesson_id, $user_id ) {
		$post = $this->published( $lesson_id, 'lesson' );
		if ( ! $post ) {
			return null;
		}
		$course_id  = $this->course_of( $post->ID );
		$neighbours = $this->neighbours( $course_id, $post->ID );
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => self::video_from_value( (string) get_post_meta( $post->ID, '_lesson_video_embed', true ) ),
			'attachments' => array(),
			'preview'     => Sensei_Utils::is_preview_lesson( $post->ID ),
			'completed'   => $user_id > 0 && Sensei_Utils::user_completed_lesson( $post->ID, $user_id ),
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
		);
	}

	/**
	 * Whether a user may open a lesson: a preview lesson, or Sensei's own access rules
	 * (enrollment and prerequisites).
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		if ( 'lesson' !== get_post_type( $lesson_id ) ) {
			return false;
		}
		if ( Sensei_Utils::is_preview_lesson( $lesson_id ) ) {
			return true;
		}
		if ( ! $user_id ) {
			return false;
		}
		return $this->teaches( $user_id, $this->course_of( $lesson_id ) ) || sensei_can_user_view_lesson( (int) $lesson_id, (int) $user_id );
	}

	/**
	 * Marks a lesson complete the way its "Complete Lesson" button does. Lessons with a quiz
	 * are completed by taking the quiz.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$course_id = $this->course_of( $lesson_id );
		if ( ! $course_id || 'lesson' !== get_post_type( $lesson_id ) || ! $this->is_enrolled( $course_id, $user_id ) ) {
			return self::not_enrolled();
		}
		if ( ! Sensei_Utils::user_completed_lesson( $lesson_id, $user_id ) ) {
			if ( ! $this->can_view_lesson( $lesson_id, $user_id ) || ! Sensei_Lesson::should_show_lesson_actions( (int) $lesson_id, (int) $user_id ) ) {
				return new WP_Error( 'cannot_complete', __( 'This lesson can not be completed yet.', 'yallapp' ), array( 'status' => 409 ) );
			}
			if ( $this->lesson_quiz( $lesson_id ) ) {
				return new WP_Error( 'cannot_complete', __( 'Take the lesson quiz to complete this lesson.', 'yallapp' ), array( 'status' => 409 ) );
			}
			Sensei_Utils::sensei_start_lesson( (int) $lesson_id, (int) $user_id, true );
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Course progress: lessons completed, as Sensei counts it.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$lessons = array_map( 'intval', (array) Sensei()->course->course_lessons( (int) $course_id, 'publish', 'ids' ) );
		$done    = $user_id ? array_intersect( $lessons, array_map( 'intval', (array) Sensei()->course->get_completed_lesson_ids( (int) $course_id, (int) $user_id ) ) ) : array();
		return self::progress_shape(
			$course_id,
			count( $done ),
			count( $lessons ),
			$user_id > 0 && Sensei_Utils::user_completed_course( (int) $course_id, (int) $user_id )
		);
	}

	/**
	 * Quiz details.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return array|WP_Error
	 */
	public function quiz( $quiz_id, $user_id ) {
		$quiz = $this->quiz_access( $quiz_id, $user_id );
		if ( is_wp_error( $quiz ) ) {
			return $quiz;
		}
		$lesson_id = (int) Sensei()->quiz->get_lesson_id( $quiz->ID );
		$finished  = $this->quiz_attempts( $user_id, $quiz->ID );
		return array(
			'id'                 => (int) $quiz->ID,
			'course_id'          => $this->course_of( $lesson_id ),
			'title'              => (string) $quiz->post_title,
			'question_count'     => $this->question_count( $quiz->ID ),
			'time_limit_seconds' => null,
			'pass_percent'       => Sensei_Quiz::is_pass_required( $lesson_id ) ? (int) round( (float) get_post_meta( $quiz->ID, '_quiz_passmark', true ) ) : 0,
			'attempts_allowed'   => Sensei_Quiz::is_reset_allowed( $lesson_id ) ? null : 1,
			'attempts_used'      => count( $finished ),
			'last_result'        => $finished ? $this->attempt_result( $finished[0] ) : null,
		);
	}

	/**
	 * Starts an attempt. A finished quiz is reset first, as the quiz page's "Restart Quiz"
	 * button does, when the quiz allows retakes.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return array|WP_Error
	 */
	public function start_attempt( $quiz_id, $user_id ) {
		$quiz = $this->quiz_access( $quiz_id, $user_id );
		if ( is_wp_error( $quiz ) ) {
			return $quiz;
		}
		$lesson_id = (int) Sensei()->quiz->get_lesson_id( $quiz->ID );
		if ( $this->quiz_submitted( $quiz->ID, $user_id ) ) {
			if ( ! Sensei_Quiz::is_reset_allowed( $lesson_id ) ) {
				return new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) );
			}
			Sensei()->quiz->reset_user_lesson_data( $lesson_id, (int) $user_id );
		}
		// Sensei picks the questions (random order, a random selection, question categories)
		// for the current user.
		$questions = (array) Sensei()->lesson->lesson_quiz_questions( $quiz->ID, 'publish' );
		if ( ! $questions ) {
			return new WP_Error( 'unsupported', __( 'This quiz has no questions yet.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$native = true;
		foreach ( $questions as $question ) {
			$native = $native && in_array( Sensei()->question->get_question_type( $question->ID ), self::NATIVE_QUESTION_TYPES, true );
		}
		$shaped = array();
		foreach ( $questions as $question ) {
			$shaped[] = $this->question_shape( $question, $native, (int) $quiz->ID );
		}
		$attempt = array(
			'id'        => $this->next_attempt_id( $user_id ),
			'quiz'      => (int) $quiz->ID,
			'start'     => time(),
			'questions' => wp_list_pluck( $questions, 'ID' ),
		);
		update_user_meta( $user_id, self::OPEN_ATTEMPT_META, $attempt );
		return array(
			'id'         => $attempt['id'],
			'quiz_id'    => (int) $quiz->ID,
			'started_at' => gmdate( 'c', $attempt['start'] ),
			'ends_at'    => null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Submits the answers for grading with Sensei_Quiz::submit_answers_for_grading(), which
	 * grades the quiz, completes the lesson when it's passed and sends Sensei's emails.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$open = get_user_meta( $user_id, self::OPEN_ATTEMPT_META, true );
		if ( ! is_array( $open ) || (int) $open['id'] !== (int) $attempt_id || (int) $open['quiz'] !== (int) $quiz_id ) {
			foreach ( $this->quiz_attempts( $user_id, $quiz_id ) as $finished ) {
				if ( (int) $finished['id'] === (int) $attempt_id ) {
					return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
				}
			}
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		$given = array();
		foreach ( $answers as $answer ) {
			$given[ (int) ( $answer['question_id'] ?? 0 ) ] = array_values( array_filter( array_map( 'strval', (array) ( $answer['option_ids'] ?? array() ) ), 'strlen' ) );
		}
		// Every question asked gets an answer, empty when skipped, as the quiz form sends them.
		$submitted = array();
		foreach ( array_map( 'intval', (array) $open['questions'] ) as $question_id ) {
			$submitted[ $question_id ] = $this->answer_value( $question_id, $given[ $question_id ] ?? array() );
		}
		$lesson_id = (int) Sensei()->quiz->get_lesson_id( (int) $quiz_id );
		if ( ! Sensei_Quiz::submit_answers_for_grading( $submitted, array(), $lesson_id, (int) $user_id ) ) {
			return new WP_Error( 'submit_failed', __( 'The answers could not be saved. Please try again.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$recorded = $this->find_attempt( $user_id, $attempt_id );
		if ( ! $recorded ) {
			// The hook wasn't connected (another plugin replaced the adapter): record it here.
			$this->record_submission( $user_id, $quiz_id, Sensei_Quiz::get_user_quiz_grade( $lesson_id, (int) $user_id ), (float) get_post_meta( $quiz_id, '_quiz_passmark', true ), (string) get_post_meta( $quiz_id, '_quiz_grade_type', true ) );
			$recorded = $this->find_attempt( $user_id, $attempt_id );
		}
		return $recorded ? $this->attempt_result( $recorded ) : new WP_Error( 'submit_failed', __( 'The answers could not be saved. Please try again.', 'yallapp' ), array( 'status' => 409 ) );
	}

	/**
	 * Finished attempts, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function attempts( $user_id, $page, $per_page ) {
		$all = array_reverse( $this->attempt_log( $user_id ) );
		return array(
			'items' => array_map( array( $this, 'attempt_result' ), self::slice( $all, $page, $per_page ) ),
			'total' => count( $all ),
		);
	}

	/**
	 * Certificates from the `yallapp_certificate_url` filter.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function certificates( $user_id ) {
		return $this->filtered_certificates( $this->enrolled_course_ids( $user_id ), $user_id );
	}

	/**
	 * WooCommerce checkout with the course's product, or the course page.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		$product = $this->product( (int) $course_id );
		if ( $product && function_exists( 'wc_get_checkout_url' ) ) {
			return add_query_arg( 'add-to-cart', $product->get_id(), wc_get_checkout_url() );
		}
		return (string) get_permalink( $course_id );
	}

	/**
	 * The course a lesson or quiz belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		$type = get_post_type( $post_id );
		if ( 'course' === $type ) {
			return (int) $post_id;
		}
		if ( 'quiz' === $type ) {
			$post_id = (int) Sensei()->quiz->get_lesson_id( (int) $post_id );
			$type    = get_post_type( $post_id );
		}
		return 'lesson' === $type ? (int) Sensei()->lesson->get_course_id( (int) $post_id ) : 0;
	}

	/**
	 * Enrolled users.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		return array_map( 'intval', (array) Sensei_Course_Enrolment::get_course_instance( (int) $course_id )->get_enrolled_user_ids() );
	}

	/**
	 * Courses a user is enrolled in, newest first.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id ) {
		if ( ! $user_id ) {
			return array();
		}
		$query = Sensei_Learner::instance()->get_enrolled_courses_query(
			(int) $user_id,
			array(
				'posts_per_page' => 1000, // phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_posts_per_page -- Every course a student is enrolled in.
				'fields'         => 'ids',
				'order'          => 'DESC',
				'orderby'        => 'date',
			)
		);
		return array_map( 'intval', (array) $query->posts );
	}

	/**
	 * Sensei Pro sells courses through WooCommerce.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		return $this->is_pro() && Woo_Orders::available();
	}

	/**
	 * WooCommerce orders, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function orders( $user_id, $page, $per_page ) {
		if ( ! $this->sells_courses() ) {
			return self::empty_page();
		}
		return Woo_Orders::for_user(
			$user_id,
			$page,
			$per_page,
			static function ( $product_id ) {
				$courses = get_posts(
					array(
						'post_type'      => 'course',
						'posts_per_page' => 1,
						'fields'         => 'ids',
						'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
							array(
								'key'   => '_course_woocommerce_product',
								'value' => (int) $product_id,
							),
						),
					)
				);
				return $courses ? (int) $courses[0] : 0;
			}
		);
	}

	/**
	 * Records a graded quiz submission in the student's attempt history. Hooked to
	 * `sensei_user_quiz_submitted`.
	 *
	 * @param int                  $user_id    User ID.
	 * @param int                  $quiz_id    Quiz ID.
	 * @param float|false|WP_Error $grade      Grade, or false/WP_Error when it needs manual grading.
	 * @param float                $passmark   Pass percentage.
	 * @param string               $grade_type auto or manual.
	 * @return void
	 */
	public function record_submission( $user_id, $quiz_id, $grade, $passmark, $grade_type ) {
		$user_id = (int) $user_id;
		$quiz_id = (int) $quiz_id;
		$open    = get_user_meta( $user_id, self::OPEN_ATTEMPT_META, true );
		$entry   = array(
			'id'     => 0,
			'quiz'   => $quiz_id,
			'start'  => time(),
			'end'    => time(),
			'status' => 'pending_review',
			'score'  => null,
		);
		if ( is_array( $open ) && (int) $open['quiz'] === $quiz_id ) {
			$entry['id']    = (int) $open['id'];
			$entry['start'] = (int) $open['start'];
			delete_user_meta( $user_id, self::OPEN_ATTEMPT_META );
		} else {
			$entry['id'] = $this->next_attempt_id( $user_id );
		}
		if ( 'auto' === $grade_type && false !== $grade && ! is_wp_error( $grade ) ) {
			$entry = self::graded( $entry, (float) $grade, (float) $passmark, $quiz_id );
		}
		$log   = $this->attempt_log( $user_id );
		$log[] = $entry;
		update_user_meta( $user_id, self::ATTEMPTS_META, array_slice( $log, -self::MAX_ATTEMPTS ) );
	}

	/**
	 * Updates the latest attempt waiting for a grade when a teacher grades it. Hooked to
	 * `sensei_user_quiz_grade`.
	 *
	 * @param int    $user_id    User ID.
	 * @param int    $quiz_id    Quiz ID.
	 * @param float  $grade      Grade.
	 * @param float  $passmark   Pass percentage.
	 * @param string $grade_type auto or manual.
	 * @return void
	 */
	public function record_grade( $user_id, $quiz_id, $grade, $passmark, $grade_type ) {
		$log = $this->attempt_log( (int) $user_id );
		for ( $i = count( $log ) - 1; $i >= 0; $i-- ) {
			if ( (int) $log[ $i ]['quiz'] === (int) $quiz_id ) {
				if ( 'pending_review' === $log[ $i ]['status'] ) {
					$log[ $i ] = self::graded( $log[ $i ], (float) $grade, (float) $passmark, (int) $quiz_id );
					update_user_meta( (int) $user_id, self::ATTEMPTS_META, $log );
				}
				return;
			}
		}
	}

	/**
	 * An attempt entry with its grade.
	 *
	 * @param array $entry    Attempt entry.
	 * @param float $grade    Grade in percent.
	 * @param float $passmark Pass percentage.
	 * @param int   $quiz_id  Quiz ID.
	 * @return array
	 */
	private static function graded( array $entry, $grade, $passmark, $quiz_id ) {
		$lesson_id       = (int) Sensei()->quiz->get_lesson_id( $quiz_id );
		$entry['score']  = round( $grade, 2 );
		$entry['status'] = ( ! Sensei_Quiz::is_pass_required( $lesson_id ) || $grade >= $passmark ) ? 'passed' : 'failed';
		return $entry;
	}

	/**
	 * CourseSummary shape.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id Current user.
	 * @return array
	 */
	protected function summary( WP_Post $post, $user_id ) {
		$image = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $post->ID ),
			'lesson_count' => count( (array) Sensei()->course->course_lessons( $post->ID, 'publish', 'ids' ) ),
			'rating'       => null,
			'rating_count' => 0,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => false,
		);
	}

	/**
	 * Price shape from the course's WooCommerce product.
	 *
	 * @param int $course_id Course ID.
	 * @return array
	 */
	private function price( $course_id ) {
		if ( $this->is_free( $course_id ) ) {
			return self::price_shape( true );
		}
		$product = $this->product( $course_id );
		if ( ! $product ) {
			return self::price_shape( false );
		}
		$currency = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : null;
		return self::price_shape( false, (float) $product->get_regular_price(), (float) $product->get_sale_price(), $currency, (string) $product->get_price_html() );
	}

	/**
	 * WooCommerce products Sensei Pro sells the course with.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	private function product_ids( $course_id ) {
		if ( ! $this->sells_courses() ) {
			return array();
		}
		return array_values( array_filter( array_map( 'intval', (array) get_post_meta( $course_id, '_course_woocommerce_product', false ) ) ) );
	}

	/**
	 * The course's first published product.
	 *
	 * @param int $course_id Course ID.
	 * @return \WC_Product|null
	 */
	private function product( $course_id ) {
		foreach ( $this->product_ids( $course_id ) as $product_id ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;
			if ( $product && 'publish' === $product->get_status() ) {
				return $product;
			}
		}
		return null;
	}

	/**
	 * IDs of published courses students can't enroll in themselves.
	 *
	 * @return int[]
	 */
	private function paid_course_ids() {
		$ids = array();
		foreach ( get_posts(
			array(
				'post_type'      => 'course',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		) as $course_id ) {
			if ( ! $this->is_free( (int) $course_id ) ) {
				$ids[] = (int) $course_id;
			}
		}
		return $ids;
	}

	/**
	 * A lesson's published quiz, when it has questions.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @return WP_Post|null
	 */
	private function lesson_quiz( $lesson_id ) {
		if ( ! Sensei_Lesson::lesson_quiz_has_questions( $lesson_id ) ) {
			return null;
		}
		return $this->published( (int) Sensei()->lesson->lesson_quizzes( $lesson_id ), 'quiz' );
	}

	/**
	 * How many questions a student is asked: single questions plus each question category's
	 * number, capped by the quiz's "number of questions" setting.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int
	 */
	private function question_count( $quiz_id ) {
		$count = 0;
		foreach ( Sensei()->quiz->get_questions( $quiz_id, 'publish', 'meta_value_num title', 'ASC', true ) as $question ) {
			$count += 'multiple_question' === $question->post_type ? (int) get_post_meta( $question->ID, 'number', true ) : 1;
		}
		$show = (int) get_post_meta( $quiz_id, '_show_questions', true );
		return $show > 0 ? min( $show, $count ) : $count;
	}

	/**
	 * Whether the student has submitted the quiz (graded, failed or waiting for a grade).
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return bool
	 */
	private function quiz_submitted( $quiz_id, $user_id ) {
		$progress = Sensei()->quiz_progress_repository->get( (int) $quiz_id, (int) $user_id );
		return $progress && 'in-progress' !== $progress->get_status();
	}

	/**
	 * Quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return WP_Post|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz      = $this->published( $quiz_id, 'quiz' );
		$lesson_id = $quiz ? (int) Sensei()->quiz->get_lesson_id( $quiz->ID ) : 0;
		if ( ! $quiz || ! $lesson_id || ! $this->lesson_quiz( $lesson_id ) ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		$course_id = $this->course_of( $lesson_id );
		if ( ! $user_id || ! ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) || ! $this->can_view_lesson( $lesson_id, $user_id ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		return $quiz;
	}

	/**
	 * Choices of a multiple choice question by Sensei's answer ID, in the order the quiz page
	 * shows them.
	 *
	 * @param int $question_id Question ID.
	 * @return array<string, string>
	 */
	private function choices( $question_id ) {
		$right = get_post_meta( $question_id, '_question_right_answer', true );
		$wrong = get_post_meta( $question_id, '_question_wrong_answers', true );
		$all   = array_merge( is_array( $wrong ) ? $wrong : array(), is_array( $right ) ? $right : array( $right ) );
		$by_id = Sensei()->question->get_answers_by_id( array_map( 'strval', $all ) );
		if ( 'yes' === get_post_meta( $question_id, '_random_order', true ) ) {
			$ids = array_keys( $by_id );
			shuffle( $ids );
			$shuffled = array();
			foreach ( $ids as $id ) {
				$shuffled[ $id ] = $by_id[ $id ];
			}
			return $shuffled;
		}
		return Sensei()->question->get_answers_sorted( $by_id, (string) get_post_meta( $question_id, '_answer_order', true ) );
	}

	/**
	 * A submitted answer in the form Sensei's quiz form posts it.
	 *
	 * @param int      $question_id Question ID.
	 * @param string[] $option_ids  Chosen option IDs.
	 * @return string|string[]
	 */
	private function answer_value( $question_id, array $option_ids ) {
		$type = Sensei()->question->get_question_type( $question_id );
		if ( 'boolean' === $type ) {
			$choice = $option_ids ? $option_ids[0] : '';
			return in_array( $choice, array( 'true', 'false' ), true ) ? $choice : '';
		}
		if ( 'multiple-choice' === $type ) {
			$choices = $this->choices( $question_id );
			$texts   = array();
			foreach ( $option_ids as $id ) {
				if ( isset( $choices[ $id ] ) ) {
					$texts[] = $choices[ $id ];
				}
			}
			return $texts;
		}
		return '';
	}

	/**
	 * Question shape.
	 *
	 * @param WP_Post $question Question.
	 * @param bool    $native   Whether the app answers natively.
	 * @param int     $quiz_id  Quiz ID.
	 * @return array
	 */
	private function question_shape( WP_Post $question, $native, $quiz_id ) {
		$type    = Sensei()->question->get_question_type( $question->ID );
		$right   = get_post_meta( $question->ID, '_question_right_answer', true );
		$types   = array(
			'multiple-choice' => is_array( $right ) && count( $right ) > 1 ? 'multiple_choice' : 'single_choice',
			'boolean'         => 'true_false',
			'gap-fill'        => 'fill_in_blank',
			'single-line'     => 'short_answer',
			'multi-line'      => 'open_ended',
		);
		$options = array();
		if ( $native && 'boolean' === $type ) {
			$options = array(
				array(
					'id'        => 'true',
					'label'     => __( 'True', 'yallapp' ),
					'image_url' => null,
				),
				array(
					'id'        => 'false',
					'label'     => __( 'False', 'yallapp' ),
					'image_url' => null,
				),
			);
		} elseif ( $native ) {
			foreach ( $this->choices( $question->ID ) as $id => $text ) {
				$options[] = array(
					'id'        => (string) $id,
					'label'     => self::plain_text( $text ),
					'image_url' => null,
				);
			}
		}
		$description = trim( (string) $question->post_content );
		return array(
			'id'               => (int) $question->ID,
			'type'             => $types[ $type ] ?? 'other',
			'title'            => wp_strip_all_tags( (string) $question->post_title ),
			'description_html' => '' !== $description && ! has_blocks( $description ) ? wp_kses_post( wpautop( $description ) ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : (string) get_permalink( $quiz_id ),
			'options'          => $options,
			'points'           => (float) Sensei()->question->get_question_grade( $question->ID ),
		);
	}

	/**
	 * The student's attempt history, oldest first.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	private function attempt_log( $user_id ) {
		$log = $user_id ? get_user_meta( (int) $user_id, self::ATTEMPTS_META, true ) : array();
		return is_array( $log ) ? array_values( $log ) : array();
	}

	/**
	 * The student's attempts on a quiz, newest first.
	 *
	 * @param int $user_id User ID.
	 * @param int $quiz_id Quiz ID.
	 * @return array[]
	 */
	private function quiz_attempts( $user_id, $quiz_id ) {
		$attempts = array();
		foreach ( array_reverse( $this->attempt_log( $user_id ) ) as $entry ) {
			if ( (int) $entry['quiz'] === (int) $quiz_id ) {
				$attempts[] = $entry;
			}
		}
		return $attempts;
	}

	/**
	 * An attempt in the history by its ID.
	 *
	 * @param int $user_id    User ID.
	 * @param int $attempt_id Attempt ID.
	 * @return array|null
	 */
	private function find_attempt( $user_id, $attempt_id ) {
		foreach ( $this->attempt_log( $user_id ) as $entry ) {
			if ( (int) $entry['id'] === (int) $attempt_id ) {
				return $entry;
			}
		}
		return null;
	}

	/**
	 * The next attempt number for a student.
	 *
	 * @param int $user_id User ID.
	 * @return int
	 */
	private function next_attempt_id( $user_id ) {
		$id = (int) get_user_meta( (int) $user_id, self::ATTEMPT_SEQ_META, true ) + 1;
		update_user_meta( (int) $user_id, self::ATTEMPT_SEQ_META, $id );
		return $id;
	}

	/**
	 * AttemptResult shape.
	 *
	 * @param array $entry Attempt entry.
	 * @return array
	 */
	private function attempt_result( array $entry ) {
		return array(
			'attempt_id'    => (int) $entry['id'],
			'quiz_id'       => (int) $entry['quiz'],
			'quiz_title'    => (string) get_post_field( 'post_title', (int) $entry['quiz'] ),
			'status'        => (string) $entry['status'],
			'score_percent' => null !== $entry['score'] ? (float) $entry['score'] : null,
			'finished_at'   => gmdate( 'Y-m-d\TH:i:s\Z', (int) $entry['end'] ),
		);
	}
}
