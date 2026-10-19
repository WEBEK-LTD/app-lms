<?php
/**
 * Masteriyo LMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use Masteriyo\Enums\CourseAccessMode;
use Masteriyo\Enums\UserCourseStatus;
use Masteriyo\Query\CourseProgressItemQuery;
use Masteriyo\Query\UserCourseQuery;
use WP_Error;
use WP_Post;
use WP_Query;
use WP_REST_Request;
use Yallapp\Commerce\Money;

/**
 * Masteriyo 1.6.0 and later; the end-to-end checks run against 1.13.4. Masteriyo keeps its
 * learning rules in its own REST controllers (course progress, quiz attempts and grading,
 * reviews, Q&A), so the adapter calls those routes inside the request as the student, and
 * Masteriyo's permissions, hooks and emails apply as on the website.
 *
 * Open and "registration required" courses are free; one-time and recurring courses are
 * sold through Masteriyo's checkout. A quiz counts as completed in the curriculum once the
 * student passes it (Masteriyo's "Mark as completed"). Masteriyo has no free preview per
 * lesson, and its wishlist and certificates are add-ons, so those use the documented
 * defaults (`feature_disabled` and the `yallapp_certificate_url` filter).
 */
class Masteriyo_Adapter extends Base_Adapter {

	const NATIVE_QUESTION_TYPES = array( 'single-choice', 'multiple-choice', 'true-false' );

	/**
	 * Completed progress items by course and user, for this request.
	 *
	 * @var array<string, int[]>
	 */
	private $completed = array();

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'masteriyo';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'MASTERIYO_VERSION' ) ? (string) MASTERIYO_VERSION : '';
	}

	/**
	 * Whether Masteriyo Pro is active.
	 *
	 * @return bool
	 */
	public function is_pro() {
		return function_exists( 'masteriyo_is_pro' ) ? (bool) masteriyo_is_pro() : false;
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
			'reviews'      => true,
			'qna'          => (bool) masteriyo_get_setting( 'learn_page.display.enable_questions_answers' ),
		);
	}

	/**
	 * Connects Masteriyo's enrollment and Q&A hooks.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Called with (question ID, asker ID, course ID, replier ID).
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'masteriyo_new_user_course', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Masteriyo hook.
			static function ( $id, $user_course ) use ( $on_enrolled ) {
				if ( is_object( $user_course ) && UserCourseStatus::ACTIVE === $user_course->get_status() ) {
					self::make_student( (int) $user_course->get_user_id() );
					call_user_func( $on_enrolled, (int) $user_course->get_course_id(), (int) $user_course->get_user_id() );
				}
			},
			10,
			2
		);
		add_action(
			'masteriyo_new_course_qa', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Masteriyo hook.
			static function ( $id, $qa ) use ( $on_answered ) {
				$parent = is_object( $qa ) ? (int) $qa->get_parent() : 0;
				$asked  = $parent ? get_comment( $parent ) : null;
				$asker  = $asked ? (int) $asked->user_id : 0;
				if ( $parent && $asker && $asker !== (int) $qa->get_user_id() ) {
					call_user_func( $on_answered, $parent, $asker, (int) $qa->get_course_id(), (int) $qa->get_user_id() );
				}
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
			'course'       => 'mto-course',
			'lesson'       => 'mto-lesson',
			'quiz'         => 'mto-quiz',
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
	 * Lists courses. Free means open or "registration required" access.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, 'mto-course', 'course_cat' );
		$price      = $args['price'] ?? 'all';
		if ( 'free' === $price || 'paid' === $price ) {
			$access                   = array(
				'key'     => '_access_mode',
				'value'   => array( CourseAccessMode::OPEN, CourseAccessMode::NEED_REGISTRATION ),
				'compare' => 'free' === $price ? 'IN' : 'NOT IN',
			);
			$query_args['meta_query'] = array( $access ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
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
		$post   = $this->course_post( $course_id, $user_id );
		$course = $post ? masteriyo_get_course( $post->ID ) : null;
		if ( ! $course ) {
			return null;
		}
		$difficulty = $course->get_difficulty();
		$minutes    = (int) $course->get_duration();
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => null,
				'duration_minutes' => $minutes > 0 ? $minutes : null,
				'level'            => is_array( $difficulty ) && ! empty( $difficulty['name'] ) ? (string) $difficulty['name'] : null,
				'has_certificate'  => (bool) has_filter( 'yallapp_certificate_url' ),
				'categories'       => $this->terms( 'course_cat', $post->ID ),
				'has_checkout'     => in_array( $course->get_access_mode(), array( CourseAccessMode::ONE_TIME, CourseAccessMode::RECURRING ), true ) && $course->is_purchasable(),
				'qna'              => $this->qna_enabled( $post->ID ),
			)
		);
	}

	/**
	 * Sections with their lessons and quizzes, in course order.
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
		$access = $user_id > 0 && ( $this->is_enrolled( $post->ID, $user_id ) || $this->teaches( $user_id, $post->ID ) );
		$done   = $user_id ? $this->completed_items( $post->ID, $user_id ) : array();
		$topics = array();
		$index  = -1;
		foreach ( masteriyo_get_course_contents( $post->ID ) as $object ) {
			$type = $object->get_post_type();
			if ( 'mto-section' === $type ) {
				$topics[] = array(
					'id'    => (int) $object->get_id(),
					'title' => html_entity_decode( (string) $object->get_name(), ENT_QUOTES, 'UTF-8' ),
					'items' => array(),
				);
				$index    = count( $topics ) - 1;
				continue;
			}
			if ( $index < 0 || ! in_array( $type, array( 'mto-lesson', 'mto-quiz' ), true ) ) {
				continue;
			}
			$seconds                     = 'mto-lesson' === $type ? (int) $object->get_video_playback_time() : 0;
			$quiz_minutes                = 'mto-quiz' === $type ? (int) $object->get_duration() : 0;
			$topics[ $index ]['items'][] = array(
				'id'               => (int) $object->get_id(),
				'type'             => 'mto-lesson' === $type ? 'lesson' : 'quiz',
				'title'            => html_entity_decode( (string) $object->get_name(), ENT_QUOTES, 'UTF-8' ),
				'duration_minutes' => $seconds > 0 ? (int) ceil( $seconds / 60 ) : ( $quiz_minutes > 0 ? $quiz_minutes : null ),
				'question_count'   => 'mto-quiz' === $type ? (int) $object->get_questions_count() : null,
				'preview'          => false,
				'locked'           => ! $access,
				'completed'        => in_array( (int) $object->get_id(), $done, true ),
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
		if ( $user_id <= 0 || $course_id <= 0 ) {
			return false;
		}
		$user_course = $this->user_course( $course_id, $user_id );
		return $user_course && UserCourseStatus::ACTIVE === $user_course->get_status() && masteriyo_can_start_course( (int) $course_id, (int) $user_id );
	}

	/**
	 * Whether a course is free: open or "registration required" access.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		$course = masteriyo_get_course( (int) $course_id );
		return $course && in_array( $course->get_access_mode(), array( CourseAccessMode::OPEN, CourseAccessMode::NEED_REGISTRATION ), true );
	}

	/**
	 * Enrolls in a free course the way Masteriyo's "Start course" does on the learn page.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function enroll_free( $course_id, $user_id ) {
		if ( ! $this->course_post( $course_id, $user_id ) ) {
			return self::not_found( __( 'Course not found.', 'yallapp' ) );
		}
		if ( ! $this->is_free( $course_id ) ) {
			return new WP_Error( 'purchase_required', __( 'This course is not free.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$user_course = $this->user_course( $course_id, $user_id );
		if ( ! $user_course ) {
			$course = masteriyo_get_course( (int) $course_id );
			if ( $course->get_enrollment_limit() > 0 && $course->get_available_seats() <= 0 ) {
				return new WP_Error( 'enrollment_failed', __( 'This course is full.', 'yallapp' ), array( 'status' => 403 ) );
			}
			$user_course = masteriyo( 'user-course' );
			$user_course->set_status( UserCourseStatus::ACTIVE );
			$user_course->set_course_id( (int) $course_id );
			$user_course->set_user_id( (int) $user_id );
			$user_course->set_date_start( current_time( 'mysql', true ) );
			$user_course->save();
		}
		self::make_student( (int) $user_id );
		$start = $user_course->get_date_start();
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => gmdate( 'Y-m-d\TH:i:s\Z', $start ? $start->getTimestamp() : time() ),
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
			if ( $this->progress( $course_id, $user_id )['course_completed'] ) {
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
		$post   = $this->published( $lesson_id, 'mto-lesson' );
		$lesson = $post ? masteriyo_get_lesson( $post->ID ) : null;
		if ( ! $lesson ) {
			return null;
		}
		$course_id  = (int) $lesson->get_course_id();
		$neighbours = $this->neighbours( $course_id, $post->ID, $user_id );
		$seconds    = (int) $lesson->get_video_playback_time();
		$video      = 'self-hosted' === $lesson->get_video_source()
			? self::video_from_attachment( (int) $lesson->get_video_source_id(), $seconds )
			: self::video_from_value( (string) $lesson->get_video_source_url(), $seconds );
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => $video,
			'attachments' => array(),
			'preview'     => false,
			'completed'   => $user_id > 0 && in_array( (int) $post->ID, $this->completed_items( $course_id, $user_id ), true ),
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
		);
	}

	/**
	 * Whether a user may open a lesson: enrolled in its course, or teaching it.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		$course_id = $this->course_of( $lesson_id );
		return $user_id > 0 && $course_id && 'mto-lesson' === get_post_type( $lesson_id ) && ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) );
	}

	/**
	 * Marks a lesson complete through Masteriyo's course progress route, as the learn page's
	 * "Mark as complete" button does.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$course_id = $this->course_of( $lesson_id );
		if ( ! $course_id || 'mto-lesson' !== get_post_type( $lesson_id ) || ! $this->is_enrolled( $course_id, $user_id ) ) {
			return self::not_enrolled();
		}
		if ( ! in_array( (int) $lesson_id, $this->completed_items( $course_id, $user_id ), true ) ) {
			$saved = $this->mark_complete( $course_id, (int) $lesson_id, 'lesson' );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Course progress: lessons and quizzes completed, as Masteriyo counts them.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$items    = $this->course_item_ids( $course_id );
		$done     = $user_id ? array_intersect( $items, $this->completed_items( $course_id, $user_id ) ) : array();
		$progress = $user_id ? masteriyo_get_course_progress_by_user_and_course( (int) $user_id, (int) $course_id ) : null;
		return self::progress_shape(
			$course_id,
			count( $done ),
			count( $items ),
			$progress && 'completed' === $progress->get_status()
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
		$finished = $this->finished_attempts( array( 'quiz_id' => $quiz->get_id() ), $user_id );
		$minutes  = (int) $quiz->get_duration();
		$allowed  = (int) $quiz->get_attempts_allowed();
		return array(
			'id'                 => (int) $quiz->get_id(),
			'course_id'          => (int) $quiz->get_course_id(),
			'title'              => (string) $quiz->get_name(),
			'question_count'     => (int) $quiz->get_questions_count(),
			'time_limit_seconds' => $minutes > 0 ? $minutes * 60 : null,
			'pass_percent'       => $this->pass_percent( $quiz ),
			'attempts_allowed'   => $allowed > 0 ? $allowed : null,
			'attempts_used'      => $finished['total'],
			'last_result'        => $finished['items'] ? $finished['items'][0] : null,
		);
	}

	/**
	 * Starts an attempt with Masteriyo's start_quiz route, which checks the attempt limit.
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
		$questions = $this->questions_of( $quiz->get_id() );
		if ( ! $questions ) {
			return new WP_Error( 'unsupported', __( 'This quiz has no questions yet.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$attempt = $this->rest( 'POST', '/masteriyo/v1/quizes/start_quiz', array( 'id' => (int) $quiz->get_id() ) );
		if ( is_wp_error( $attempt ) ) {
			return 403 === ( $attempt->get_error_data()['status'] ?? 0 ) && false !== strpos( $attempt->get_error_code(), 'attempt_reached' )
				? new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) )
				: $attempt;
		}
		$native = true;
		foreach ( $questions as $question ) {
			$native = $native && in_array( $question->get_type(), self::NATIVE_QUESTION_TYPES, true );
		}
		$shaped = array();
		foreach ( $questions as $question ) {
			$shaped[] = $this->question_shape( $question, $native, $quiz );
		}
		$start   = (int) strtotime( (string) ( $attempt['attempt_started_at'] ?? '' ) . ' UTC' );
		$start   = $start > 0 ? $start : time();
		$minutes = (int) $quiz->get_duration();
		return array(
			'id'         => (int) $attempt['id'],
			'quiz_id'    => (int) $quiz->get_id(),
			'started_at' => gmdate( 'c', $start ),
			'ends_at'    => $minutes > 0 ? gmdate( 'c', $start + $minutes * 60 ) : null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Grades the answers with Masteriyo's check_answers route and, when the quiz is passed,
	 * marks it completed as the quiz page's "Mark as completed" button does.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$rows = self::attempt_rows(
			array(
				'id'      => (int) $attempt_id,
				'quiz_id' => (int) $quiz_id,
				'user_id' => (int) $user_id,
			)
		);
		$row  = $rows ? (array) $rows[0] : null;
		if ( ! $row ) {
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		$open = masteriyo_is_quiz_started( (int) $quiz_id );
		if ( 'attempt_started' !== $row['attempt_status'] || ! $open || (int) $open->get_id() !== (int) $attempt_id ) {
			return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$questions = array();
		foreach ( $this->questions_of( (int) $quiz_id ) as $question ) {
			$questions[ (int) $question->get_id() ] = $question;
		}
		$data = array();
		foreach ( $answers as $answer ) {
			$question = $questions[ (int) ( $answer['question_id'] ?? 0 ) ] ?? null;
			if ( ! $question ) {
				continue;
			}
			$names = array();
			$all   = array_values( (array) $question->get_answers( 'edit' ) );
			foreach ( (array) ( $answer['option_ids'] ?? array() ) as $id ) {
				$id = (string) $id;
				if ( ctype_digit( $id ) && isset( $all[ (int) $id ] ) ) {
					$names[] = (string) $all[ (int) $id ]->name;
				}
			}
			if ( $names ) {
				$data[ (int) $question->get_id() ] = 'multiple-choice' === $question->get_type() ? $names : $names[0];
			}
		}
		// Masteriyo's form always posts something; an empty answer sheet still ends the attempt.
		$result = $this->rest(
			'POST',
			'/masteriyo/v1/quizes/check_answers',
			array(
				'id'   => (int) $quiz_id,
				'data' => $data ? $data : (object) array(),
			)
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$rows   = self::attempt_rows( array( 'id' => (int) $attempt_id ) );
		$shaped = $rows ? $this->attempt_result( (array) $rows[0] ) : null;
		if ( ! $shaped ) {
			return new WP_Error( 'submit_failed', __( 'The answers could not be saved. Please try again.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( 'passed' === $shaped['status'] ) {
			$this->mark_complete( (int) $row['course_id'], (int) $quiz_id, 'quiz' );
		}
		return $shaped;
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
		return $this->finished_attempts(
			array(
				'per_page' => (int) $per_page,
				'paged'    => max( 1, (int) $page ),
			),
			$user_id
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
	 * Masteriyo's checkout with the course in the cart.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		$course = masteriyo_get_course( (int) $course_id );
		return $course ? (string) $course->add_to_cart_url() : (string) get_permalink( $course_id );
	}

	/**
	 * The course a section, lesson or quiz belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		$type = get_post_type( $post_id );
		if ( 'mto-course' === $type ) {
			return (int) $post_id;
		}
		return in_array( $type, array( 'mto-section', 'mto-lesson', 'mto-quiz' ), true ) ? (int) get_post_meta( $post_id, '_course_id', true ) : 0;
	}

	/**
	 * Enrolled users.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		$query = new UserCourseQuery(
			array(
				'course_id' => (int) $course_id,
				'status'    => UserCourseStatus::ACTIVE,
				'per_page'  => -1,
			)
		);
		$ids   = array();
		foreach ( (array) $query->get_user_courses() as $user_course ) {
			$ids[] = (int) $user_course->get_user_id();
		}
		return array_values( array_unique( $ids ) );
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
		$query = new UserCourseQuery(
			array(
				'user_id'  => (int) $user_id,
				'status'   => UserCourseStatus::ACTIVE,
				'per_page' => -1,
				'orderby'  => 'id',
				'order'    => 'DESC',
			)
		);
		$ids   = array();
		foreach ( (array) $query->get_user_courses() as $user_course ) {
			$course_id = (int) $user_course->get_course_id();
			if ( $this->live( $course_id, 'mto-course' ) && masteriyo_can_start_course( $course_id, (int) $user_id ) ) {
				$ids[] = $course_id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * Masteriyo sells courses through its own checkout.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		return true;
	}

	/**
	 * Masteriyo orders, newest first.
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
				'post_type'      => 'mto-order',
				'post_status'    => 'any',
				'posts_per_page' => (int) $per_page,
				'paged'          => max( 1, (int) $page ),
				'orderby'        => 'date',
				'order'          => 'DESC',
				'fields'         => 'ids',
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => '_customer_id',
						'value' => (int) $user_id,
					),
				),
			)
		);
		$items = array();
		foreach ( $query->posts as $order_id ) {
			$order = masteriyo_get_order( (int) $order_id );
			if ( $order ) {
				$items[] = $this->order_shape( $order );
			}
		}
		return array(
			'items' => $items,
			'total' => (int) $query->found_posts,
		);
	}

	/**
	 * Order shape.
	 *
	 * @param \Masteriyo\Models\Order\Order $order Order.
	 * @return array
	 */
	private function order_shape( $order ) {
		$status   = (string) $order->get_status();
		$map      = array(
			'completed'  => 'completed',
			'pending'    => 'pending',
			'processing' => 'processing',
			'on-hold'    => 'on_hold',
			'cancelled'  => 'cancelled',
			'refunded'   => 'refunded',
			'failed'     => 'failed',
		);
		$statuses = function_exists( 'masteriyo_get_order_statuses' ) ? (array) masteriyo_get_order_statuses() : array();
		$lines    = array();
		foreach ( (array) $order->get_items() as $item ) {
			$course_id = method_exists( $item, 'get_course_id' ) ? (int) $item->get_course_id() : 0;
			$lines[]   = array(
				'name'      => (string) $item->get_name(),
				'course_id' => $course_id ? $course_id : null,
			);
		}
		$created = $order->get_date_created();
		$label   = $statuses[ $status ] ?? $statuses[ 'mto-' . $status ] ?? ucfirst( str_replace( '-', ' ', $status ) );
		return array(
			'id'           => (int) $order->get_id(),
			'number'       => (string) $order->get_id(),
			'status'       => $map[ $status ] ?? 'pending',
			'status_label' => is_array( $label ) ? (string) ( $label['label'] ?? $status ) : (string) $label,
			'total'        => Money::plain( masteriyo_price( $order->get_total(), array( 'currency' => $order->get_currency() ) ) ),
			'created_at'   => $created ? gmdate( 'Y-m-d\TH:i:s\Z', $created->getTimestamp() ) : null,
			'items'        => $lines,
		);
	}

	/**
	 * Approved reviews, newest first.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int, summary: array}
	 */
	public function reviews( $course_id, $user_id, $page, $per_page ) {
		$args  = array(
			'post_id' => (int) $course_id,
			'type'    => 'mto_course_review',
			'status'  => 'approve',
			'parent'  => 0,
		);
		$total = (int) get_comments( array_merge( $args, array( 'count' => true ) ) );
		$rows  = get_comments(
			array_merge(
				$args,
				array(
					'number'  => (int) $per_page,
					'offset'  => ( max( 1, (int) $page ) - 1 ) * (int) $per_page,
					'orderby' => 'comment_ID',
					'order'   => 'DESC',
				)
			)
		);
		$items = array();
		foreach ( (array) $rows as $row ) {
			$items[] = $this->review_shape( $row, $user_id );
		}
		$course = masteriyo_get_course( (int) $course_id );
		$counts = array();
		foreach ( $course ? (array) $course->get_rating_counts() : array() as $star => $count ) {
			$counts[ (int) $star ] = (int) $count;
		}
		return array(
			'items'   => $items,
			'total'   => $total,
			'summary' => self::rating_summary( $counts ),
		);
	}

	/**
	 * The user's review.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|null
	 */
	public function my_review( $course_id, $user_id ) {
		$row = $user_id ? $this->review_row( $course_id, $user_id ) : null;
		return $row ? $this->review_shape( $row, $user_id ) : null;
	}

	/**
	 * Writes or edits a review through Masteriyo's review route.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param int    $rating    1 to 5.
	 * @param string $text      Review text.
	 * @return array|WP_Error
	 */
	public function save_review( $course_id, $user_id, $rating, $text ) {
		$course = masteriyo_get_course( (int) $course_id );
		if ( ! $course || ! $course->get_reviews_allowed() ) {
			return self::disabled( __( 'Reviews are turned off for this course.', 'yallapp' ) );
		}
		$existing = $this->review_row( $course_id, $user_id );
		$params   = array(
			'course_id' => (int) $course_id,
			'rating'    => max( 1, min( 5, (int) $rating ) ),
			'content'   => (string) $text,
		);
		$saved    = $existing
			? $this->rest( 'PUT', '/masteriyo/v1/courses/reviews/' . (int) $existing->comment_ID, $params )
			: $this->rest(
				'POST',
				'/masteriyo/v1/courses/reviews',
				array_merge(
					$params,
					array(
						'title'     => wp_trim_words( (string) $text, 8, '…' ),
						'author_id' => (int) $user_id,
					)
				)
			);
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		clean_comment_cache( $existing ? (int) $existing->comment_ID : (int) ( $saved['id'] ?? 0 ) );
		$review = $this->my_review( $course_id, $user_id );
		return $review ? $review : new WP_Error( 'review_failed', __( 'Your review could not be saved. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * Whether students can ask questions: Masteriyo's learn page Q&A setting.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function qna_enabled( $course_id ) {
		return $this->features()['qna'];
	}

	/**
	 * Questions, newest first.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int}
	 */
	public function questions( $course_id, $user_id, $page, $per_page ) {
		$args  = array(
			'post_id' => (int) $course_id,
			'type'    => 'mto_course_qa',
			'status'  => 'approve',
			'parent'  => 0,
		);
		$total = (int) get_comments( array_merge( $args, array( 'count' => true ) ) );
		$rows  = get_comments(
			array_merge(
				$args,
				array(
					'number'  => (int) $per_page,
					'offset'  => ( max( 1, (int) $page ) - 1 ) * (int) $per_page,
					'orderby' => 'comment_ID',
					'order'   => 'DESC',
				)
			)
		);
		$items = array();
		foreach ( (array) $rows as $row ) {
			$items[] = $this->question_entry( $row, $user_id );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * A question with its answers, oldest first.
	 *
	 * @param int $question_id Question ID.
	 * @param int $user_id     Current user.
	 * @return array|null
	 */
	public function question( $question_id, $user_id ) {
		$row = $this->question_row( $question_id );
		if ( ! $row ) {
			return null;
		}
		$answers = array();
		foreach ( $this->answer_rows( (int) $row->comment_ID ) as $answer ) {
			$answers[] = array(
				'id'         => (int) $answer->comment_ID,
				'text'       => self::plain_text( (string) $answer->comment_content ),
				'author'     => $this->person( (int) $answer->user_id, $this->teaches( (int) $answer->user_id, (int) $answer->comment_post_ID ) ),
				'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $answer->comment_date_gmt, false ),
				'mine'       => $user_id > 0 && (int) $answer->user_id === (int) $user_id,
			);
		}
		$thread            = $this->question_entry( $row, $user_id );
		$thread['answers'] = $answers;
		return $thread;
	}

	/**
	 * Asks a question through Masteriyo's Q&A route.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param string $text      Question.
	 * @return array|WP_Error
	 */
	public function ask( $course_id, $user_id, $text ) {
		if ( ! $this->qna_enabled( $course_id ) ) {
			return parent::ask( $course_id, $user_id, $text );
		}
		$saved = $this->rest(
			'POST',
			'/masteriyo/v1/courses/questions-answers',
			array(
				'course_id' => (int) $course_id,
				'user_id'   => (int) $user_id,
				'content'   => (string) $text,
			)
		);
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		$row = $this->question_row( (int) ( $saved['id'] ?? 0 ) );
		return $row ? $this->question_entry( $row, $user_id ) : new WP_Error( 'question_failed', __( 'Your question could not be sent. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * Replies to a question through Masteriyo's Q&A route.
	 *
	 * @param int    $question_id Question ID.
	 * @param int    $user_id     User ID.
	 * @param string $text        Reply.
	 * @return array|WP_Error
	 */
	public function answer( $question_id, $user_id, $text ) {
		$row = $this->question_row( $question_id );
		if ( ! $row ) {
			return self::not_found( __( 'Question not found.', 'yallapp' ) );
		}
		if ( ! $this->qna_enabled( (int) $row->comment_post_ID ) ) {
			return parent::answer( $question_id, $user_id, $text );
		}
		$saved = $this->rest(
			'POST',
			'/masteriyo/v1/courses/questions-answers',
			array(
				'course_id' => (int) $row->comment_post_ID,
				'user_id'   => (int) $user_id,
				'parent'    => (int) $row->comment_ID,
				'content'   => (string) $text,
			)
		);
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		$answer = get_comment( (int) ( $saved['id'] ?? 0 ) );
		if ( ! $answer ) {
			return new WP_Error( 'answer_failed', __( 'Your reply could not be sent. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
		}
		return array(
			'id'         => (int) $answer->comment_ID,
			'text'       => self::plain_text( (string) $answer->comment_content ),
			'author'     => $this->person( (int) $answer->user_id, $this->teaches( (int) $answer->user_id, (int) $answer->comment_post_ID ) ),
			'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $answer->comment_date_gmt, false ),
			'mine'       => true,
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
		$course = masteriyo_get_course( $post->ID );
		$image  = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		$count  = $course ? (int) $course->get_rating_count() : 0;
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $post->ID ),
			'lesson_count' => $course ? (int) masteriyo_get_lessons_count( $course ) : 0,
			'rating'       => $count ? round( (float) $course->get_average_rating(), 1 ) : null,
			'rating_count' => $count,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => false,
		);
	}

	/**
	 * Price shape.
	 *
	 * @param int $course_id Course ID.
	 * @return array
	 */
	private function price( $course_id ) {
		$course = masteriyo_get_course( (int) $course_id );
		if ( ! $course || $this->is_free( $course_id ) ) {
			return self::price_shape( true );
		}
		$regular = (float) $course->get_regular_price();
		$sale    = (float) $course->get_sale_price();
		$current = (float) $course->get_price();
		return self::price_shape( false, $regular, $sale, masteriyo_get_currency(), $current > 0 ? masteriyo_price( $current ) : '' );
	}

	/**
	 * Gives an enrolled user Masteriyo's student role, as Masteriyo's own sign-up form does,
	 * so its course progress, review and Q&A routes accept them. Accounts made in the app
	 * (or anywhere else in WordPress) start with the site's default role instead.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	private static function make_student( $user_id ) {
		$user = get_userdata( (int) $user_id );
		if ( $user && ! $user->has_cap( 'create_course_qa' ) && ! $user->has_cap( 'manage_options' ) && get_role( 'masteriyo_student' ) ) {
			$user->add_role( 'masteriyo_student' );
		}
	}

	/**
	 * The student's user-course record.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return \Masteriyo\Models\UserCourse|null
	 */
	private function user_course( $course_id, $user_id ) {
		$query = new UserCourseQuery(
			array(
				'course_id' => (int) $course_id,
				'user_id'   => (int) $user_id,
				'per_page'  => 1,
			)
		);
		$found = (array) $query->get_user_courses();
		return $found ? $found[0] : null;
	}

	/**
	 * Lesson and quiz IDs of a course.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	private function course_item_ids( $course_id ) {
		$ids = array();
		foreach ( masteriyo_get_course_contents( (int) $course_id ) as $object ) {
			if ( in_array( $object->get_post_type(), array( 'mto-lesson', 'mto-quiz' ), true ) ) {
				$ids[] = (int) $object->get_id();
			}
		}
		return $ids;
	}

	/**
	 * Lessons and quizzes the student completed in a course.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return int[]
	 */
	private function completed_items( $course_id, $user_id ) {
		$key = (int) $course_id . ':' . (int) $user_id;
		if ( ! isset( $this->completed[ $key ] ) ) {
			$progress = masteriyo_get_course_progress_by_user_and_course( (int) $user_id, (int) $course_id );
			$ids      = array();
			if ( $progress ) {
				$query = new CourseProgressItemQuery(
					array(
						'user_id'     => (int) $user_id,
						'progress_id' => $progress->get_id(),
						'per_page'    => -1,
					)
				);
				foreach ( (array) $query->get_course_progress_items() as $item ) {
					if ( $item->get_completed() ) {
						$ids[] = (int) $item->get_item_id();
					}
				}
			}
			$this->completed[ $key ] = $ids;
		}
		return $this->completed[ $key ];
	}

	/**
	 * Marks a lesson or quiz completed with Masteriyo's course progress routes, starting the
	 * course progress first when the student hasn't opened the course yet.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $item_id   Lesson or quiz ID.
	 * @param string $type      lesson or quiz.
	 * @return true|WP_Error
	 */
	private function mark_complete( $course_id, $item_id, $type ) {
		if ( ! masteriyo_get_course_progress_by_user_and_course( get_current_user_id(), (int) $course_id ) ) {
			$started = $this->rest( 'POST', '/masteriyo/v1/course-progress', array( 'course_id' => (int) $course_id ) );
			if ( is_wp_error( $started ) ) {
				return $started;
			}
		}
		$saved           = $this->rest(
			'POST',
			'/masteriyo/v1/course-progress/items',
			array(
				'course_id' => (int) $course_id,
				'item_id'   => (int) $item_id,
				'item_type' => $type,
				'completed' => true,
			)
		);
		$this->completed = array();
		return is_wp_error( $saved ) ? $saved : true;
	}

	/**
	 * Runs one of Masteriyo's REST routes as the current user.
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $params Body parameters.
	 * @return array|WP_Error Response data.
	 */
	private function rest( $method, $route, array $params ) {
		$request = new WP_REST_Request( $method, $route );
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
		$response = rest_do_request( $request );
		$data     = rest_get_server()->response_to_data( $response, false );
		if ( $response->is_error() ) {
			$error = $response->as_error();
			// Masteriyo's own message, in English, with server errors reported as 500.
			return new WP_Error(
				(string) $error->get_error_code(),
				(string) $error->get_error_message(),
				array( 'status' => $response->get_status() < 500 ? $response->get_status() : 500 )
			);
		}
		return is_array( $data ) ? $data : array();
	}

	/**
	 * Quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return \Masteriyo\Models\Quiz|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz = $this->published( $quiz_id, 'mto-quiz' ) ? masteriyo_get_quiz( (int) $quiz_id ) : null;
		if ( ! $quiz ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		$course_id = (int) $quiz->get_course_id();
		if ( ! $user_id || ! ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		return $quiz;
	}

	/**
	 * The quiz's questions in order.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return \Masteriyo\Models\Question\Question[]
	 */
	private function questions_of( $quiz_id ) {
		$questions = array_values( (array) masteriyo_get_quiz_questions( (int) $quiz_id ) );
		usort(
			$questions,
			static function ( $a, $b ) {
				$order = (int) $a->get_menu_order() - (int) $b->get_menu_order();
				return 0 !== $order ? $order : (int) $a->get_id() - (int) $b->get_id();
			}
		);
		return $questions;
	}

	/**
	 * The pass mark as a percentage of the full mark.
	 *
	 * @param \Masteriyo\Models\Quiz $quiz Quiz.
	 * @return int
	 */
	private function pass_percent( $quiz ) {
		$full = (float) $quiz->get_full_mark();
		return $full > 0 ? (int) round( (float) $quiz->get_pass_mark() * 100 / $full ) : 0;
	}

	/**
	 * Question shape.
	 *
	 * @param \Masteriyo\Models\Question\Question $question Question.
	 * @param bool                                $native   Whether the app answers natively.
	 * @param \Masteriyo\Models\Quiz              $quiz     Quiz.
	 * @return array
	 */
	private function question_shape( $question, $native, $quiz ) {
		$types   = array(
			'single-choice'   => 'single_choice',
			'multiple-choice' => 'multiple_choice',
			'true-false'      => 'true_false',
			'text-answer'     => 'short_answer',
			'short-answer'    => 'short_answer',
			'fill-in-blanks'  => 'fill_in_blank',
			'sortable'        => 'ordering',
			'matching'        => 'matching',
			'image-matching'  => 'matching',
		);
		$options = array();
		if ( $native ) {
			foreach ( array_values( (array) $question->get_answers( 'edit' ) ) as $index => $answer ) {
				$options[] = array(
					'id'        => (string) $index,
					'label'     => self::plain_text( (string) ( $answer->name ?? '' ) ),
					'image_url' => null,
				);
			}
		}
		$description = trim( (string) $question->get_description() );
		return array(
			'id'               => (int) $question->get_id(),
			'type'             => $types[ $question->get_type() ] ?? 'other',
			'title'            => wp_strip_all_tags( (string) $question->get_name() ),
			'description_html' => '' !== $description ? wp_kses_post( wpautop( $description ) ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : (string) masteriyo_get_course_item_learn_page_url( masteriyo_get_course( $quiz->get_course_id() ), $quiz ),
			'options'          => $options,
			'points'           => (float) $question->get_points(),
		);
	}

	/**
	 * Finished attempts, newest first.
	 *
	 * @param array $filters Extra query variables (quiz_id, per_page, paged).
	 * @param int   $user_id User ID.
	 * @return array{items: array[], total: int}
	 */
	private function finished_attempts( array $filters, $user_id ) {
		$base  = array_merge(
			array(
				'user_id' => (int) $user_id,
				'status'  => 'attempt_ended',
			),
			array_intersect_key( $filters, array( 'quiz_id' => true ) )
		);
		$all   = self::attempt_rows( $base );
		$items = isset( $filters['per_page'] ) ? self::slice( $all, $filters['paged'] ?? 1, $filters['per_page'] ) : $all;
		return array(
			'items' => array_map(
				function ( $row ) {
					return $this->attempt_result( (array) $row );
				},
				$items
			),
			'total' => count( $all ),
		);
	}

	/**
	 * Quiz attempt rows, newest first, with the paging and order masteriyo_get_quiz_attempts()
	 * expects.
	 *
	 * @param array $vars Filters: id, quiz_id, user_id, status.
	 * @return object[]
	 */
	private static function attempt_rows( array $vars ) {
		return (array) masteriyo_get_quiz_attempts(
			array_merge(
				array(
					'orderby'  => 'id',
					'order'    => 'DESC',
					'per_page' => 1000,
					'paged'    => 1,
				),
				$vars
			)
		);
	}

	/**
	 * AttemptResult shape. Passed means the earned marks reached the quiz's pass mark.
	 *
	 * @param array $row Quiz attempt row.
	 * @return array
	 */
	private function attempt_result( array $row ) {
		$quiz   = masteriyo_get_quiz( (int) $row['quiz_id'] );
		$total  = (float) ( $row['total_marks'] ?? 0 );
		$earned = (float) ( $row['earned_marks'] ?? 0 );
		$passed = $quiz && $earned >= (float) $quiz->get_pass_mark();
		$ended  = (string) ( $row['attempt_ended_at'] ?? '' );
		return array(
			'attempt_id'    => (int) $row['id'],
			'quiz_id'       => (int) $row['quiz_id'],
			'quiz_title'    => (string) get_post_field( 'post_title', (int) $row['quiz_id'] ),
			'status'        => $passed ? 'passed' : 'failed',
			'score_percent' => $total > 0 ? round( $earned * 100 / $total, 2 ) : 0.0,
			'finished_at'   => '' !== $ended ? self::iso( $ended ) : null,
		);
	}

	/**
	 * The user's review comment.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return \WP_Comment|null
	 */
	private function review_row( $course_id, $user_id ) {
		$rows = get_comments(
			array(
				'post_id' => (int) $course_id,
				'user_id' => (int) $user_id,
				'type'    => 'mto_course_review',
				'parent'  => 0,
				'status'  => 'all',
				'number'  => 1,
				'orderby' => 'comment_ID',
				'order'   => 'DESC',
			)
		);
		return $rows ? $rows[0] : null;
	}

	/**
	 * Review shape.
	 *
	 * @param \WP_Comment $row     Review comment.
	 * @param int         $user_id Current user.
	 * @return array
	 */
	private function review_shape( $row, $user_id ) {
		return array(
			'id'         => (int) $row->comment_ID,
			'rating'     => max( 1, min( 5, (int) $row->comment_karma ) ),
			'text'       => self::plain_text( (string) $row->comment_content ),
			'author'     => $this->person( (int) $row->user_id, $this->teaches( (int) $row->user_id, (int) $row->comment_post_ID ) ),
			'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
			'status'     => '1' === (string) $row->comment_approved ? 'approved' : 'pending',
			'mine'       => $user_id > 0 && (int) $row->user_id === (int) $user_id,
		);
	}

	/**
	 * A question comment.
	 *
	 * @param int $question_id Question ID.
	 * @return \WP_Comment|null
	 */
	private function question_row( $question_id ) {
		$row = $question_id ? get_comment( (int) $question_id ) : null;
		return ( $row && 'mto_course_qa' === $row->comment_type && 0 === (int) $row->comment_parent && '1' === (string) $row->comment_approved ) ? $row : null;
	}

	/**
	 * Answers to a question, oldest first.
	 *
	 * @param int $question_id Question ID.
	 * @return \WP_Comment[]
	 */
	private function answer_rows( $question_id ) {
		return (array) get_comments(
			array(
				'parent'  => (int) $question_id,
				'type'    => 'mto_course_qa',
				'status'  => 'approve',
				'orderby' => 'comment_ID',
				'order'   => 'ASC',
			)
		);
	}

	/**
	 * CourseQuestion shape.
	 *
	 * @param \WP_Comment $row     Question comment.
	 * @param int         $user_id Current user.
	 * @return array
	 */
	private function question_entry( $row, $user_id ) {
		return array(
			'id'           => (int) $row->comment_ID,
			'course_id'    => (int) $row->comment_post_ID,
			'text'         => self::plain_text( (string) $row->comment_content ),
			'author'       => $this->person( (int) $row->user_id, $this->teaches( (int) $row->user_id, (int) $row->comment_post_ID ) ),
			'created_at'   => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
			'answer_count' => count( $this->answer_rows( (int) $row->comment_ID ) ),
			'mine'         => $user_id > 0 && (int) $row->user_id === (int) $user_id,
		);
	}
}
