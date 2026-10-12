<?php
/**
 * Tutor LMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_Post;
use WP_Query;
use Yallapp\Commerce\Money;
use Yallapp\Commerce\Woo_Orders;

/**
 * Tutor LMS 2.0.6 and later, Free and Pro. Uses tutor_utils(), which keeps moved
 * helpers callable across versions.
 */
class Tutor_Adapter implements Lms_Adapter {

	const NATIVE_QUESTION_TYPES = array( 'true_false', 'single_choice', 'multiple_choice' );

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'tutor';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'TUTOR_VERSION' ) ? (string) TUTOR_VERSION : '';
	}

	/**
	 * Whether Tutor LMS Pro is active.
	 *
	 * @return bool
	 */
	public function is_pro() {
		return defined( 'TUTOR_PRO_VERSION' );
	}

	/**
	 * Feature flags.
	 *
	 * @return array<string, bool>
	 */
	public function features() {
		return array(
			'certificates' => $this->is_pro() && ( class_exists( '\TUTOR_CERT\Certificate' ) || has_filter( 'yallapp_certificate_url' ) ),
			'quizzes'      => true,
			'wishlist'     => true,
			'reviews'      => (bool) tutor_utils()->get_option( 'enable_course_review', true ),
			'qna'          => (bool) tutor_utils()->get_option( 'enable_q_and_a_on_course', true ),
		);
	}

	/**
	 * Connects Tutor's enrollment and Q&A hooks.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Called with (question ID, asker ID, course ID, replier ID).
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action( 'tutor_after_enrolled', $on_enrolled, 10, 2 ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		add_action(
			'tutor_after_answer_to_question', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
			static function ( $answer_id ) use ( $on_answered ) {
				$answer   = get_comment( $answer_id );
				$question = $answer && $answer->comment_parent ? get_comment( $answer->comment_parent ) : null;
				if ( $question ) {
					call_user_func( $on_answered, (int) $question->comment_ID, (int) $question->user_id, (int) $question->comment_post_ID, (int) $answer->user_id );
				}
			}
		);
	}

	/**
	 * Post types.
	 *
	 * @return array{course: string, lesson: string, quiz: string, announcement: string}
	 */
	public function post_types() {
		return array(
			'course'       => tutor()->course_post_type,
			'lesson'       => tutor()->lesson_post_type,
			'quiz'         => 'tutor_quiz',
			'announcement' => (string) apply_filters( 'tutor_announcement_post_type', 'tutor_announcements' ), // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		);
	}

	/**
	 * Course categories.
	 *
	 * @return array[]
	 */
	public function categories() {
		$terms = get_terms(
			array(
				'taxonomy'   => 'course-category',
				'hide_empty' => true,
			)
		);
		if ( is_wp_error( $terms ) ) {
			return array();
		}
		return array_map( array( $this, 'category_shape' ), $terms );
	}

	/**
	 * Lists courses.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = array(
			'post_type'      => tutor()->course_post_type,
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, (int) ( $args['per_page'] ?? 20 ) ),
			'paged'          => max( 1, (int) ( $args['page'] ?? 1 ) ),
		);
		if ( ! empty( $args['ids'] ) ) {
			$query_args['post__in'] = array_map( 'absint', (array) $args['ids'] );
			$query_args['orderby']  = 'post__in';
		}
		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = (string) $args['search'];
		}
		if ( ! empty( $args['category'] ) ) {
			$query_args['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				array(
					'taxonomy' => 'course-category',
					'field'    => 'term_id',
					'terms'    => (int) $args['category'],
				),
			);
		}
		$price = $args['price'] ?? 'all';
		if ( 'free' === $price ) {
			$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'OR',
				array(
					'key'   => '_tutor_course_price_type',
					'value' => 'free',
				),
				array(
					'key'     => '_tutor_course_price_type',
					'compare' => 'NOT EXISTS',
				),
			);
		} elseif ( 'paid' === $price ) {
			$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => '_tutor_course_price_type',
					'value'   => 'free',
					'compare' => '!=',
				),
			);
		}
		$orderby = $args['orderby'] ?? 'newest';
		if ( empty( $args['ids'] ) ) {
			if ( 'title' === $orderby ) {
				$query_args['orderby'] = 'title';
				$query_args['order']   = 'ASC';
			} elseif ( 'popular' === $orderby ) {
				$query_args['orderby'] = array(
					'comment_count' => 'DESC',
					'date'          => 'DESC',
				);
			} else {
				$query_args['orderby'] = 'date';
				$query_args['order']   = 'DESC';
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
		$post = $this->published( $course_id, tutor()->course_post_type );
		if ( ! $post ) {
			return null;
		}
		$duration = get_post_meta( $post->ID, '_course_duration', true );
		$minutes  = is_array( $duration ) ? ( (int) ( $duration['hours'] ?? 0 ) * 60 + (int) ( $duration['minutes'] ?? 0 ) ) : 0;
		$level    = (string) get_post_meta( $post->ID, '_tutor_course_level', true );
		$terms    = get_the_terms( $post->ID, 'course-category' );
		$video    = $this->video( $post->ID );

		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => $video,
				'duration_minutes' => $minutes > 0 ? $minutes : null,
				'level'            => '' !== $level ? ucwords( str_replace( '_', ' ', $level ) ) : null,
				'has_certificate'  => $this->features()['certificates'] && 'none' !== get_post_meta( $post->ID, 'tutor_course_certificate_template', true ),
				'categories'       => is_array( $terms ) ? array_map( array( $this, 'category_shape' ), $terms ) : array(),
				'has_checkout'     => ! $this->is_free( $post->ID ),
				'qna'              => $this->qna_enabled( $post->ID ),
			)
		);
	}

	/**
	 * Topics and items.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array[]|null
	 */
	public function curriculum( $course_id, $user_id ) {
		$course = $this->published( $course_id, tutor()->course_post_type );
		if ( ! $course ) {
			return null;
		}
		$access = $this->has_course_access( $course->ID, $user_id );
		$topics = array();
		foreach ( $this->topics( $course->ID ) as $topic ) {
			$items = array();
			foreach ( $this->topic_contents( $topic->ID ) as $item ) {
				$items[] = $this->curriculum_item( $item, $user_id, $access );
			}
			$topics[] = array(
				'id'    => (int) $topic->ID,
				'title' => (string) $topic->post_title,
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
		return $user_id > 0 && (bool) tutor_utils()->is_enrolled( $course_id, $user_id );
	}

	/**
	 * Whether a course is free.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		return ! tutor_utils()->is_course_purchasable( $course_id );
	}

	/**
	 * Enrolls in a free course.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function enroll_free( $course_id, $user_id ) {
		if ( ! $this->published( $course_id, tutor()->course_post_type ) ) {
			return new WP_Error( 'not_found', __( 'Course not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		if ( ! $this->is_free( $course_id ) ) {
			return new WP_Error( 'purchase_required', __( 'This course is not free.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
			$enrolled = tutor_utils()->do_enroll( $course_id, 0, $user_id );
			if ( ! $enrolled ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
		}
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => $this->enrolled_at( $course_id, $user_id ),
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
		$enrolled  = array_map( 'intval', (array) tutor_utils()->get_enrolled_courses_ids_by_user( $user_id ) );
		$completed = array_map( 'intval', (array) tutor_utils()->get_completed_courses_ids_by_user( $user_id ) );
		$ids       = 'completed' === $status ? array_values( array_intersect( $enrolled, $completed ) ) : array_values( array_diff( $enrolled, $completed ) );
		$total     = count( $ids );
		$ids       = array_slice( $ids, ( max( 1, $page ) - 1 ) * $per_page, $per_page );
		$items     = array();
		foreach ( $ids as $course_id ) {
			$post = $this->published( $course_id, tutor()->course_post_type );
			if ( $post ) {
				$items[] = $this->my_course( $post, $user_id );
			}
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * MyCourse shape for one course, for the home screen.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|null
	 */
	public function my_course_by_id( $course_id, $user_id ) {
		$post = $this->published( $course_id, tutor()->course_post_type );
		return $post ? $this->my_course( $post, $user_id ) : null;
	}

	/**
	 * Wishlisted courses.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function wishlist( $user_id ) {
		$items = array();
		foreach ( (array) tutor_utils()->get_wishlist( $user_id ) as $row ) {
			$post = is_object( $row ) && isset( $row->ID ) ? get_post( (int) $row->ID ) : null;
			if ( $post instanceof WP_Post ) {
				$items[] = $this->summary( $post, $user_id );
			}
		}
		return $items;
	}

	/**
	 * Adds or removes a wishlist entry, the way Tutor stores it.
	 *
	 * @param int  $user_id   User ID.
	 * @param int  $course_id Course ID.
	 * @param bool $on        Add when true.
	 * @return true|WP_Error
	 */
	public function set_wishlist( $user_id, $course_id, $on ) {
		if ( ! $this->published( $course_id, tutor()->course_post_type ) ) {
			return new WP_Error( 'not_found', __( 'Course not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		$listed = (bool) tutor_utils()->is_wishlisted( $course_id, $user_id );
		if ( $on && ! $listed ) {
			add_user_meta( $user_id, '_tutor_course_wishlist', $course_id );
		} elseif ( ! $on && $listed ) {
			delete_user_meta( $user_id, '_tutor_course_wishlist', $course_id );
		}
		return true;
	}

	/**
	 * Raw lesson data.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	public function lesson( $lesson_id, $user_id ) {
		$post = $this->published( $lesson_id, tutor()->lesson_post_type );
		if ( ! $post ) {
			return null;
		}
		$course_id = (int) tutor_utils()->get_course_id_by( 'lesson', $post->ID );
		$lessons   = array();
		foreach ( $this->topics( $course_id ) as $topic ) {
			foreach ( $this->topic_contents( $topic->ID ) as $item ) {
				if ( tutor()->lesson_post_type === $item->post_type ) {
					$lessons[] = (int) $item->ID;
				}
			}
		}
		$index = array_search( (int) $post->ID, $lessons, true );

		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => $this->video( $post->ID ),
			'attachments' => $this->attachments( $post->ID ),
			'preview'     => (bool) get_post_meta( $post->ID, '_is_preview', true ),
			'completed'   => $user_id > 0 && (bool) tutor_utils()->is_completed_lesson( $post->ID, $user_id ),
			'previous_id' => ( false !== $index && $index > 0 ) ? $lessons[ $index - 1 ] : null,
			'next_id'     => ( false !== $index && isset( $lessons[ $index + 1 ] ) ) ? $lessons[ $index + 1 ] : null,
		);
	}

	/**
	 * Whether a user may open a lesson.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		if ( get_post_meta( $lesson_id, '_is_preview', true ) ) {
			return true;
		}
		$course_id = (int) tutor_utils()->get_course_id_by( 'lesson', $lesson_id );
		return $course_id > 0 && $this->has_course_access( $course_id, $user_id );
	}

	/**
	 * Marks a lesson complete, firing Tutor's own hooks.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$course_id = (int) tutor_utils()->get_course_id_by( 'lesson', $lesson_id );
		if ( ! $course_id || ! $this->is_enrolled( $course_id, $user_id ) ) {
			return new WP_Error( 'not_enrolled', __( 'Enroll in this course to continue.', 'yallapp' ), array( 'status' => 403 ) );
		}
		/** This filter is documented in Tutor LMS. */
		$valid = apply_filters( 'tutor_validate_lesson_complete', true, $user_id, $lesson_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		if ( ! $valid ) {
			return new WP_Error( 'cannot_complete', __( 'This lesson can not be completed yet.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( ! tutor_utils()->is_completed_lesson( $lesson_id, $user_id ) ) {
			/** This action is documented in Tutor LMS. */
			do_action( 'tutor_lesson_completed_before', $lesson_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
			tutor_utils()->mark_lesson_complete( $lesson_id, $user_id );
			/** This action is documented in Tutor LMS. */
			do_action( 'tutor_lesson_completed_email_after', $lesson_id, $user_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
			// Tutor's own listener redirects the browser and exits; the app needs JSON, so it is skipped.
			$removed = $this->remove_tutor_listener( 'tutor_lesson_completed_after', 'tutor_lesson_completed_after' );
			/** This action is documented in Tutor LMS. */
			do_action( 'tutor_lesson_completed_after', $lesson_id, $user_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
			foreach ( $removed as $listener ) {
				add_action( 'tutor_lesson_completed_after', $listener[0], $listener[1] );
			}
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Detaches Tutor's listeners with the given method name from a hook.
	 *
	 * @param string $hook   Hook name.
	 * @param string $method Method name on a TUTOR\\ class.
	 * @return array[] Removed listeners as [callback, priority], to add back afterwards.
	 */
	private function remove_tutor_listener( $hook, $method ) {
		global $wp_filter;
		$removed = array();
		if ( empty( $wp_filter[ $hook ] ) || ! $wp_filter[ $hook ] instanceof \WP_Hook ) {
			return $removed;
		}
		foreach ( $wp_filter[ $hook ]->callbacks as $priority => $callbacks ) {
			foreach ( $callbacks as $callback ) {
				$function = $callback['function'];
				if ( is_array( $function ) && is_object( $function[0] ) && $method === $function[1] && 0 === strpos( get_class( $function[0] ), 'TUTOR\\' ) ) {
					remove_action( $hook, $function, $priority );
					$removed[] = array( $function, $priority );
				}
			}
		}
		return $removed;
	}

	/**
	 * Course progress.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$stats = (array) tutor_utils()->get_course_completed_percent( $course_id, $user_id, true );
		return array(
			'course_id'        => (int) $course_id,
			'completed_items'  => (int) ( $stats['completed_count'] ?? 0 ),
			'total_items'      => (int) ( $stats['total_count'] ?? 0 ),
			'percent'          => min( 100, (int) ( $stats['completed_percent'] ?? 0 ) ),
			'course_completed' => (bool) tutor_utils()->is_completed_course( $course_id, $user_id ),
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
		$attempts = $this->user_attempts( $quiz->ID, $user_id );
		$finished = array_values(
			array_filter(
				$attempts,
				static function ( $a ) {
					return 'attempt_started' !== $a->attempt_status;
				}
			)
		);
		return array(
			'id'                 => (int) $quiz->ID,
			'course_id'          => (int) $this->course_of( $quiz->ID ),
			'title'              => (string) $quiz->post_title,
			'question_count'     => count( $this->quiz_questions( $quiz->ID ) ),
			'time_limit_seconds' => $this->time_limit( $quiz->ID ),
			'pass_percent'       => (int) tutor_utils()->get_quiz_option( $quiz->ID, 'passing_grade', 0 ),
			'attempts_allowed'   => $this->attempts_allowed( $quiz->ID ),
			'attempts_used'      => count( $finished ),
			'last_result'        => $finished ? $this->attempt_result( $finished[0] ) : null,
		);
	}

	/**
	 * Starts an attempt.
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
		$attempts = $this->user_attempts( $quiz->ID, $user_id );
		$used     = count(
			array_filter(
				$attempts,
				static function ( $a ) {
					return 'attempt_started' !== $a->attempt_status;
				}
			)
		);
		$allowed  = $this->attempts_allowed( $quiz->ID );
		if ( null !== $allowed && $used >= $allowed ) {
			return new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) );
		}

		$questions = $this->quiz_questions( $quiz->ID );
		$native    = $this->native_quizzes_supported();
		foreach ( $questions as $question ) {
			if ( ! in_array( $question->question_type, self::NATIVE_QUESTION_TYPES, true ) ) {
				$native = false;
			}
		}

		$course_id  = (int) $this->course_of( $quiz->ID );
		$attempt_id = 0;
		foreach ( $attempts as $attempt ) {
			if ( 'attempt_started' === $attempt->attempt_status ) {
				$attempt_id = (int) $attempt->attempt_id;
				break;
			}
		}
		if ( ! $attempt_id && $native ) {
			$attempt_id = (int) \TUTOR\Quiz::quiz_attempt( $course_id, $quiz->ID, $user_id );
		}

		$limit = (int) tutor_utils()->get_quiz_option( $quiz->ID, 'max_questions_for_answer', 0 );
		if ( $limit > 0 ) {
			$questions = array_slice( $questions, 0, $limit );
		}
		set_transient( 'yallapp_attempt_' . $attempt_id, wp_list_pluck( $questions, 'question_id' ), DAY_IN_SECONDS );

		$started = $attempt_id ? tutor_utils()->get_attempt( $attempt_id ) : null;
		$limit_s = $this->time_limit( $quiz->ID );
		$start   = $started ? strtotime( $started->attempt_started_at ) : time();
		$shaped  = array();
		foreach ( $questions as $question ) {
			$shaped[] = $this->question_shape( $question, $native, $quiz );
		}
		return array(
			'id'         => $attempt_id,
			'quiz_id'    => (int) $quiz->ID,
			'started_at' => gmdate( 'c', $start ),
			'ends_at'    => $limit_s ? gmdate( 'c', $start + $limit_s ) : null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Grades an attempt with Tutor's own grading.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$attempt = $attempt_id ? tutor_utils()->get_attempt( $attempt_id ) : null;
		if ( ! $attempt || (int) $attempt->user_id !== (int) $user_id || (int) $attempt->quiz_id !== (int) $quiz_id ) {
			return new WP_Error( 'not_found', __( 'Quiz attempt not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		if ( 'attempt_started' !== $attempt->attempt_status ) {
			return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( ! $this->native_quizzes_supported() ) {
			return new WP_Error( 'unsupported', __( 'Please take this quiz in the web view.', 'yallapp' ), array( 'status' => 409 ) );
		}

		$question_ids = get_transient( 'yallapp_attempt_' . $attempt_id );
		if ( ! is_array( $question_ids ) ) {
			$question_ids = wp_list_pluck( $this->quiz_questions( $quiz_id ), 'question_id' );
		}
		$question_ids = array_map( 'intval', $question_ids );
		$given        = array();
		foreach ( $answers as $answer ) {
			$question_id = (int) ( $answer['question_id'] ?? 0 );
			if ( ! in_array( $question_id, $question_ids, true ) ) {
				continue;
			}
			$options = array_values( array_filter( array_map( 'absint', (array) ( $answer['option_ids'] ?? array() ) ) ) );
			if ( ! $options ) {
				continue;
			}
			$question              = $this->quiz_question( $question_id );
			$given[ $question_id ] = ( $question && 'multiple_choice' === $question->question_type ) ? $options : (string) $options[0];
		}
		// Tutor ends the attempt only when at least one answer is present; unanswered questions score zero.
		if ( ! $given && $question_ids ) {
			$given[ $question_ids[0] ] = '0';
		}

		\TUTOR\Quiz::manage_attempt_answers(
			array(
				$attempt_id => array(
					'quiz_question_ids' => $question_ids,
					'quiz_question'     => $given,
				),
			),
			$attempt,
			$attempt_id,
			(int) $attempt->course_id,
			$user_id
		);
		delete_transient( 'yallapp_attempt_' . $attempt_id );

		$updated = tutor_utils()->get_attempt( $attempt_id );
		return $this->attempt_result( $updated ? $updated : $attempt );
	}

	/**
	 * Finished attempts.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function attempts( $user_id, $page, $per_page ) {
		global $wpdb;
		$table = $wpdb->prefix . 'tutor_quiz_attempts';
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Tutor's table.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND attempt_status <> %s", $user_id, 'attempt_started' ) );
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE user_id = %d AND attempt_status <> %s ORDER BY attempt_id DESC LIMIT %d OFFSET %d",
				$user_id,
				'attempt_started',
				$per_page,
				( max( 1, $page ) - 1 ) * $per_page
			)
		);
		// phpcs:enable
		return array(
			'items' => array_map( array( $this, 'attempt_result' ), (array) $rows ),
			'total' => $total,
		);
	}

	/**
	 * Certificates. Tutor LMS Pro's certificate add-on provides them; sites can also use the filter.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function certificates( $user_id ) {
		$items = array();
		foreach ( (array) tutor_utils()->get_completed_courses_ids_by_user( $user_id ) as $course_id ) {
			$url = $this->certificate_url( (int) $course_id, $user_id );
			if ( $url ) {
				$items[] = array(
					'course_id'    => (int) $course_id,
					'course_title' => get_the_title( $course_id ),
					'url'          => $url,
					'issued_at'    => null,
				);
			}
		}
		return $items;
	}

	/**
	 * Where the website sells the course.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		$monetize_by = tutor_utils()->get_option( 'monetize_by' );
		$product_id  = (int) tutor_utils()->get_course_product_id( $course_id );
		if ( 'wc' === $monetize_by && $product_id && function_exists( 'wc_get_checkout_url' ) ) {
			return add_query_arg( 'add-to-cart', $product_id, wc_get_checkout_url() );
		}
		return (string) get_permalink( $course_id );
	}

	/**
	 * The course a content item belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return 0;
		}
		if ( tutor()->course_post_type === $post->post_type ) {
			return (int) $post->ID;
		}
		if ( $this->post_types()['announcement'] === $post->post_type ) {
			return (int) $post->post_parent;
		}
		return (int) tutor_utils()->get_course_id_by_content( $post );
	}

	/**
	 * Enrolled users.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Tutor stores enrollments as posts; a direct query avoids loading them all.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT post_author FROM {$wpdb->posts} WHERE post_type = %s AND post_parent = %d AND post_status = %s", 'tutor_enrolled', $course_id, 'completed' ) );
		return array_map( 'intval', (array) $ids );
	}

	/**
	 * Courses a user is enrolled in.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id ) {
		return $user_id ? array_map( 'intval', (array) tutor_utils()->get_enrolled_courses_ids_by_user( $user_id ) ) : array();
	}

	/**
	 * Whether courses are sold, with Tutor's own checkout or WooCommerce.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		$monetize_by = tutor_utils()->get_option( 'monetize_by' );
		return 'tutor' === $monetize_by || ( 'wc' === $monetize_by && Woo_Orders::available() );
	}

	/**
	 * Orders, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function orders( $user_id, $page, $per_page ) {
		$monetize_by = tutor_utils()->get_option( 'monetize_by' );
		if ( 'wc' === $monetize_by ) {
			return Woo_Orders::for_user(
				$user_id,
				$page,
				$per_page,
				static function ( $product_id ) {
					$row = tutor_utils()->product_belongs_with_course( (int) $product_id );
					return $row ? (int) $row->post_id : 0;
				}
			);
		}
		if ( 'tutor' === $monetize_by ) {
			return $this->native_orders( $user_id, $page, $per_page );
		}
		return array(
			'items' => array(),
			'total' => 0,
		);
	}

	/**
	 * Orders from Tutor's own checkout (Tutor 3 and later).
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	private function native_orders( $user_id, $page, $per_page ) {
		global $wpdb;
		$orders = $wpdb->prefix . 'tutor_orders';
		$lines  = $wpdb->prefix . 'tutor_order_items';
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Tutor's order tables; names are built from the prefix.
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $orders ) ) !== $orders ) {
			return array(
				'items' => array(),
				'total' => 0,
			);
		}
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$orders} WHERE user_id = %d AND order_status <> 'trash'", $user_id ) );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT id, order_status, payment_status, total_price, created_at_gmt FROM {$orders} WHERE user_id = %d AND order_status <> 'trash' ORDER BY id DESC LIMIT %d OFFSET %d", $user_id, $per_page, max( 0, ( $page - 1 ) * $per_page ) ) );
		$items = array();
		foreach ( (array) $rows as $row ) {
			$course_lines = $wpdb->get_results( $wpdb->prepare( "SELECT oi.item_id, p.post_title, p.post_type FROM {$lines} oi LEFT JOIN {$wpdb->posts} p ON p.ID = oi.item_id WHERE oi.order_id = %d", $row->id ) );
			// phpcs:enable
			$status  = $this->native_order_status( (string) $row->order_status, (string) $row->payment_status );
			$items[] = array(
				'id'           => (int) $row->id,
				'number'       => (string) $row->id,
				'status'       => $status,
				'status_label' => $this->native_order_status_label( (string) $row->order_status, (string) $row->payment_status ),
				'total'        => Money::plain( function_exists( 'tutor_get_formatted_price' ) ? tutor_get_formatted_price( $row->total_price ) : (string) $row->total_price ),
				'created_at'   => mysql2date( 'Y-m-d\TH:i:s\Z', $row->created_at_gmt, false ),
				'items'        => array_map(
					function ( $line ) {
						return array(
							'name'      => (string) $line->post_title,
							'course_id' => tutor()->course_post_type === $line->post_type ? (int) $line->item_id : null,
						);
					},
					(array) $course_lines
				),
			);
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * API status of a Tutor order: refunds and failed payments win over the order status.
	 *
	 * @param string $order_status   Tutor order status.
	 * @param string $payment_status Tutor payment status.
	 * @return string
	 */
	private function native_order_status( $order_status, $payment_status ) {
		if ( 'refunded' === $payment_status ) {
			return 'refunded';
		}
		if ( 'failed' === $payment_status ) {
			return 'failed';
		}
		$map = array(
			'completed'  => 'completed',
			'cancelled'  => 'cancelled',
			'pending'    => 'pending',
			'incomplete' => 'pending',
		);
		return $map[ $order_status ] ?? 'pending';
	}

	/**
	 * Tutor's own wording for an order's status.
	 *
	 * @param string $order_status   Tutor order status.
	 * @param string $payment_status Tutor payment status.
	 * @return string
	 */
	private function native_order_status_label( $order_status, $payment_status ) {
		if ( class_exists( '\Tutor\Models\OrderModel' ) ) {
			if ( in_array( $payment_status, array( 'refunded', 'failed' ), true ) ) {
				$labels = \Tutor\Models\OrderModel::get_payment_status();
				return (string) ( $labels[ $payment_status ] ?? ucfirst( $payment_status ) );
			}
			$labels = \Tutor\Models\OrderModel::get_order_status();
			return (string) ( $labels[ $order_status ] ?? ucfirst( $order_status ) );
		}
		return ucfirst( in_array( $payment_status, array( 'refunded', 'failed' ), true ) ? $payment_status : $order_status );
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
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Tutor stores reviews as comments with its own approval values, which WP_Comment_Query can't filter.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_post_ID = %d AND comment_type = 'tutor_course_rating' AND comment_approved = 'approved'", $course_id ) );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->comments} WHERE comment_post_ID = %d AND comment_type = 'tutor_course_rating' AND comment_approved = 'approved' ORDER BY comment_ID DESC LIMIT %d OFFSET %d", $course_id, $per_page, max( 0, ( $page - 1 ) * $per_page ) ) );
		// phpcs:enable
		$rating = tutor_utils()->get_course_rating( $course_id );
		$counts = array();
		foreach ( array( 1, 2, 3, 4, 5 ) as $star ) {
			$counts[ (string) $star ] = (int) ( ( (array) ( $rating->count_by_value ?? array() ) )[ $star ] ?? 0 );
		}
		$count = (int) ( $rating->rating_count ?? 0 );
		return array(
			'items'   => array_map(
				function ( $row ) use ( $user_id ) {
					return $this->review_shape( $row, $user_id );
				},
				(array) $rows
			),
			'total'   => $total,
			'summary' => array(
				'rating'       => $count ? round( (float) $rating->rating_avg, 1 ) : null,
				'rating_count' => $count,
				'counts'       => $counts,
			),
		);
	}

	/**
	 * The user's review, approved or held for moderation.
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
	 * Writes or edits a review with Tutor's own code, so moderation, emails and its dashboard work as on the website.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param int    $rating    1 to 5.
	 * @param string $text      Review text.
	 * @return array|WP_Error
	 */
	public function save_review( $course_id, $user_id, $rating, $text ) {
		if ( ! $this->features()['reviews'] ) {
			return new WP_Error( 'feature_disabled', __( 'Reviews are turned off on this site.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! class_exists( '\TUTOR\Ajax' ) || ! method_exists( '\TUTOR\Ajax', 'add_or_update_review' ) ) {
			return new WP_Error( 'feature_disabled', __( 'Reviews need a newer version of Tutor LMS.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$existing = $this->review_row( $course_id, $user_id );
		( new \TUTOR\Ajax( false ) )->add_or_update_review( $user_id, $course_id, max( 1, min( 5, (int) $rating ) ), (string) $text, $existing ? (int) $existing->comment_ID : 0 );
		clean_comment_cache( $existing ? (int) $existing->comment_ID : array() );
		$review = $this->my_review( $course_id, $user_id );
		return $review ? $review : new WP_Error( 'review_failed', __( 'Your review could not be saved. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * The user's review comment.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return object|null
	 */
	private function review_row( $course_id, $user_id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Tutor's review comments, see reviews().
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->comments} WHERE comment_post_ID = %d AND user_id = %d AND comment_type = 'tutor_course_rating' ORDER BY comment_ID DESC LIMIT 1", $course_id, $user_id ) );
		return $row ? $row : null;
	}

	/**
	 * Review shape.
	 *
	 * @param object $row     Comment row.
	 * @param int    $user_id Current user.
	 * @return array
	 */
	private function review_shape( $row, $user_id ) {
		return array(
			'id'         => (int) $row->comment_ID,
			'rating'     => max( 1, min( 5, (int) get_comment_meta( (int) $row->comment_ID, 'tutor_rating', true ) ) ),
			'text'       => self::plain_text( (string) $row->comment_content ),
			'author'     => $this->person( (int) $row->user_id, (int) $row->comment_post_ID ),
			'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
			'status'     => 'approved' === $row->comment_approved ? 'approved' : 'pending',
			'mine'       => $user_id > 0 && (int) $row->user_id === (int) $user_id,
		);
	}

	/**
	 * Whether Q&A is on for the site and, on Tutor 4, for this course.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function qna_enabled( $course_id ) {
		if ( ! $this->features()['qna'] ) {
			return false;
		}
		if ( class_exists( '\TUTOR\Q_And_A' ) && method_exists( '\TUTOR\Q_And_A', 'is_enabled_for_course' ) ) {
			return (bool) \TUTOR\Q_And_A::is_enabled_for_course( $course_id );
		}
		return true;
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
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Tutor's Q&A comments use their own approval values.
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_post_ID = %d AND comment_type = 'tutor_q_and_a' AND comment_parent = 0 AND comment_approved = 'approved'", $course_id ) );
		$rows  = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT q.*, (SELECT COUNT(*) FROM {$wpdb->comments} a WHERE a.comment_parent = q.comment_ID AND a.comment_type = 'tutor_q_and_a') AS answer_count
				FROM {$wpdb->comments} q
				WHERE q.comment_post_ID = %d AND q.comment_type = 'tutor_q_and_a' AND q.comment_parent = 0 AND q.comment_approved = 'approved'
				ORDER BY q.comment_ID DESC LIMIT %d OFFSET %d",
				$course_id,
				$per_page,
				max( 0, ( $page - 1 ) * $per_page )
			)
		);
		// phpcs:enable
		return array(
			'items' => array_map(
				function ( $row ) use ( $user_id ) {
					return $this->course_question_shape( $row, $user_id );
				},
				(array) $rows
			),
			'total' => $total,
		);
	}

	/**
	 * A question and its answers.
	 *
	 * @param int $question_id Question ID.
	 * @param int $user_id     Current user.
	 * @return array|null
	 */
	public function question( $question_id, $user_id ) {
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery -- See questions().
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->comments} WHERE comment_ID = %d AND comment_type = 'tutor_q_and_a' AND comment_parent = 0 AND comment_approved = 'approved'", $question_id ) );
		if ( ! $row ) {
			return null;
		}
		$answers = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->comments} WHERE comment_parent = %d AND comment_type = 'tutor_q_and_a' ORDER BY comment_ID ASC", $question_id ) );
		// phpcs:enable
		$row->answer_count = count( (array) $answers );
		$thread            = $this->course_question_shape( $row, $user_id );
		$thread['answers'] = array_map(
			function ( $answer ) use ( $user_id ) {
				return $this->answer_shape( $answer, $user_id );
			},
			(array) $answers
		);
		return $thread;
	}

	/**
	 * Asks a question.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param string $text      Question.
	 * @return array|WP_Error
	 */
	public function ask( $course_id, $user_id, $text ) {
		$id = $this->insert_qna( $course_id, 0, $user_id, $text );
		if ( ! $id ) {
			return new WP_Error( 'qna_failed', __( 'Your question could not be sent. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
		}
		$question = $this->question( $id, $user_id );
		unset( $question['answers'] );
		return $question;
	}

	/**
	 * Replies to a question.
	 *
	 * @param int    $question_id Question ID.
	 * @param int    $user_id     User ID.
	 * @param string $text        Reply.
	 * @return array|WP_Error
	 */
	public function answer( $question_id, $user_id, $text ) {
		$question = get_comment( $question_id );
		if ( ! $question || 'tutor_q_and_a' !== $question->comment_type ) {
			return new WP_Error( 'not_found', __( 'This question no longer exists.', 'yallapp' ), array( 'status' => 404 ) );
		}
		$id  = $this->insert_qna( (int) $question->comment_post_ID, (int) $question_id, $user_id, $text );
		$row = $id ? get_comment( $id ) : null;
		if ( ! $row ) {
			return new WP_Error( 'qna_failed', __( 'Your reply could not be sent. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
		}
		return $this->answer_shape( $row, $user_id );
	}

	/**
	 * Saves a question or reply the way Tutor's own Q&A form does (Q_And_A::inset_qna),
	 * including its filter, unread flags and actions, so instructors see it in Tutor and get its emails.
	 *
	 * @param int    $course_id   Course ID.
	 * @param int    $question_id Question replied to, or 0 for a new question.
	 * @param int    $user_id     Author.
	 * @param string $text        Text.
	 * @return int The new comment's ID.
	 */
	private function insert_qna( $course_id, $question_id, $user_id, $text ) {
		global $wpdb;
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return 0;
		}
		$date = gmdate( 'Y-m-d H:i:s', function_exists( 'tutor_time' ) ? tutor_time() : current_time( 'timestamp' ) ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested -- Same local time Tutor stores.
		$data = array(
			'comment_post_ID'  => (int) $course_id,
			'comment_author'   => $user->user_login,
			'comment_date'     => $date,
			'comment_date_gmt' => get_gmt_from_date( $date ),
			'comment_content'  => (string) $text,
			'comment_approved' => 'approved',
			'comment_agent'    => 'TutorLMSPlugin',
			'comment_type'     => 'tutor_q_and_a',
			'comment_parent'   => (int) $question_id,
			'user_id'          => (int) $user_id,
		);
		$data = apply_filters( 'tutor_qna_insert_data', $data ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Tutor inserts Q&A the same way, with its own approval value.
		if ( ! $wpdb->insert( $wpdb->comments, $data ) ) {
			return 0;
		}
		$id    = (int) $wpdb->insert_id;
		$root  = $question_id ? (int) $question_id : $id;
		$asker = (int) get_comment( $root )->user_id;
		// Unread for the other side, as Tutor marks it.
		update_comment_meta( $root, 'tutor_qna_read' . ( $asker === (int) $user_id ? '' : '_' . $asker ), 0 );
		do_action( 'tutor_after_asked_question', $data ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		if ( $question_id && $this->teaches( $user_id, $course_id ) ) {
			do_action( 'tutor_after_answer_to_question', $id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Tutor LMS hook.
		}
		return $id;
	}

	/**
	 * CourseQuestion shape.
	 *
	 * @param object $row     Comment row with answer_count.
	 * @param int    $user_id Current user.
	 * @return array
	 */
	private function course_question_shape( $row, $user_id ) {
		return array(
			'id'           => (int) $row->comment_ID,
			'course_id'    => (int) $row->comment_post_ID,
			'text'         => self::plain_text( (string) $row->comment_content ),
			'author'       => $this->person( (int) $row->user_id, (int) $row->comment_post_ID ),
			'created_at'   => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
			'answer_count' => (int) ( $row->answer_count ?? 0 ),
			'mine'         => (int) $row->user_id === (int) $user_id,
		);
	}

	/**
	 * QuestionAnswer shape.
	 *
	 * @param object $row     Comment row.
	 * @param int    $user_id Current user.
	 * @return array
	 */
	private function answer_shape( $row, $user_id ) {
		return array(
			'id'         => (int) $row->comment_ID,
			'text'       => self::plain_text( (string) $row->comment_content ),
			'author'     => $this->person( (int) $row->user_id, (int) $row->comment_post_ID ),
			'created_at' => mysql2date( 'Y-m-d\TH:i:s\Z', $row->comment_date_gmt, false ),
			'mine'       => (int) $row->user_id === (int) $user_id,
		);
	}

	/**
	 * Person shape: a reviewer, asker or replier.
	 *
	 * @param int $user_id   User.
	 * @param int $course_id Course, to tell whether they teach it.
	 * @return array
	 */
	private function person( $user_id, $course_id ) {
		$user = get_userdata( $user_id );
		return array(
			'name'       => $user ? (string) $user->display_name : __( 'Former student', 'yallapp' ),
			'avatar_url' => $user ? \Yallapp\Otp\Sign_In::avatar_url( $user_id ) : null,
			'instructor' => $user && $this->teaches( $user_id, $course_id ),
		);
	}

	/**
	 * Whether a user teaches a course: its author, one of its Tutor instructors, or an administrator.
	 *
	 * @param int $user_id   User.
	 * @param int $course_id Course.
	 * @return bool
	 */
	private function teaches( $user_id, $course_id ) {
		return user_can( $user_id, 'manage_options' )
			|| (int) get_post_field( 'post_author', $course_id ) === (int) $user_id
			|| (bool) tutor_utils()->is_instructor_of_this_course( $user_id, $course_id );
	}

	/**
	 * Text from comment HTML, keeping line breaks.
	 *
	 * @param string $html Comment content.
	 * @return string
	 */
	private static function plain_text( $html ) {
		$text = preg_replace( '#<br\s*/?>|</p>\s*<p[^>]*>#i', "\n", $html );
		return trim( html_entity_decode( wp_strip_all_tags( (string) $text ), ENT_QUOTES, 'UTF-8' ) );
	}

	/**
	 * CourseSummary shape.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id Current user.
	 * @return array
	 */
	private function summary( WP_Post $post, $user_id ) {
		$rating = tutor_utils()->get_course_rating( $post->ID );
		$count  = (int) ( $rating->rating_count ?? 0 );
		$image  = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $post->ID ),
			'lesson_count' => (int) tutor_utils()->get_lesson_count_by_course( $post->ID ),
			'rating'       => $count ? round( (float) $rating->rating_avg, 1 ) : null,
			'rating_count' => $count,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => $user_id > 0 && (bool) tutor_utils()->is_wishlisted( $post->ID, $user_id ),
		);
	}

	/**
	 * MyCourse shape.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id User ID.
	 * @return array
	 */
	private function my_course( WP_Post $post, $user_id ) {
		$next = null;
		foreach ( (array) $this->curriculum( $post->ID, $user_id ) as $topic ) {
			foreach ( $topic['items'] as $item ) {
				if ( ! $item['completed'] && ! $item['locked'] ) {
					$next = $item;
					break 2;
				}
			}
		}
		return array(
			'course'          => $this->summary( $post, $user_id ),
			'progress'        => $this->progress( $post->ID, $user_id ),
			'next_item'       => $next,
			'certificate_url' => $this->certificate_url( $post->ID, $user_id ),
		);
	}

	/**
	 * Price shape.
	 *
	 * @param int $course_id Course ID.
	 * @return array
	 */
	private function price( $course_id ) {
		if ( $this->is_free( $course_id ) ) {
			return array(
				'is_free'     => true,
				'amount'      => null,
				'sale_amount' => null,
				'currency'    => null,
				'formatted'   => null,
			);
		}
		$raw      = tutor_utils()->get_raw_course_price( $course_id );
		$regular  = (float) ( $raw->regular_price ?? 0 );
		$sale     = (float) ( $raw->sale_price ?? 0 );
		$currency = null;
		if ( 'wc' === tutor_utils()->get_option( 'monetize_by' ) && function_exists( 'get_woocommerce_currency' ) ) {
			$currency = get_woocommerce_currency();
		} elseif ( function_exists( 'tutor_utils' ) ) {
			$code     = tutor_utils()->get_option( 'currency_code' );
			$currency = $code ? (string) $code : null;
		}
		$formatted = trim( html_entity_decode( wp_strip_all_tags( (string) tutor_utils()->get_course_price( $course_id ) ), ENT_QUOTES, 'UTF-8' ) );
		return array(
			'is_free'     => false,
			'amount'      => $regular > 0 ? number_format( $regular, 2, '.', '' ) : null,
			'sale_amount' => ( $sale > 0 && $sale < $regular ) ? number_format( $sale, 2, '.', '' ) : null,
			'currency'    => $currency,
			'formatted'   => '' !== $formatted ? preg_replace( '/\s+/', ' ', $formatted ) : null,
		);
	}

	/**
	 * Instructor shape.
	 *
	 * @param int $user_id Instructor user ID.
	 * @return array
	 */
	private function instructor( $user_id ) {
		$user = get_userdata( $user_id );
		$bio  = $user ? (string) get_user_meta( $user_id, '_tutor_profile_bio', true ) : '';
		return array(
			'id'         => (int) $user_id,
			'name'       => $user ? (string) $user->display_name : '',
			'avatar_url' => $user ? \Yallapp\Otp\Sign_In::avatar_url( $user_id ) : null,
			'bio'        => '' !== $bio ? wp_strip_all_tags( $bio ) : null,
		);
	}

	/**
	 * Category shape.
	 *
	 * @param \WP_Term $term Term.
	 * @return array
	 */
	private function category_shape( $term ) {
		return array(
			'id'    => (int) $term->term_id,
			'name'  => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
			'count' => (int) $term->count,
		);
	}

	/**
	 * CurriculumItem shape.
	 *
	 * @param WP_Post $item    Content post.
	 * @param int     $user_id Current user.
	 * @param bool    $access  Whether the user can open the course content.
	 * @return array
	 */
	private function curriculum_item( WP_Post $item, $user_id, $access ) {
		$types   = array(
			tutor()->lesson_post_type => 'lesson',
			'tutor_quiz'              => 'quiz',
			'tutor_assignments'       => 'assignment',
			'tutor_zoom_meeting'      => 'live',
			'tutor-google-meet'       => 'live',
		);
		$type    = $types[ $item->post_type ] ?? 'lesson';
		$preview = 'lesson' === $type && (bool) get_post_meta( $item->ID, '_is_preview', true );
		$shape   = array(
			'id'               => (int) $item->ID,
			'type'             => $type,
			'title'            => (string) $item->post_title,
			'duration_minutes' => null,
			'question_count'   => null,
			'preview'          => $preview,
			'locked'           => ! ( $access || $preview ),
			'completed'        => false,
		);
		if ( 'lesson' === $type ) {
			$video                     = $this->video( $item->ID );
			$shape['duration_minutes'] = ( $video && $video['duration_seconds'] ) ? (int) ceil( $video['duration_seconds'] / 60 ) : null;
			$shape['completed']        = $user_id > 0 && (bool) tutor_utils()->is_completed_lesson( $item->ID, $user_id );
		} elseif ( 'quiz' === $type ) {
			$shape['question_count'] = count( $this->quiz_questions( $item->ID ) );
			$shape['completed']      = $user_id > 0 && (bool) array_filter(
				$this->user_attempts( $item->ID, $user_id ),
				static function ( $a ) {
					return 'attempt_started' !== $a->attempt_status;
				}
			);
		}
		return $shape;
	}

	/**
	 * Normalised video data, or null when the content has no video.
	 *
	 * @param int $post_id Lesson or course ID.
	 * @return array|null source, attachment_id, url, embed_html, duration_seconds, poster_url.
	 */
	private function video( $post_id ) {
		$video = tutor_utils()->get_video( $post_id );
		if ( ! is_array( $video ) || empty( $video['source'] ) || '-1' === (string) $video['source'] ) {
			return null;
		}
		$runtime  = (array) ( $video['runtime'] ?? array() );
		$seconds  = (int) ( $runtime['hours'] ?? 0 ) * 3600 + (int) ( $runtime['minutes'] ?? 0 ) * 60 + (int) ( $runtime['seconds'] ?? 0 );
		$poster   = ! empty( $video['poster'] ) ? wp_get_attachment_url( (int) $video['poster'] ) : false;
		$base     = array(
			'source'           => 'external',
			'attachment_id'    => 0,
			'url'              => null,
			'embed_html'       => null,
			'duration_seconds' => $seconds > 0 ? $seconds : null,
			'poster_url'       => $poster ? $poster : null,
		);
		$source   = (string) $video['source'];
		$external = array(
			'external_url' => 'source_external_url',
			'youtube'      => 'source_youtube',
			'vimeo'        => 'source_vimeo',
		);
		if ( 'html5' === $source && ! empty( $video['source_video_id'] ) ) {
			$base['source']        = 'upload';
			$base['attachment_id'] = (int) $video['source_video_id'];
		} elseif ( isset( $external[ $source ] ) && ! empty( $video[ $external[ $source ] ] ) ) {
			$base['source'] = 'external_url' === $source ? 'external' : $source;
			$base['url']    = esc_url_raw( (string) $video[ $external[ $source ] ] );
		} elseif ( in_array( $source, array( 'embedded', 'shortcode' ), true ) ) {
			$key                = 'embedded' === $source ? 'source_embedded' : 'source_shortcode';
			$html               = (string) ( $video[ $key ] ?? '' );
			$base['source']     = 'embed';
			$base['embed_html'] = 'shortcode' === $source ? do_shortcode( $html ) : $html;
		} else {
			return null;
		}
		return $base;
	}

	/**
	 * Attachment shapes.
	 *
	 * @param int $post_id Lesson ID.
	 * @return array[]
	 */
	private function attachments( $post_id ) {
		$items = array();
		foreach ( (array) get_post_meta( $post_id, '_tutor_attachments', true ) as $attachment_id ) {
			$url = wp_get_attachment_url( (int) $attachment_id );
			if ( ! $url ) {
				continue;
			}
			$file    = get_attached_file( (int) $attachment_id );
			$items[] = array(
				'name'       => basename( (string) $file ),
				'url'        => $url,
				'size_bytes' => ( $file && file_exists( $file ) ) ? (int) filesize( $file ) : null,
				'mime_type'  => get_post_mime_type( (int) $attachment_id ) ? get_post_mime_type( (int) $attachment_id ) : null,
			);
		}
		return $items;
	}

	/**
	 * Whether a user can open a course's content: enrolled, public course, or the instructor.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	private function has_course_access( $course_id, $user_id ) {
		if ( 'yes' === get_post_meta( $course_id, '_tutor_is_public_course', true ) ) {
			return true;
		}
		if ( ! $user_id ) {
			return false;
		}
		if ( $this->is_enrolled( $course_id, $user_id ) ) {
			return true;
		}
		return (int) get_post_field( 'post_author', $course_id ) === (int) $user_id || user_can( $user_id, 'manage_options' );
	}

	/**
	 * Quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return WP_Post|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz = $this->published( $quiz_id, 'tutor_quiz' );
		if ( ! $quiz ) {
			return new WP_Error( 'not_found', __( 'Quiz not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		$course_id = $this->course_of( $quiz->ID );
		if ( ! $course_id || ! $this->has_course_access( $course_id, $user_id ) ) {
			return new WP_Error( 'not_enrolled', __( 'Enroll in this course to take the quiz.', 'yallapp' ), array( 'status' => 403 ) );
		}
		return $quiz;
	}

	/**
	 * Whether this Tutor version can grade attempts submitted by the app.
	 *
	 * @return bool
	 */
	private function native_quizzes_supported() {
		return method_exists( '\TUTOR\Quiz', 'quiz_attempt' ) && method_exists( '\TUTOR\Quiz', 'manage_attempt_answers' );
	}

	/**
	 * Quiz questions in display order.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return object[]
	 */
	private function quiz_questions( $quiz_id ) {
		global $wpdb;
		$order = tutor_utils()->get_quiz_option( $quiz_id, 'questions_order', 'rand' );
		$sql   = array(
			'asc'  => 'question_id ASC',
			'desc' => 'question_id DESC',
		);
		$by    = $sql[ $order ] ?? 'question_order ASC';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Tutor's table; $by is from a fixed list.
		$rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tutor_quiz_questions WHERE quiz_id = %d ORDER BY {$by}", $quiz_id ) );
		if ( 'rand' === $order ) {
			shuffle( $rows );
		}
		return $rows;
	}

	/**
	 * One question.
	 *
	 * @param int $question_id Question ID.
	 * @return object|null
	 */
	private function quiz_question( $question_id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Tutor's table.
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tutor_quiz_questions WHERE question_id = %d", $question_id ) );
		return $row ? $row : null;
	}

	/**
	 * Question shape.
	 *
	 * @param object  $question Question row.
	 * @param bool    $native   Whether the app answers natively.
	 * @param WP_Post $quiz     Quiz.
	 * @return array
	 */
	private function question_shape( $question, $native, WP_Post $quiz ) {
		global $wpdb;
		$types   = array(
			'true_false'        => 'true_false',
			'single_choice'     => 'single_choice',
			'multiple_choice'   => 'multiple_choice',
			'short_answer'      => 'short_answer',
			'open_ended'        => 'open_ended',
			'fill_in_the_blank' => 'fill_in_blank',
			'ordering'          => 'ordering',
			'matching'          => 'matching',
			'image_matching'    => 'matching',
			'image_answering'   => 'image_answer',
		);
		$options = array();
		if ( $native ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Tutor's table.
			$rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT answer_id, answer_title, image_id FROM {$wpdb->prefix}tutor_quiz_question_answers WHERE belongs_question_id = %d AND belongs_question_type = %s ORDER BY answer_order ASC", $question->question_id, $question->question_type ) );
			foreach ( $rows as $row ) {
				$image     = $row->image_id ? wp_get_attachment_url( (int) $row->image_id ) : false;
				$options[] = array(
					'id'        => (string) $row->answer_id,
					'label'     => wp_strip_all_tags( (string) $row->answer_title ),
					'image_url' => $image ? $image : null,
				);
			}
		}
		$description = (string) $question->question_description;
		return array(
			'id'               => (int) $question->question_id,
			'type'             => $types[ $question->question_type ] ?? 'other',
			'title'            => wp_strip_all_tags( stripslashes( (string) $question->question_title ) ),
			'description_html' => '' !== $description ? wp_kses_post( stripslashes( $description ) ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : (string) get_permalink( $quiz ),
			'options'          => $options,
			'points'           => null !== $question->question_mark ? (float) $question->question_mark : null,
		);
	}

	/**
	 * A user's attempts on a quiz, newest first.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return object[]
	 */
	private function user_attempts( $quiz_id, $user_id ) {
		global $wpdb;
		if ( ! $user_id ) {
			return array();
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Tutor's table.
		return (array) $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}tutor_quiz_attempts WHERE quiz_id = %d AND user_id = %d ORDER BY attempt_id DESC", $quiz_id, $user_id ) );
	}

	/**
	 * AttemptResult shape.
	 *
	 * @param object $attempt Attempt row.
	 * @return array
	 */
	private function attempt_result( $attempt ) {
		$total  = (float) $attempt->total_marks;
		$earned = (float) $attempt->earned_marks;
		$score  = $total > 0 ? round( $earned * 100 / $total, 2 ) : null;
		$pass   = (int) tutor_utils()->get_quiz_option( (int) $attempt->quiz_id, 'passing_grade', 0 );
		if ( 'review_required' === $attempt->attempt_status ) {
			$status = 'pending_review';
		} elseif ( isset( $attempt->result ) && in_array( $attempt->result, array( 'pass', 'fail' ), true ) ) {
			$status = 'pass' === $attempt->result ? 'passed' : 'failed';
		} else {
			$status = ( null !== $score && $score >= $pass ) ? 'passed' : 'failed';
		}
		return array(
			'attempt_id'    => (int) $attempt->attempt_id,
			'quiz_id'       => (int) $attempt->quiz_id,
			'quiz_title'    => get_the_title( (int) $attempt->quiz_id ),
			'status'        => $status,
			'score_percent' => $score,
			'finished_at'   => $attempt->attempt_ended_at ? gmdate( 'c', strtotime( $attempt->attempt_ended_at ) ) : null,
		);
	}

	/**
	 * Quiz time limit in seconds, or null.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int|null
	 */
	private function time_limit( $quiz_id ) {
		$value = (int) tutor_utils()->get_quiz_option( $quiz_id, 'time_limit.time_value', 0 );
		if ( $value <= 0 ) {
			return null;
		}
		$units = array(
			'seconds' => 1,
			'minutes' => 60,
			'hours'   => 3600,
			'days'    => 86400,
			'weeks'   => 604800,
		);
		$type  = (string) tutor_utils()->get_quiz_option( $quiz_id, 'time_limit.time_type', 'minutes' );
		return $value * ( $units[ $type ] ?? 60 );
	}

	/**
	 * Attempts allowed, or null for unlimited.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int|null
	 */
	private function attempts_allowed( $quiz_id ) {
		$limited = (bool) tutor_utils()->get_quiz_option( $quiz_id, 'limit_attempts_allowed', false );
		$allowed = (int) tutor_utils()->get_quiz_option( $quiz_id, 'attempts_allowed', 0 );
		return ( $limited && $allowed > 0 ) ? $allowed : null;
	}

	/**
	 * Certificate URL for a completed course, or null.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return string|null
	 */
	private function certificate_url( $course_id, $user_id ) {
		if ( ! tutor_utils()->is_completed_course( $course_id, $user_id ) ) {
			return null;
		}
		/**
		 * Filters the certificate URL for a completed course.
		 *
		 * @param string|null $url       URL, or null when there is no certificate.
		 * @param int         $course_id Course ID.
		 * @param int         $user_id   User ID.
		 */
		$url = apply_filters( 'yallapp_certificate_url', null, $course_id, $user_id );
		return $url ? esc_url_raw( (string) $url ) : null;
	}

	/**
	 * Enrollment date.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return string ISO 8601.
	 */
	private function enrolled_at( $course_id, $user_id ) {
		$enrollment = tutor_utils()->is_enrolled( $course_id, $user_id );
		$date       = is_object( $enrollment ) && ! empty( $enrollment->post_date_gmt ) ? $enrollment->post_date_gmt : gmdate( 'Y-m-d H:i:s' );
		return gmdate( 'c', strtotime( $date . ' UTC' ) );
	}

	/**
	 * Topics of a course.
	 *
	 * @param int $course_id Course ID.
	 * @return WP_Post[]
	 */
	private function topics( $course_id ) {
		$query = tutor_utils()->get_topics( $course_id );
		return ( $query instanceof WP_Query ) ? $query->posts : array();
	}

	/**
	 * Lessons, quizzes and other items of a topic.
	 *
	 * @param int $topic_id Topic ID.
	 * @return WP_Post[]
	 */
	private function topic_contents( $topic_id ) {
		$query = tutor_utils()->get_course_contents_by_topic( $topic_id, -1 );
		return ( $query instanceof WP_Query ) ? $query->posts : array();
	}

	/**
	 * A published post of a type, or null.
	 *
	 * @param int    $post_id   Post ID.
	 * @param string $post_type Post type.
	 * @return WP_Post|null
	 */
	private function published( $post_id, $post_type ) {
		$post = get_post( (int) $post_id );
		return ( $post && $post->post_type === $post_type && 'publish' === $post->post_status ) ? $post : null;
	}
}
