<?php
/**
 * LifterLMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use LLMS_Access_Plan;
use LLMS_Course;
use LLMS_Lesson;
use LLMS_Order;
use LLMS_Question;
use LLMS_Quiz;
use LLMS_Quiz_Attempt;
use LLMS_Student;
use WP_Error;
use WP_Post;
use WP_Query;

/**
 * LifterLMS 7.0.0 and later; the end-to-end checks run against 10.3.2. Uses LifterLMS's
 * models (LLMS_Course, LLMS_Student, LLMS_Quiz_Attempt, LLMS_Order) and its own completion
 * and enrollment functions, so engagements, certificates and emails fire as on the website.
 *
 * Courses are free when they have a free access plan, and sold through LifterLMS's checkout
 * otherwise. A quiz belongs to a lesson: the curriculum lists it right after its lesson, and
 * that lesson is completed by the quiz, as on the website. LifterLMS reviews have no star
 * rating and it has no course wishlist or Q&A, so those features are off.
 */
class LifterLMS_Adapter extends Base_Adapter implements Store_Enrolment {

	const NATIVE_QUESTION_TYPES = array( 'choice', 'picture_choice', 'true_false' );

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'lifterlms';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'LLMS_VERSION' ) ? (string) LLMS_VERSION : '';
	}

	/**
	 * LifterLMS has no paid edition, only add-ons.
	 *
	 * @return bool
	 */
	public function is_pro() {
		return false;
	}

	/**
	 * Feature flags.
	 *
	 * @return array<string, bool>
	 */
	public function features() {
		return array(
			'certificates' => true,
			'quizzes'      => true,
			'wishlist'     => false,
			'reviews'      => false,
			'qna'          => false,
		);
	}

	/**
	 * Connects LifterLMS's enrollment hook, fired for free plans, orders and manual enrollments.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Unused: LifterLMS has no Q&A.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'llms_user_enrolled_in_course', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LifterLMS hook.
			static function ( $user_id, $course_id ) use ( $on_enrolled ) {
				call_user_func( $on_enrolled, (int) $course_id, (int) $user_id );
			},
			10,
			2
		);
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
			'quiz'         => 'llms_quiz',
			'announcement' => '',
		);
	}

	/**
	 * Course categories.
	 *
	 * @return array[]
	 */
	public function categories() {
		return $this->terms( 'course_cat' );
	}

	/**
	 * Lists courses. Free means the course has a free access plan.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, 'course', 'course_cat' );
		$price      = $args['price'] ?? 'all';
		if ( 'free' === $price || 'paid' === $price ) {
			$free = $this->free_course_ids();
			if ( 'free' === $price ) {
				$query_args['post__in'] = $free ? ( isset( $query_args['post__in'] ) ? array_intersect( $query_args['post__in'], $free ) : $free ) : array( 0 );
			} else {
				$query_args['post__not_in'] = $free; // phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_post__not_in -- A handful of free courses.
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
		$post = $this->course_post( $course_id, $user_id );
		if ( ! $post ) {
			return null;
		}
		$course     = new LLMS_Course( $post );
		$difficulty = (string) $course->get_difficulty();
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => self::video_from_value( (string) $course->get( 'video_embed' ) ),
				'duration_minutes' => null,
				'level'            => '' !== $difficulty ? $difficulty : null,
				'has_certificate'  => $this->has_certificate_engagement( $post->ID ),
				'categories'       => $this->terms( 'course_cat', $post->ID ),
				'has_checkout'     => ! $this->is_free( $post->ID ) && (bool) $this->paid_plan( $course ) && $course->get_product()->is_purchasable(),
				'qna'              => false,
			)
		);
	}

	/**
	 * Sections and their lessons, each lesson followed by its quiz.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array[]|null
	 */
	public function curriculum( $course_id, $user_id ) {
		$post = $this->course_post( $course_id, $user_id );
		if ( ! $post ) {
			return null;
		}
		$course  = new LLMS_Course( $post );
		$student = $user_id ? llms_get_student( $user_id ) : false;
		$access  = $user_id > 0 && ( $this->is_enrolled( $post->ID, $user_id ) || $this->teaches( $user_id, $post->ID ) );
		$topics  = array();
		foreach ( (array) $course->get_sections() as $section ) {
			$items = array();
			foreach ( (array) $section->get_lessons() as $lesson ) {
				$open    = $access && ( $lesson->is_available() || $this->teaches( $user_id, $post->ID ) );
				$preview = $lesson->is_free();
				$items[] = array(
					'id'               => (int) $lesson->get( 'id' ),
					'type'             => 'lesson',
					'title'            => html_entity_decode( (string) $lesson->get( 'title' ), ENT_QUOTES, 'UTF-8' ),
					'duration_minutes' => null,
					'question_count'   => null,
					'preview'          => $preview,
					'locked'           => ! ( $open || $preview ),
					'completed'        => $student ? (bool) $student->is_complete( $lesson->get( 'id' ), 'lesson' ) : false,
				);
				$quiz_id = $lesson->is_quiz_enabled() ? (int) $lesson->get( 'quiz' ) : 0;
				$quiz    = $quiz_id ? llms_get_post( $quiz_id ) : null;
				if ( $quiz instanceof LLMS_Quiz && 'publish' === $quiz->get( 'status' ) ) {
					$items[] = array(
						'id'               => $quiz_id,
						'type'             => 'quiz',
						'title'            => html_entity_decode( (string) $quiz->get( 'title' ), ENT_QUOTES, 'UTF-8' ),
						'duration_minutes' => null,
						'question_count'   => count( $quiz->get_questions( 'ids' ) ),
						'preview'          => false,
						'locked'           => ! $open,
						'completed'        => $student ? (bool) $student->quizzes()->get_best_attempt( $quiz_id ) : false,
					);
				}
			}
			$topics[] = array(
				'id'    => (int) $section->get( 'id' ),
				'title' => html_entity_decode( (string) $section->get( 'title' ), ENT_QUOTES, 'UTF-8' ),
				'items' => $items,
			);
		}
		return $topics;
	}

	/**
	 * Whether a user is enrolled.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id ) {
		return $user_id > 0 && (bool) llms_is_user_enrolled( (int) $user_id, (int) $course_id );
	}

	/**
	 * Whether a course has a free access plan.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		return (bool) $this->free_plan( new LLMS_Course( (int) $course_id ) );
	}

	/**
	 * Enrolls with the course's free access plan the way LifterLMS's checkout does for free
	 * plans: a completed free order, which enrolls the student.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function enroll_free( $course_id, $user_id ) {
		if ( ! $this->course_post( $course_id, $user_id ) ) {
			return self::not_found( __( 'Course not found.', 'yallapp' ) );
		}
		$course = new LLMS_Course( (int) $course_id );
		$plan   = $this->free_plan( $course );
		if ( ! $plan ) {
			return new WP_Error( 'purchase_required', __( 'This course is not free.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
			$purchasable = llms_check_access_plan_purchasable( $plan, $user_id );
			if ( is_wp_error( $purchasable ) || ! $plan->is_available_to_user( $user_id ) || ! $course->is_enrollment_open() || ! $course->has_capacity() ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
			$gateway = llms()->payment_gateways()->get_gateway_by_id( 'manual' );
			$order   = new LLMS_Order( 'new' );
			if ( ! $gateway || ! $order->get( 'id' ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
			// What LLMS_Payment_Gateway_Manual::handle_pending_order() does for free plans, without its redirect.
			$order->init( llms_get_student( $user_id ), $plan, $gateway );
			$order->set( 'status', 'llms-completed' );
			/** This action is documented in LifterLMS. */
			do_action( 'llms_dispatch_notification_processors' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LifterLMS hook.
			if ( ! llms_is_user_enrolled( (int) $user_id, (int) $course_id, 'all', false ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
		}
		$date = llms_get_student( $user_id )->get_enrollment_date( $course_id, 'enrolled', 'Y-m-d H:i:s' );
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => self::iso( $date ? get_gmt_from_date( $date ) : gmdate( 'Y-m-d H:i:s' ) ),
		);
	}

	/**
	 * 100.4 Enrols a student in a course bought in the app (Store_Enrolment).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return true|WP_Error
	 */
	public function grant_course( $course_id, $user_id ) {
		if ( ! Course_Visibility::live( get_post( (int) $course_id ), 'course' ) ) {
			return new WP_Error( 'not_found', __( 'Course not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		if ( $this->is_enrolled( $course_id, $user_id ) ) {
			return true;
		}
		llms_enroll_student( (int) $user_id, (int) $course_id, 'yallapp_store' );
		return $this->is_enrolled( $course_id, $user_id ) ? true : new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 503 ) );
	}

	/**
	 * 100.4 Takes a student out of a course bought in the app (Store_Enrolment).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return true|WP_Error
	 */
	public function revoke_course( $course_id, $user_id ) {
		llms_unenroll_student( (int) $user_id, (int) $course_id, 'cancelled', 'yallapp_store' );
		return true;
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
		$student   = llms_get_student( $user_id );
		$completed = array();
		foreach ( $enrolled as $course_id ) {
			if ( $student && $student->is_complete( $course_id, 'course' ) ) {
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
		$lesson     = new LLMS_Lesson( $post );
		$course_id  = (int) $lesson->get( 'parent_course' );
		$neighbours = $this->neighbours( $course_id, $post->ID, $user_id );
		$student    = $user_id ? llms_get_student( $user_id ) : false;
		// The app shows the lesson body and its own navigation and buttons, so LifterLMS's page
		// template parts (back link, favorites, mark complete, lesson navigation) are left out.
		remove_filter( 'the_content', 'llms_get_post_content' );
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => self::video_from_value( (string) $lesson->get( 'video_embed' ) ),
			'attachments' => array(),
			'preview'     => $lesson->is_free(),
			'completed'   => $student ? (bool) $student->is_complete( $post->ID, 'lesson' ) : false,
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
		);
	}

	/**
	 * Whether a user may open a lesson: a free lesson, or enrolled and released by the drip settings.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		$lesson = llms_get_post( $lesson_id );
		if ( ! $lesson instanceof LLMS_Lesson ) {
			return false;
		}
		if ( $lesson->is_free() ) {
			return true;
		}
		$course_id = (int) $lesson->get( 'parent_course' );
		if ( $this->teaches( $user_id, $course_id ) ) {
			return true;
		}
		return $this->is_enrolled( $course_id, $user_id ) && $lesson->is_available();
	}

	/**
	 * Marks a lesson complete through LifterLMS's own completion trigger, which applies its quiz
	 * and minimum-time rules.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$lesson    = llms_get_post( $lesson_id );
		$course_id = $lesson instanceof LLMS_Lesson ? (int) $lesson->get( 'parent_course' ) : 0;
		if ( ! $course_id || ! $this->is_enrolled( $course_id, $user_id ) ) {
			return self::not_enrolled();
		}
		$student = llms_get_student( $user_id );
		if ( ! $student->is_complete( $lesson_id, 'lesson' ) ) {
			if ( ! llms_can_user_complete_lesson( $user_id, $lesson ) ) {
				return new WP_Error( 'cannot_complete', __( 'This lesson can not be completed yet.', 'yallapp' ), array( 'status' => 409 ) );
			}
			/** This action is documented in LifterLMS. */
			do_action( 'llms_trigger_lesson_completion', (int) $user_id, (int) $lesson_id, 'lesson_' . $lesson_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LifterLMS hook.
			if ( ! $student->is_complete( $lesson_id, 'lesson' ) ) {
				$message = $lesson->is_quiz_enabled()
					? __( 'Take the lesson quiz to complete this lesson.', 'yallapp' )
					: __( 'This lesson can not be completed yet.', 'yallapp' );
				return new WP_Error( 'cannot_complete', $message, array( 'status' => 409 ) );
			}
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Course progress: lessons completed, as LifterLMS counts it.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$course  = new LLMS_Course( (int) $course_id );
		$lessons = (array) $course->get_lessons( 'ids' );
		$student = $user_id ? llms_get_student( $user_id ) : false;
		$done    = 0;
		if ( $student ) {
			foreach ( $lessons as $lesson_id ) {
				if ( $student->is_complete( $lesson_id, 'lesson' ) ) {
					++$done;
				}
			}
		}
		return self::progress_shape(
			$course_id,
			$done,
			count( $lessons ),
			$student ? (bool) $student->is_complete( $course_id, 'course' ) : false,
			$student ? (int) floor( (float) $student->get_progress( $course_id, 'course', false ) ) : 0
		);
	}

	/**
	 * 73 LifterLMS marks lessons, sections and courses incomplete with llms_mark_incomplete;
	 * its quiz attempts stay in the student's history (a new attempt counts again).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_reset_progress( $course_id, $user_id ) {
		return function_exists( 'llms_mark_incomplete' ) && llms_get_post( $course_id ) instanceof LLMS_Course;
	}

	/**
	 * 73 Starts the course again for the student; the enrollment stays.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return true|WP_Error
	 */
	public function reset_progress( $course_id, $user_id ) {
		$course = llms_get_post( $course_id );
		if ( ! function_exists( 'llms_mark_incomplete' ) || ! $course instanceof LLMS_Course ) {
			return parent::reset_progress( $course_id, $user_id );
		}
		foreach ( (array) $course->get_lessons( 'ids' ) as $lesson_id ) {
			llms_mark_incomplete( (int) $user_id, (int) $lesson_id, 'lesson', 'yallapp_restart' );
		}
		foreach ( (array) $course->get_sections( 'ids' ) as $section_id ) {
			llms_mark_incomplete( (int) $user_id, (int) $section_id, 'section', 'yallapp_restart' );
		}
		llms_mark_incomplete( (int) $user_id, (int) $course_id, 'course', 'yallapp_restart' );
		return true;
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
		$finished = $this->finished_attempts( $user_id, $quiz->get( 'id' ) );
		return array(
			'id'                 => (int) $quiz->get( 'id' ),
			'course_id'          => $this->course_of( $quiz->get( 'id' ) ),
			'title'              => (string) $quiz->get( 'title' ),
			'question_count'     => count( $quiz->get_questions( 'ids' ) ),
			'time_limit_seconds' => $quiz->has_time_limit() ? (int) $quiz->get( 'time_limit' ) * 60 : null,
			'pass_percent'       => (int) round( (float) $quiz->get( 'passing_percent' ) ),
			'attempts_allowed'   => $quiz->has_attempt_limit() ? (int) $quiz->get( 'allowed_attempts' ) : null,
			'attempts_used'      => count( $finished ),
			'last_result'        => $finished ? $this->attempt_result( $finished[0] ) : null,
		);
	}

	/**
	 * Starts an attempt with LLMS_Quiz_Attempt, as the quiz page's "Start" button does.
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
		if ( ! $quiz->is_open( $user_id ) ) {
			return new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$student = llms_get_student( $user_id );
		// As the quiz page does: a resumable attempt left open is ended before a new one starts.
		$key = $quiz->get_student_last_attempt_key( $user_id );
		if ( $key ) {
			$last = $student->quizzes()->get_attempt_by_key( $key );
			if ( $last && $last->can_be_resumed() ) {
				$last->end();
			}
		}
		$attempt = LLMS_Quiz_Attempt::init( $quiz->get( 'id' ), (int) $quiz->get( 'lesson_id' ), $user_id );
		if ( ! $attempt->get_first_question() ) {
			return new WP_Error( 'unsupported', __( 'This quiz has no questions yet.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$attempt->start();

		$questions = array();
		$native    = true;
		foreach ( (array) $attempt->get_questions() as $data ) {
			$question = llms_get_post( (int) $data['id'] );
			if ( $question instanceof LLMS_Question ) {
				$questions[] = $question;
				$native      = $native && in_array( (string) $question->get( 'question_type' ), self::NATIVE_QUESTION_TYPES, true );
			}
		}
		$shaped = array();
		foreach ( $questions as $question ) {
			$shaped[] = $this->question_shape( $question, $native, (int) $quiz->get( 'id' ) );
		}
		// LifterLMS stores attempt dates in the site's time zone.
		$start = (int) get_gmt_from_date( (string) $attempt->get( 'start_date' ), 'U' );
		$limit = $quiz->has_time_limit() && ! $student->has_unlimited_quiz_time() ? (int) $quiz->get( 'time_limit' ) * 60 : 0;
		return array(
			'id'         => (int) $attempt->get( 'id' ),
			'quiz_id'    => (int) $quiz->get( 'id' ),
			'started_at' => gmdate( 'c', (int) $start ),
			'ends_at'    => $limit ? gmdate( 'c', (int) $start + $limit ) : null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Records the answers and ends the attempt with LifterLMS's own grading.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$attempt = $attempt_id ? new LLMS_Quiz_Attempt( (int) $attempt_id ) : null;
		if ( ! $attempt || ! $attempt->exists() || (int) $attempt->get( 'student_id' ) !== (int) $user_id || (int) $attempt->get( 'quiz_id' ) !== (int) $quiz_id ) {
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		if ( 'incomplete' !== $attempt->get( 'status' ) ) {
			return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$ids = array_map(
			static function ( $data ) {
				return (int) $data['id'];
			},
			(array) $attempt->get_questions()
		);
		foreach ( $answers as $answer ) {
			$question_id = (int) ( $answer['question_id'] ?? 0 );
			$options     = array_values( array_filter( array_map( 'strval', (array) ( $answer['option_ids'] ?? array() ) ), 'strlen' ) );
			if ( in_array( $question_id, $ids, true ) && $options ) {
				$attempt->answer_question( $question_id, $options );
			}
		}
		$attempt->end();
		return $this->attempt_result( new LLMS_Quiz_Attempt( (int) $attempt_id ) );
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
		$query = new \LLMS_Query_Quiz_Attempt(
			array(
				'student_id'     => (int) $user_id,
				'status_exclude' => array( 'incomplete', 'new' ),
				'per_page'       => (int) $per_page,
				'page'           => max( 1, (int) $page ),
				'sort'           => array( 'id' => 'DESC' ),
			)
		);
		return array(
			'items' => array_map( array( $this, 'attempt_result' ), (array) $query->get_attempts() ),
			'total' => (int) $query->get_found_results(),
		);
	}

	/**
	 * Certificates the student has earned through LifterLMS engagements.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function certificates( $user_id ) {
		$student = $user_id ? llms_get_student( $user_id ) : false;
		$awards  = $student ? $student->get_certificates( array( 'per_page' => 100 ) ) : null;
		$items   = array();
		foreach ( $awards ? (array) $awards->get_awards() : array() as $certificate ) {
			$related   = (int) $certificate->get_related_post_id();
			$course_id = $related ? $this->course_of( $related ) : 0;
			$items[]   = array(
				'course_id'    => $course_id,
				'course_title' => $course_id ? get_the_title( $course_id ) : (string) $certificate->get( 'title' ),
				'url'          => (string) get_permalink( $certificate->get( 'id' ) ),
				'issued_at'    => self::iso( (string) get_post_field( 'post_date_gmt', $certificate->get( 'id' ) ) ),
			);
		}
		return $items;
	}

	/**
	 * The certificate the student earned for a course, or one from the filter.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return string|null
	 */
	protected function certificate_url( $course_id, $user_id ) {
		foreach ( $this->certificates( $user_id ) as $certificate ) {
			if ( (int) $certificate['course_id'] === (int) $course_id ) {
				return $certificate['url'];
			}
		}
		return parent::certificate_url( $course_id, $user_id );
	}

	/**
	 * The checkout of the course's first paid access plan.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		$plan = $this->paid_plan( new LLMS_Course( (int) $course_id ) );
		return $plan ? (string) $plan->get_checkout_url() : (string) get_permalink( $course_id );
	}

	/**
	 * The course a lesson, section or quiz belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return 0;
		}
		if ( 'course' === $post->post_type ) {
			return (int) $post->ID;
		}
		if ( 'llms_quiz' === $post->post_type ) {
			$quiz = llms_get_post( $post );
			return $quiz ? $this->course_of( (int) $quiz->get( 'lesson_id' ) ) : 0;
		}
		if ( in_array( $post->post_type, array( 'lesson', 'section' ), true ) ) {
			$item = llms_get_post( $post );
			return $item ? (int) $item->get( 'parent_course' ) : 0;
		}
		return 0;
	}

	/**
	 * Enrolled users.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		$query = new \LLMS_Student_Query(
			array(
				'post_id'  => (int) $course_id,
				'statuses' => array( 'enrolled' ),
				'per_page' => 5000,
			)
		);
		return array_map(
			static function ( $student ) {
				return (int) $student->get_id();
			},
			(array) $query->get_students()
		);
	}

	/**
	 * Courses a user is enrolled in, newest first.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id ) {
		$student = $user_id ? llms_get_student( $user_id ) : false;
		if ( ! $student ) {
			return array();
		}
		$courses = $student->get_courses(
			array(
				'limit'  => 1000,
				'status' => 'enrolled',
			)
		);
		$ids     = array_map( 'intval', (array) ( $courses['results'] ?? array() ) );
		// 50 LifterLMS lists published courses only; its private courses the student is
		// enrolled in show in My courses too.
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- LifterLMS's enrollment table.
		$private = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT upm.post_id FROM {$wpdb->prefix}lifterlms_user_postmeta upm INNER JOIN {$wpdb->posts} p ON p.ID = upm.post_id WHERE p.post_type = %s AND p.post_status = %s AND upm.meta_key = %s AND upm.user_id = %d ORDER BY upm.updated_date DESC", 'course', 'private', '_status', (int) $user_id ) );
		foreach ( array_map( 'intval', (array) $private ) as $course_id ) {
			if ( $this->is_enrolled( $course_id, $user_id ) ) {
				$ids[] = $course_id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * LifterLMS sells through its own checkout, and records free plans as orders too.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		return true;
	}

	/**
	 * LifterLMS orders, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function orders( $user_id, $page, $per_page ) {
		if ( ! $user_id ) {
			return self::empty_page();
		}
		$query = new WP_Query(
			array(
				'post_type'      => 'llms_order',
				'post_status'    => array_keys( llms_get_order_statuses() ),
				'posts_per_page' => (int) $per_page,
				'paged'          => max( 1, (int) $page ),
				'orderby'        => 'ID',
				'order'          => 'DESC',
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => '_llms_user_id',
						'value' => (int) $user_id,
					),
				),
			)
		);
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->order_shape( new LLMS_Order( $post ) );
		}
		return array(
			'items' => $items,
			'total' => (int) $query->found_posts,
		);
	}

	/**
	 * Order shape.
	 *
	 * @param LLMS_Order $order Order.
	 * @return array
	 */
	private function order_shape( LLMS_Order $order ) {
		$status  = (string) $order->get( 'status' );
		$map     = array(
			'llms-completed'      => 'completed',
			'llms-active'         => 'completed',
			'llms-expired'        => 'completed',
			'llms-pending'        => 'pending',
			'llms-pending-cancel' => 'pending',
			'llms-on-hold'        => 'on_hold',
			'llms-cancelled'      => 'cancelled',
			'llms-refunded'       => 'refunded',
			'llms-failed'         => 'failed',
		);
		$product = (int) $order->get( 'product_id' );
		return array(
			'id'           => (int) $order->get( 'id' ),
			'number'       => (string) $order->get( 'id' ),
			'status'       => $map[ $status ] ?? 'pending',
			'status_label' => (string) llms_get_order_status_name( $status ),
			'total'        => \Yallapp\Commerce\Money::plain( llms_price( (float) $order->get( 'total' ) ) ),
			'created_at'   => self::iso( (string) get_post_field( 'post_date_gmt', $order->get( 'id' ) ) ),
			'items'        => array(
				array(
					'name'      => (string) $order->get( 'product_title' ),
					'course_id' => ( $product && 'course' === get_post_type( $product ) ) ? $product : null,
				),
			),
		);
	}

	/**
	 * CourseSummary shape.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id Current user.
	 * @return array
	 */
	protected function summary( WP_Post $post, $user_id ) {
		$course = new LLMS_Course( $post );
		$image  = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $course ),
			'lesson_count' => (int) $course->get_lessons_count(),
			'rating'       => null,
			'rating_count' => 0,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => false,
		);
	}

	/**
	 * Price shape from the course's first paid access plan.
	 *
	 * @param LLMS_Course $course Course.
	 * @return array
	 */
	private function price( LLMS_Course $course ) {
		if ( $this->free_plan( $course ) ) {
			return self::price_shape( true );
		}
		$plan = $this->paid_plan( $course );
		if ( ! $plan ) {
			return self::price_shape( false );
		}
		$regular = (float) $plan->get_price( 'price', array(), 'float' );
		$sale    = $plan->is_on_sale() ? (float) $plan->get_price( 'sale_price', array(), 'float' ) : 0.0;
		return self::price_shape( false, $regular, $sale, get_lifterlms_currency(), $plan->get_price( $sale > 0 ? 'sale_price' : 'price' ) );
	}

	/**
	 * The course's first visible free access plan.
	 *
	 * @param LLMS_Course $course Course.
	 * @return LLMS_Access_Plan|null
	 */
	private function free_plan( LLMS_Course $course ) {
		foreach ( (array) $course->get_product()->get_access_plans( true ) as $plan ) {
			return $plan;
		}
		return null;
	}

	/**
	 * The course's first visible paid access plan.
	 *
	 * @param LLMS_Course $course Course.
	 * @return LLMS_Access_Plan|null
	 */
	private function paid_plan( LLMS_Course $course ) {
		foreach ( (array) $course->get_product()->get_access_plans() as $plan ) {
			if ( ! $plan->is_free() ) {
				return $plan;
			}
		}
		return null;
	}

	/**
	 * IDs of courses with a published free access plan.
	 *
	 * @return int[]
	 */
	private function free_course_ids() {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- One query instead of loading every course's plans.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT product.meta_value FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} free ON free.post_id = p.ID AND free.meta_key = '_llms_is_free' AND free.meta_value = 'yes' INNER JOIN {$wpdb->postmeta} product ON product.post_id = p.ID AND product.meta_key = '_llms_product_id' WHERE p.post_type = %s AND p.post_status = 'publish'", 'llms_access_plan' ) );
		return array_values( array_filter( array_map( 'intval', (array) $ids ) ) );
	}

	/**
	 * Whether completing the course awards a certificate (a published engagement for it).
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	private function has_certificate_engagement( $course_id ) {
		$engagements = get_posts(
			array(
				'post_type'      => 'llms_engagement',
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => '_llms_engagement_type',
						'value' => 'certificate',
					),
					array(
						'key'   => '_llms_trigger_type',
						'value' => 'course_completed',
					),
					array(
						'key'   => '_llms_engagement_trigger_post',
						'value' => (int) $course_id,
					),
				),
			)
		);
		return (bool) $engagements;
	}

	/**
	 * Whether a user teaches a course: its author, one of its LifterLMS instructors, or an administrator.
	 *
	 * @param int $user_id   User.
	 * @param int $course_id Course.
	 * @return bool
	 */
	protected function teaches( $user_id, $course_id ) {
		if ( parent::teaches( $user_id, $course_id ) ) {
			return true;
		}
		foreach ( (array) ( new LLMS_Course( (int) $course_id ) )->get_instructors() as $instructor ) {
			if ( (int) ( $instructor['id'] ?? 0 ) === (int) $user_id ) {
				return $user_id > 0;
			}
		}
		return false;
	}

	/**
	 * Quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return LLMS_Quiz|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz = $this->published( $quiz_id, 'llms_quiz' ) ? llms_get_post( (int) $quiz_id ) : null;
		if ( ! $quiz instanceof LLMS_Quiz ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		$lesson = llms_get_post( (int) $quiz->get( 'lesson_id' ) );
		if ( ! $lesson instanceof LLMS_Lesson || ! $user_id || ! $this->can_view_lesson( $lesson->get( 'id' ), $user_id ) || ( ! $lesson->is_free() && ! $this->is_enrolled( (int) $lesson->get( 'parent_course' ), $user_id ) && ! $this->teaches( $user_id, (int) $lesson->get( 'parent_course' ) ) ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		return $quiz;
	}

	/**
	 * The user's finished attempts on a quiz, newest first.
	 *
	 * @param int $user_id User ID.
	 * @param int $quiz_id Quiz ID.
	 * @return LLMS_Quiz_Attempt[]
	 */
	private function finished_attempts( $user_id, $quiz_id ) {
		$query = new \LLMS_Query_Quiz_Attempt(
			array(
				'student_id'     => (int) $user_id,
				'quiz_id'        => (int) $quiz_id,
				'status_exclude' => array( 'incomplete', 'new' ),
				'per_page'       => 100,
				'sort'           => array( 'id' => 'DESC' ),
			)
		);
		return (array) $query->get_attempts();
	}

	/**
	 * Question shape.
	 *
	 * @param LLMS_Question $question Question.
	 * @param bool          $native   Whether the app answers natively.
	 * @param int           $quiz_id  Quiz ID.
	 * @return array
	 */
	private function question_shape( LLMS_Question $question, $native, $quiz_id ) {
		$type    = (string) $question->get( 'question_type' );
		$multi   = 'yes' === $question->get( 'multi_choices' );
		$types   = array(
			'choice'          => $multi ? 'multiple_choice' : 'single_choice',
			'picture_choice'  => $multi ? 'multiple_choice' : 'single_choice',
			'true_false'      => 'true_false',
			'blank'           => 'fill_in_blank',
			'reorder'         => 'ordering',
			'picture_reorder' => 'ordering',
			'short_answer'    => 'short_answer',
			'long_answer'     => 'open_ended',
		);
		$options = array();
		if ( $native ) {
			foreach ( (array) $question->get_choices() as $choice ) {
				$image     = $choice->get_image();
				$options[] = array(
					'id'        => (string) $choice->get( 'id' ),
					'label'     => wp_strip_all_tags( (string) ( 'image' === $choice->get( 'choice_type' ) ? $choice->get( 'marker' ) : $choice->get_choice() ) ),
					'image_url' => is_array( $image ) && ! empty( $image['src'] ) ? (string) $image['src'] : null,
				);
			}
		}
		$description = $question->has_description() ? (string) $question->get_description() : '';
		return array(
			'id'               => (int) $question->get( 'id' ),
			'type'             => $types[ $type ] ?? 'other',
			'title'            => wp_strip_all_tags( (string) $question->get( 'title' ) ),
			'description_html' => '' !== trim( $description ) ? wp_kses_post( $description ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : (string) get_permalink( $quiz_id ),
			'options'          => $options,
			'points'           => (float) $question->get( 'points' ),
		);
	}

	/**
	 * AttemptResult shape.
	 *
	 * @param LLMS_Quiz_Attempt $attempt Attempt.
	 * @return array
	 */
	private function attempt_result( LLMS_Quiz_Attempt $attempt ) {
		$status = (string) $attempt->get( 'status' );
		$grade  = $attempt->get( 'grade' );
		$end    = (string) $attempt->get( 'end_date' );
		return array(
			'attempt_id'    => (int) $attempt->get( 'id' ),
			'quiz_id'       => (int) $attempt->get( 'quiz_id' ),
			'quiz_title'    => get_the_title( (int) $attempt->get( 'quiz_id' ) ),
			'status'        => 'pending' === $status ? 'pending_review' : ( 'pass' === $status ? 'passed' : 'failed' ),
			'score_percent' => ( null !== $grade && '' !== $grade ) ? round( (float) $grade, 2 ) : null,
			'finished_at'   => '' !== $end ? self::iso( get_gmt_from_date( $end ) ) : null,
		);
	}
}
