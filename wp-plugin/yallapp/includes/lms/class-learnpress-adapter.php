<?php
/**
 * LearnPress integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use LearnPress\Models\CourseModel;
use LearnPress\Models\QuizPostModel;
use LearnPress\Models\Question\QuestionPostModel;
use LearnPress\Models\UserItems\UserCourseModel;
use LearnPress\Models\UserItems\UserLessonModel;
use LearnPress\Models\UserItems\UserQuizModel;
use LearnPress\Models\UserModel;
use Throwable;
use WP_Error;
use WP_Post;
use WP_Query;

/**
 * LearnPress 4.2.7.6 and later (the release that added UserLessonModel::set_complete());
 * the end-to-end checks run against 4.4.8. Uses LearnPress's own models (CourseModel,
 * UserCourseModel, UserQuizModel) and its checkout, so enrollments, orders, grading and
 * emails match the website.
 *
 * LearnPress core has no wishlist, reviews, Q&A or certificates (they are add-ons), so
 * those features are off. Its lessons have no video field; videos live in the content.
 * The website finishes a course when the student presses "Finish course"; the app has no
 * such button, so the adapter finishes it with LearnPress's own rules once every item is done.
 */
class LearnPress_Adapter extends Base_Adapter {

	const NATIVE_QUESTION_TYPES = array( 'true_or_false', 'single_choice', 'multi_choice' );

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'learnpress';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'LEARNPRESS_VERSION' ) ? (string) LEARNPRESS_VERSION : '';
	}

	/**
	 * LearnPress has no paid edition, only add-ons.
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
			'certificates' => has_filter( 'yallapp_certificate_url' ),
			'quizzes'      => true,
			'wishlist'     => false,
			'reviews'      => false,
			'qna'          => false,
		);
	}

	/**
	 * Connects LearnPress's enrollment hook, fired for free enrollments and paid orders alike.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Unused: LearnPress has no Q&A.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'learnpress/user/course-enrolled', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LearnPress hook.
			static function ( $order_id, $course_id, $user_id ) use ( $on_enrolled ) {
				call_user_func( $on_enrolled, (int) $course_id, (int) $user_id );
			},
			10,
			3
		);
	}

	/**
	 * Post types.
	 *
	 * @return array{course: string, lesson: string, quiz: string, announcement: string}
	 */
	public function post_types() {
		return array(
			'course'       => LP_COURSE_CPT,
			'lesson'       => LP_LESSON_CPT,
			'quiz'         => LP_QUIZ_CPT,
			'announcement' => '',
		);
	}

	/**
	 * Course categories.
	 *
	 * @return array[]
	 */
	public function categories() {
		return $this->terms( 'course_category' );
	}

	/**
	 * Lists courses. The price filter reads `_lp_price`, the price LearnPress keeps with any sale applied.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, LP_COURSE_CPT, 'course_category' );
		$price      = $args['price'] ?? 'all';
		if ( 'free' === $price ) {
			$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'OR',
				array(
					'key'     => '_lp_price',
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'   => '_lp_price',
					'value' => '',
				),
				array(
					'key'     => '_lp_price',
					'value'   => 0,
					'compare' => '<=',
					'type'    => 'DECIMAL(10,2)',
				),
			);
		} elseif ( 'paid' === $price ) {
			$query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => '_lp_price',
					'value'   => 0,
					'compare' => '>',
					'type'    => 'DECIMAL(10,2)',
				),
			);
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
		$post   = $this->published( $course_id, LP_COURSE_CPT );
		$course = $post ? CourseModel::find( $post->ID, true ) : null;
		if ( ! $course ) {
			return null;
		}
		$level   = (string) $course->get_meta_value_by_key( '_lp_level', '' );
		$levels  = array(
			'all'          => __( 'All levels', 'yallapp' ),
			'beginner'     => __( 'Beginner', 'yallapp' ),
			'intermediate' => __( 'Intermediate', 'yallapp' ),
			'expert'       => __( 'Expert', 'yallapp' ),
		);
		$minutes = (int) floor( self::duration_seconds( (string) $course->get_meta_value_by_key( '_lp_duration', '' ) ) / 60 );
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => null,
				'duration_minutes' => $minutes > 0 ? $minutes : null,
				'level'            => '' !== $level ? ( $levels[ $level ] ?? ucwords( str_replace( '_', ' ', $level ) ) ) : null,
				'has_certificate'  => $this->features()['certificates'],
				'student_count'    => self::student_count( $post->ID ),
				'about'            => Course_About::shape(
					get_post_meta( $post->ID, '_lp_key_features', true ),
					get_post_meta( $post->ID, '_lp_requirements', true ),
					get_post_meta( $post->ID, '_lp_target_audiences', true )
				),
				'categories'       => $this->terms( 'course_category', $post->ID ),
				'has_checkout'     => ! $course->is_free() && '' === $course->get_external_link(),
				'qna'              => false,
			)
		);
	}

	/**
	 * Students enrolled in a course (or finished it), or null when LearnPress can't say.
	 *
	 * @param int $course_id Course ID.
	 * @return int|null
	 */
	private static function student_count( $course_id ) {
		if ( ! class_exists( 'LP_Course_DB' ) || ! method_exists( 'LP_Course_DB', 'get_total_user_enrolled' ) ) {
			return null;
		}
		try {
			return (int) \LP_Course_DB::getInstance()->get_total_user_enrolled( (int) $course_id );
		} catch ( \Throwable $e ) {
			return null;
		}
	}

	/**
	 * Sections and their items.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array[]|null
	 */
	public function curriculum( $course_id, $user_id ) {
		$post   = $this->published( $course_id, LP_COURSE_CPT );
		$course = $post ? CourseModel::find( $post->ID, true ) : null;
		if ( ! $course ) {
			return null;
		}
		$access   = $this->has_course_access( $course, $user_id );
		$statuses = $this->item_statuses( $course->get_id(), $user_id );
		$sections = array_values( $course->get_section_items() );
		usort(
			$sections,
			static function ( $a, $b ) {
				return (int) $a->section_order - (int) $b->section_order;
			}
		);
		$topics = array();
		foreach ( $sections as $section ) {
			$items = array();
			foreach ( (array) $section->items as $item ) {
				$items[] = $this->curriculum_item( (int) $item->item_id, (string) $item->item_type, $access, $statuses );
			}
			$topics[] = array(
				'id'    => (int) $section->section_id,
				'title' => (string) $section->section_name,
				'items' => $items,
			);
		}
		return $topics;
	}

	/**
	 * Whether a user is enrolled (or has finished the course).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id ) {
		return null !== $this->owned_course( $course_id, $user_id );
	}

	/**
	 * 39 The student's LearnPress course item when it gives them the course: enrolled,
	 * finished, or bought and not started yet ("purchased": LearnPress without "Auto start",
	 * whose website shows a "Start now" button; the app starts it when a lesson opens).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return UserCourseModel|null
	 */
	private function owned_course( $course_id, $user_id ) {
		$user_course = $user_id ? UserCourseModel::find( (int) $user_id, (int) $course_id, true ) : false;
		if ( ! $user_course instanceof UserCourseModel ) {
			return null;
		}
		return in_array( (string) $user_course->get_status(), array( 'enrolled', 'finished', 'purchased' ), true ) ? $user_course : null;
	}

	/**
	 * 39 Starts a bought course the way LearnPress's "Start now" button does (its REST
	 * enroll_courses): the course's time limit counts from now.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return void
	 */
	private function start_if_purchased( $course_id, $user_id ) {
		$user_course = $this->owned_course( $course_id, $user_id );
		if ( ! $user_course || 'purchased' !== $user_course->get_status() ) {
			return;
		}
		$user_course->graduation = LP_COURSE_GRADUATION_IN_PROGRESS;
		$user_course->status     = LP_COURSE_ENROLLED;
		$user_course->start_time = gmdate( \LP_Datetime::$format, time() );
		$user_course->save();
		/** This action is documented in LearnPress. */
		do_action( 'learnpress/user/course-enrolled', $user_course->ref_id, (int) $course_id, (int) $user_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound, WordPress.NamingConventions.ValidHookName.UseUnderscores -- LearnPress hook.
	}

	/**
	 * 39 Whether LearnPress keeps a student out of a course they have: its time limit is
	 * over and the course blocks it then, or it is finished and blocks finished courses.
	 *
	 * @param CourseModel     $course      Course.
	 * @param UserCourseModel $user_course The student's course item.
	 * @return bool
	 */
	private static function blocked( CourseModel $course, UserCourseModel $user_course ) {
		if ( $user_course->has_finished() && method_exists( $course, 'enable_block_when_finished' ) && $course->enable_block_when_finished() ) {
			return true;
		}
		if ( 'purchased' === $user_course->get_status() ) {
			return false;
		}
		$remaining = method_exists( $user_course, 'get_time_remaining' ) ? $user_course->get_time_remaining() : $user_course->timestamp_remaining_duration();
		return 0 === (int) $remaining;
	}

	/**
	 * Whether a course is free.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		$course = CourseModel::find( (int) $course_id, true );
		return $course ? $course->is_free() : false;
	}

	/**
	 * Enrolls in a free course the way LearnPress's "Start now" button does: a free order,
	 * completed, which enrolls the student and sends LearnPress's emails.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 * @throws \Exception Never: thrown and caught inside to abandon a half-made order.
	 */
	public function enroll_free( $course_id, $user_id ) {
		$course = $this->published( $course_id, LP_COURSE_CPT ) ? CourseModel::find( (int) $course_id, true ) : null;
		if ( ! $course ) {
			return self::not_found( __( 'Course not found.', 'yallapp' ) );
		}
		if ( ! $course->is_free() ) {
			return new WP_Error( 'purchase_required', __( 'This course is not free.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
			$can_enroll = $course->can_enroll( UserModel::find( (int) $user_id, true ) );
			if ( is_wp_error( $can_enroll ) ) {
				return new WP_Error( 'enrollment_failed', wp_strip_all_tags( $can_enroll->get_error_message() ), array( 'status' => 403 ) );
			}
			try {
				$cart = \LearnPress::instance()->cart;
				$cart->empty_cart();
				if ( ! $cart->add_to_cart( (int) $course_id ) ) {
					throw new \Exception( 'cart' );
				}
				$order = new \LP_Order( \LP_Checkout::instance()->create_order() );
				$order->payment_complete();
				$cart->empty_cart();
			} catch ( Throwable $e ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
		}
		$user_course = UserCourseModel::find( (int) $user_id, (int) $course_id );
		if ( ! $user_course instanceof UserCourseModel || ! $user_course->has_enrolled_or_finished() ) {
			return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$start = $user_course ? (string) $user_course->get_start_time() : '';
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => self::iso( '' !== $start ? $start : gmdate( 'Y-m-d H:i:s' ) ),
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
		return $this->my_course_page( $this->enrolled_course_ids( $user_id ), $this->user_course_ids( $user_id, array( 'finished' ) ), $status, $user_id, $page, $per_page );
	}

	/**
	 * Raw lesson data.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	public function lesson( $lesson_id, $user_id ) {
		$post      = $this->published( $lesson_id, LP_LESSON_CPT );
		$course_id = $post ? $this->course_of( $post->ID ) : 0;
		if ( ! $course_id ) {
			return null;
		}
		$statuses   = $this->item_statuses( $course_id, $user_id );
		$neighbours = $this->neighbours( $course_id, $post->ID );
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => null,
			'attachments' => $this->attachments( $post->ID ),
			'preview'     => $this->is_preview( $post->ID ),
			'completed'   => 'completed' === ( $statuses[ $post->ID ] ?? '' ),
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
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
		if ( $this->is_preview( $lesson_id ) ) {
			return true;
		}
		$course = CourseModel::find( $this->course_of( $lesson_id ), true );
		if ( ! $course || ! $this->has_course_access( $course, $user_id ) ) {
			return false;
		}
		$this->start_if_purchased( $course->get_id(), $user_id );
		return true;
	}

	/**
	 * Marks a lesson complete with LearnPress's UserLessonModel, then finishes the course
	 * when every item is done.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$course_id = $this->course_of( $lesson_id );
		$course    = $course_id ? CourseModel::find( $course_id, true ) : null;
		if ( ! $course || ! $user_id || ! $this->has_course_access( $course, $user_id ) ) {
			return self::not_enrolled();
		}
		$this->start_if_purchased( $course_id, $user_id );
		$user_course = UserCourseModel::find( (int) $user_id, $course_id );
		if ( ! $user_course instanceof UserCourseModel || ! $user_course->has_enrolled_or_finished() ) {
			return self::not_enrolled();
		}
		$lesson = UserLessonModel::find_user_item( (int) $user_id, (int) $lesson_id, LP_LESSON_CPT, $course_id, LP_COURSE_CPT );
		if ( ! $lesson instanceof UserLessonModel ) {
			// LearnPress records a lesson as started when the student opens it on the website.
			$lesson             = new UserLessonModel();
			$lesson->user_id    = (int) $user_id;
			$lesson->item_id    = (int) $lesson_id;
			$lesson->item_type  = LP_LESSON_CPT;
			$lesson->ref_id     = $course_id;
			$lesson->ref_type   = LP_COURSE_CPT;
			$lesson->parent_id  = (int) $user_course->get_user_item_id();
			$lesson->status     = LP_ITEM_STARTED;
			$lesson->graduation = LP_COURSE_GRADUATION_IN_PROGRESS;
			$lesson->start_time = gmdate( \LP_Datetime::$format, time() );
			$lesson->save();
		}
		if ( UserLessonModel::STATUS_COMPLETED !== $lesson->get_status() ) {
			try {
				$lesson->set_complete();
			} catch ( Throwable $e ) {
				return new WP_Error( 'cannot_complete', wp_strip_all_tags( $e->getMessage() ), array( 'status' => 409 ) );
			}
			$this->maybe_finish( $course_id, $user_id );
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Course progress from LearnPress's own course results.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$course      = CourseModel::find( (int) $course_id, true );
		$total       = $course ? (int) $course->count_items() : 0;
		$user_course = $user_id ? UserCourseModel::find( (int) $user_id, (int) $course_id ) : false;
		if ( ! $user_course instanceof UserCourseModel || ! $user_course->has_enrolled_or_finished() ) {
			return self::progress_shape( $course_id, 0, $total, false );
		}
		$results = (array) $user_course->calculate_course_results( true );
		return self::progress_shape(
			$course_id,
			(int) ( $results['completed_items'] ?? 0 ),
			(int) ( $results['count_items'] ?? $total ),
			$user_course->has_finished()
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
		$course_id = $this->course_of( $quiz->get_id() );
		$results   = $this->attempt_rows( $user_id, $quiz->get_id() );
		return array(
			'id'                 => (int) $quiz->get_id(),
			'course_id'          => $course_id,
			'title'              => (string) $quiz->post_title,
			'question_count'     => (int) $quiz->count_questions(),
			'time_limit_seconds' => $this->time_limit( $quiz ),
			'pass_percent'       => (int) $quiz->get_passing_grade(),
			'attempts_allowed'   => $this->attempts_allowed( $quiz ),
			'attempts_used'      => count( $results ),
			'last_result'        => $results ? $this->attempt_result( $results[0] ) : null,
		);
	}

	/**
	 * Starts an attempt, or a retake, with LearnPress's UserQuizModel.
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
		$course_id = $this->course_of( $quiz->get_id() );
		$user_quiz = $this->user_quiz( $quiz->get_id(), $course_id, $user_id );
		try {
			if ( $user_quiz && LP_ITEM_COMPLETED === $user_quiz->get_status() ) {
				$user_quiz->retake();
			} elseif ( ! $user_quiz ) {
				$user_quiz          = new UserQuizModel();
				$user_quiz->user_id = (int) $user_id;
				$user_quiz->item_id = (int) $quiz->get_id();
				$user_quiz->ref_id  = $course_id;
				$user_quiz->start_quiz();
			}
		} catch ( Throwable $e ) {
			return new WP_Error( 'attempts_exhausted', wp_strip_all_tags( $e->getMessage() ), array( 'status' => 409 ) );
		}
		\LP_Quiz_Cache::instance()->clear( sprintf( '%d/user/%d/course/%d', $quiz->get_id(), $user_id, $course_id ) );

		$questions = array();
		$native    = true;
		foreach ( $quiz->get_question_ids() as $question_id ) {
			$question = QuestionPostModel::find( (int) $question_id, true );
			if ( $question ) {
				$questions[] = $question;
				$native      = $native && in_array( (string) $question->get_type(), self::NATIVE_QUESTION_TYPES, true );
			}
		}
		$shaped = array();
		foreach ( $questions as $question ) {
			$shaped[] = $this->question_shape( $question, $native, $course_id, $quiz->get_id() );
		}
		$start = strtotime( (string) $user_quiz->get_start_time() . ' UTC' );
		$start = $start ? $start : time();
		$limit = $this->time_limit( $quiz );
		return array(
			'id'         => (int) $user_quiz->get_user_item_id(),
			'quiz_id'    => (int) $quiz->get_id(),
			'started_at' => gmdate( 'c', $start ),
			'ends_at'    => $limit ? gmdate( 'c', $start + $limit ) : null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Grades an attempt the way LearnPress's own quiz submit does.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID (LearnPress's user item ID of the quiz).
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$course_id = $this->course_of( $quiz_id );
		$user_quiz = $course_id ? $this->user_quiz( (int) $quiz_id, $course_id, $user_id ) : null;
		if ( ! $user_quiz || (int) $user_quiz->get_user_item_id() !== (int) $attempt_id ) {
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		if ( UserQuizModel::STATUS_STARTED !== $user_quiz->get_status() ) {
			return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$quiz         = QuizPostModel::find( (int) $quiz_id, true );
		$question_ids = $quiz ? array_map( 'intval', $quiz->get_question_ids() ) : array();
		$answered     = array();
		foreach ( $answers as $answer ) {
			$question_id = (int) ( $answer['question_id'] ?? 0 );
			$options     = array_values( array_filter( array_map( 'strval', (array) ( $answer['option_ids'] ?? array() ) ), 'strlen' ) );
			if ( ! in_array( $question_id, $question_ids, true ) || ! $options ) {
				continue;
			}
			$question                 = QuestionPostModel::find( $question_id, true );
			$answered[ $question_id ] = ( $question && 'multi_choice' === $question->get_type() ) ? $options : $options[0];
		}

		$user        = learn_press_get_user( (int) $user_id );
		$course_data = $user ? $user->get_course_data( $course_id ) : false;
		$item        = $course_data ? $course_data->get_item( (int) $quiz_id ) : false;
		if ( ! $item instanceof \LP_User_Item_Quiz ) {
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		$item->set_end_time( time() );
		$result = $item->calculate_quiz_result( $answered );
		\LP_User_Items_Result_DB::instance()->update( $item->get_user_item_id(), wp_json_encode( $result ) );
		$item->set_graduation( $result['pass'] ? LP_COURSE_GRADUATION_PASSED : LP_COURSE_GRADUATION_FAILED );
		$item->complete();
		/** This action is documented in LearnPress. */
		do_action( 'learn-press/user/quiz-finished', (int) $quiz_id, $course_id, (int) $user_id, $item ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound, WordPress.NamingConventions.ValidHookName.UseUnderscores -- LearnPress hook.
		$this->maybe_finish( $course_id, $user_id );

		$rows = $this->attempt_rows( $user_id, (int) $quiz_id );
		return $rows ? $this->attempt_result( $rows[0] ) : self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
	}

	/**
	 * Finished attempts, newest first: one per result LearnPress keeps (it keeps every retake's).
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function attempts( $user_id, $page, $per_page ) {
		$rows = $this->attempt_rows( $user_id, 0 );
		return array(
			'items' => array_map( array( $this, 'attempt_result' ), self::slice( $rows, $page, $per_page ) ),
			'total' => count( $rows ),
		);
	}

	/**
	 * Certificates come from add-ons; sites can provide them with the filter.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function certificates( $user_id ) {
		return $this->filtered_certificates( $this->user_course_ids( $user_id, array( 'finished' ) ), $user_id );
	}

	/**
	 * The course page, where LearnPress's "Buy now" button starts its checkout.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		return (string) get_permalink( $course_id );
	}

	/**
	 * The course a lesson or quiz belongs to.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		global $wpdb;
		$post = get_post( $post_id );
		if ( ! $post ) {
			return 0;
		}
		if ( LP_COURSE_CPT === $post->post_type ) {
			return (int) $post->ID;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- LearnPress's curriculum tables.
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT s.section_course_id FROM {$wpdb->prefix}learnpress_sections s INNER JOIN {$wpdb->prefix}learnpress_section_items si ON si.section_id = s.section_id WHERE si.item_id = %d ORDER BY s.section_id ASC LIMIT 1", $post->ID ) );
	}

	/**
	 * Enrolled users.
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- LearnPress's enrollment table.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT user_id FROM {$wpdb->prefix}learnpress_user_items WHERE item_id = %d AND item_type = %s AND status IN ('enrolled', 'finished')", $course_id, LP_COURSE_CPT ) );
		return array_map( 'intval', (array) $ids );
	}

	/**
	 * Courses a user is enrolled in, newest first.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id ) {
		// 39 With "purchased": bought, not started yet (LearnPress without "Auto start").
		return $this->user_course_ids( $user_id, array( 'enrolled', 'finished', 'purchased' ) );
	}

	/**
	 * LearnPress always sells through its own checkout; free enrollments are free orders.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		return true;
	}

	/**
	 * LearnPress orders, newest first, as the profile's Orders tab lists them.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function orders( $user_id, $page, $per_page ) {
		global $wpdb;
		if ( ! $user_id ) {
			return self::empty_page();
		}
		// LearnPress registers its order statuses only in the admin, so WP_Query would drop them.
		$statuses = array_diff( array_keys( learn_press_get_register_order_statuses() ), array( 'trash' ) );
		$in       = implode( ',', array_fill( 0, count( $statuses ), '%s' ) );
		// phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- $in holds placeholders.
		$where = $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- $in holds placeholders.
			"p.post_type = %s AND p.post_status IN ({$in}) AND m.meta_key = '_user_id' AND (m.meta_value = %s OR m.meta_value LIKE %s)",
			array_merge( array( LP_ORDER_CPT ), $statuses, array( (string) (int) $user_id, '%"' . (int) $user_id . '"%' ) )
		);
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- LearnPress's orders, as its profile lists them; $where is prepared.
		$total = (int) $wpdb->get_var( "SELECT COUNT(DISTINCT p.ID) FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID WHERE {$where}" );
		$ids   = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID WHERE {$where} ORDER BY p.ID DESC LIMIT %d OFFSET %d", (int) $per_page, ( max( 1, (int) $page ) - 1 ) * (int) $per_page ) );
		// phpcs:enable
		$items = array();
		foreach ( (array) $ids as $order_id ) {
			$items[] = $this->order_shape( new \LP_Order( (int) $order_id ) );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * Order shape.
	 *
	 * @param \LP_Order $order Order.
	 * @return array
	 */
	private function order_shape( $order ) {
		$status = (string) $order->get_status();
		$map    = array(
			'completed'  => 'completed',
			'processing' => 'processing',
			'pending'    => 'pending',
			'cancelled'  => 'cancelled',
			'refunded'   => 'refunded',
			'failed'     => 'failed',
		);
		$lines  = array();
		foreach ( (array) $order->get_items() as $item ) {
			$item      = (array) $item;
			$course_id = (int) ( $item['course_id'] ?? ( $item['item_id'] ?? 0 ) );
			$lines[]   = array(
				'name'      => (string) ( $item['name'] ?? ( $item['order_item_name'] ?? get_the_title( $course_id ) ) ),
				'course_id' => ( $course_id && LP_COURSE_CPT === get_post_type( $course_id ) ) ? $course_id : null,
			);
		}
		$date = get_post_field( 'post_date_gmt', $order->get_id() );
		return array(
			'id'           => (int) $order->get_id(),
			'number'       => ltrim( (string) $order->get_order_number(), '#' ),
			'status'       => $map[ $status ] ?? 'pending',
			'status_label' => \LP_Order::get_status_label( $status ),
			'total'        => \Yallapp\Commerce\Money::plain( $order->get_formatted_order_total() ),
			'created_at'   => self::iso( (string) $date ),
			'items'        => $lines,
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
		$course = CourseModel::find( $post->ID, true );
		$image  = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $course ? $this->price( $course ) : self::price_shape( true ),
			'lesson_count' => $course ? (int) $course->count_items( LP_LESSON_CPT ) : 0,
			'rating'       => null,
			'rating_count' => 0,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => false,
		);
	}

	/**
	 * Price shape.
	 *
	 * @param CourseModel $course Course.
	 * @return array
	 */
	private function price( CourseModel $course ) {
		if ( $course->is_free() ) {
			return self::price_shape( true );
		}
		$regular = (float) $course->get_regular_price();
		$sale    = $course->has_sale_price() ? (float) $course->get_sale_price() : 0.0;
		return self::price_shape( false, $regular, $sale, learn_press_get_currency(), learn_press_format_price( $course->get_price() ) );
	}

	/**
	 * CurriculumItem shape.
	 *
	 * @param int                $item_id   Item ID.
	 * @param string             $item_type LearnPress item post type.
	 * @param bool               $access    Whether the user can open the course content.
	 * @param array<int, string> $statuses  The user's item statuses.
	 * @return array
	 */
	private function curriculum_item( $item_id, $item_type, $access, array $statuses ) {
		$types   = array(
			LP_LESSON_CPT     => 'lesson',
			LP_QUIZ_CPT       => 'quiz',
			'lp_assignment'   => 'assignment',
			'lp_h5p'          => 'lesson',
			'lp_zoom_meeting' => 'live',
		);
		$type    = $types[ $item_type ] ?? 'lesson';
		$preview = 'lesson' === $type && $this->is_preview( $item_id );
		$shape   = array(
			'id'               => $item_id,
			'type'             => $type,
			'title'            => html_entity_decode( get_the_title( $item_id ), ENT_QUOTES, 'UTF-8' ),
			'duration_minutes' => null,
			'question_count'   => null,
			'preview'          => $preview,
			'locked'           => ! ( $access || $preview ),
			'completed'        => 'completed' === ( $statuses[ $item_id ] ?? '' ),
		);
		$seconds = self::duration_seconds( (string) get_post_meta( $item_id, '_lp_duration', true ) );
		if ( 'lesson' === $type && $seconds > 0 ) {
			$shape['duration_minutes'] = (int) ceil( $seconds / 60 );
		} elseif ( 'quiz' === $type ) {
			$quiz                    = QuizPostModel::find( $item_id, true );
			$shape['question_count'] = $quiz ? (int) $quiz->count_questions() : 0;
		}
		return $shape;
	}

	/**
	 * The user's item statuses in a course (started, completed), keyed by item ID.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array<int, string>
	 */
	private function item_statuses( $course_id, $user_id ) {
		global $wpdb;
		$user_course = $user_id ? UserCourseModel::find( (int) $user_id, (int) $course_id, true ) : false;
		if ( ! $user_course instanceof UserCourseModel ) {
			return array();
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- LearnPress's progress table; one query for the whole curriculum.
		$rows     = $wpdb->get_results( $wpdb->prepare( "SELECT item_id, status FROM {$wpdb->prefix}learnpress_user_items WHERE user_id = %d AND parent_id = %d", $user_id, $user_course->get_user_item_id() ) );
		$statuses = array();
		foreach ( (array) $rows as $row ) {
			$statuses[ (int) $row->item_id ] = (string) $row->status;
		}
		return $statuses;
	}

	/**
	 * Course IDs the user has a LearnPress course item for, with one of the statuses, newest first.
	 *
	 * @param int      $user_id  User ID.
	 * @param string[] $statuses enrolled, finished.
	 * @return int[]
	 */
	private function user_course_ids( $user_id, array $statuses ) {
		global $wpdb;
		if ( ! $user_id ) {
			return array();
		}
		$in = implode( ',', array_fill( 0, count( $statuses ), '%s' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- LearnPress's enrollment table; $in holds placeholders.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT item_id FROM {$wpdb->prefix}learnpress_user_items WHERE user_id = %d AND item_type = %s AND status IN ({$in}) ORDER BY user_item_id DESC", array_merge( array( $user_id, LP_COURSE_CPT ), $statuses ) ) );
		return array_values( array_unique( array_map( 'intval', (array) $ids ) ) );
	}

	/**
	 * Whether a user can open a course's content: enrolled, a course that needs no
	 * enrollment, or someone who teaches it.
	 *
	 * @param CourseModel $course  Course.
	 * @param int         $user_id User ID.
	 * @return bool
	 */
	private function has_course_access( CourseModel $course, $user_id ) {
		if ( $course->has_no_enroll_requirement() ) {
			return true;
		}
		if ( $user_id > 0 && $this->teaches( $user_id, $course->get_id() ) ) {
			return true;
		}
		// 39 LearnPress's own rules (LP_User::can_view_content_course): a time limit or a
		// finished course can close it again.
		$user_course = $this->owned_course( $course->get_id(), $user_id );
		return null !== $user_course && ! self::blocked( $course, $user_course );
	}

	/**
	 * Whether a lesson is a free preview.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @return bool
	 */
	private function is_preview( $lesson_id ) {
		return 'yes' === get_post_meta( $lesson_id, '_lp_preview', true );
	}

	/**
	 * Lesson materials, LearnPress's downloadable files.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @return array[]
	 */
	private function attachments( $lesson_id ) {
		if ( ! class_exists( '\LP_Material_Files_DB' ) ) {
			return array();
		}
		$items = array();
		foreach ( (array) \LP_Material_Files_DB::getInstance()->get_material_by_item_id( (int) $lesson_id ) as $file ) {
			$upload  = 'upload' === $file->method;
			$path    = $upload ? wp_upload_dir()['basedir'] . $file->file_path : '';
			$items[] = array(
				'name'       => (string) $file->file_name,
				'url'        => esc_url_raw( $upload ? wp_upload_dir()['baseurl'] . $file->file_path : (string) $file->file_path ),
				'size_bytes' => ( $upload && file_exists( $path ) ) ? (int) filesize( $path ) : null,
				'mime_type'  => null,
			);
		}
		return $items;
	}

	/**
	 * Quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return QuizPostModel|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz = $this->published( $quiz_id, LP_QUIZ_CPT ) ? QuizPostModel::find( (int) $quiz_id, true ) : null;
		if ( ! $quiz ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		$course = CourseModel::find( $this->course_of( $quiz_id ), true );
		// 39 The same rules as lessons: a course past its time limit stays closed.
		if ( ! $course || ! $user_id || ! $this->owned_course( $course->get_id(), $user_id ) || ! $this->has_course_access( $course, $user_id ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		$this->start_if_purchased( $course->get_id(), $user_id );
		return $quiz;
	}

	/**
	 * The user's LearnPress quiz item.
	 *
	 * @param int $quiz_id   Quiz ID.
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return UserQuizModel|null
	 */
	private function user_quiz( $quiz_id, $course_id, $user_id ) {
		$filter          = new \LP_User_Items_Filter();
		$filter->user_id = (int) $user_id;
		$filter->item_id = (int) $quiz_id;
		$filter->ref_id  = (int) $course_id;
		$user_quiz       = UserQuizModel::get_user_item_model_from_db( $filter );
		return $user_quiz instanceof UserQuizModel ? $user_quiz : null;
	}

	/**
	 * Question shape.
	 *
	 * @param QuestionPostModel $question  Question.
	 * @param bool              $native    Whether the app answers natively.
	 * @param int               $course_id Course ID.
	 * @param int               $quiz_id   Quiz ID.
	 * @return array
	 */
	private function question_shape( QuestionPostModel $question, $native, $course_id, $quiz_id ) {
		$types   = array(
			'true_or_false'  => 'true_false',
			'single_choice'  => 'single_choice',
			'multi_choice'   => 'multiple_choice',
			'fill_in_blanks' => 'fill_in_blank',
			'sorting_choice' => 'ordering',
		);
		$options = array();
		if ( $native ) {
			foreach ( (array) $question->get_answer_option() as $answer ) {
				$options[] = array(
					'id'        => (string) $answer->value,
					'label'     => wp_strip_all_tags( (string) $answer->title ),
					'image_url' => null,
				);
			}
		}
		$description = (string) $question->post_content;
		$course      = CourseModel::find( (int) $course_id, true );
		return array(
			'id'               => (int) $question->get_id(),
			'type'             => $types[ (string) $question->get_type() ] ?? 'other',
			'title'            => wp_strip_all_tags( (string) $question->post_title ),
			'description_html' => '' !== trim( $description ) ? wp_kses_post( $description ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : ( $course ? $course->get_item_link( (int) $quiz_id, LP_QUIZ_CPT ) : (string) get_permalink( $quiz_id ) ),
			'options'          => $options,
			'points'           => (float) $question->get_mark(),
		);
	}

	/**
	 * The user's graded quiz results, newest first.
	 *
	 * @param int $user_id User ID.
	 * @param int $quiz_id Quiz ID, or 0 for every quiz.
	 * @return object[] Rows with id, quiz_id, result (JSON), end_time and is_latest.
	 */
	private function attempt_rows( $user_id, $quiz_id ) {
		global $wpdb;
		if ( ! $user_id ) {
			return array();
		}
		$quiz_sql = $quiz_id ? $wpdb->prepare( ' AND ui.item_id = %d', $quiz_id ) : '';
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- LearnPress's result tables; $quiz_sql is prepared.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT r.id, ui.item_id AS quiz_id, r.result, ui.end_time, ui.user_item_id,
					(SELECT MAX(r2.id) FROM {$wpdb->prefix}learnpress_user_item_results r2 WHERE r2.user_item_id = ui.user_item_id) AS latest_id
				FROM {$wpdb->prefix}learnpress_user_item_results r
				INNER JOIN {$wpdb->prefix}learnpress_user_items ui ON ui.user_item_id = r.user_item_id
				WHERE ui.user_id = %d AND ui.item_type = %s AND r.result IS NOT NULL AND r.result <> ''{$quiz_sql}
				ORDER BY r.id DESC",
				$user_id,
				LP_QUIZ_CPT
			)
		);
		// phpcs:enable
		return (array) $rows;
	}

	/**
	 * AttemptResult shape for a LearnPress result row.
	 *
	 * @param object $row Result row.
	 * @return array
	 */
	private function attempt_result( $row ) {
		$result = json_decode( (string) $row->result, true );
		$result = is_array( $result ) ? $result : array();
		$latest = (int) $row->latest_id === (int) $row->id;
		return array(
			'attempt_id'    => (int) $row->id,
			'quiz_id'       => (int) $row->quiz_id,
			'quiz_title'    => get_the_title( (int) $row->quiz_id ),
			'status'        => ! empty( $result['pass'] ) ? 'passed' : 'failed',
			'score_percent' => isset( $result['result'] ) ? round( (float) $result['result'], 2 ) : null,
			'finished_at'   => $latest ? self::iso( (string) $row->end_time ) : null,
		);
	}

	/**
	 * Quiz time limit in seconds, or null.
	 *
	 * @param QuizPostModel $quiz Quiz.
	 * @return int|null
	 */
	private function time_limit( QuizPostModel $quiz ) {
		$seconds = self::duration_seconds( $quiz->get_duration() );
		return $seconds > 0 ? $seconds : null;
	}

	/**
	 * Attempts allowed: the first one plus LearnPress's retakes, or null for unlimited.
	 *
	 * @param QuizPostModel $quiz Quiz.
	 * @return int|null
	 */
	private function attempts_allowed( QuizPostModel $quiz ) {
		$retakes = $quiz->get_retake_count();
		return $retakes < 0 ? null : 1 + $retakes;
	}

	/**
	 * Finishes the course with LearnPress's own rules once nothing is left to do, as the
	 * website's "Finish course" button would.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return void
	 */
	private function maybe_finish( $course_id, $user_id ) {
		$user_course = UserCourseModel::find( (int) $user_id, (int) $course_id, true );
		if ( ! $user_course instanceof UserCourseModel || ! $user_course->has_enrolled() ) {
			return;
		}
		$results = (array) $user_course->calculate_course_results( true );
		if ( (int) ( $results['completed_items'] ?? 0 ) < (int) ( $results['count_items'] ?? 1 ) || true !== $user_course->can_finish() ) {
			return;
		}
		try {
			$user_course->handle_finish();
		} catch ( Throwable $e ) {
			return;
		}
	}

	/**
	 * Seconds in a LearnPress duration such as "10 minute" or "2 week".
	 *
	 * @param string $duration Duration.
	 * @return int
	 */
	private static function duration_seconds( $duration ) {
		if ( ! preg_match( '/^\s*(\d+(?:\.\d+)?)\s*([a-z]*)/i', $duration, $match ) ) {
			return 0;
		}
		$units = array(
			'second' => 1,
			'minute' => 60,
			'hour'   => 3600,
			'day'    => 86400,
			'week'   => 604800,
		);
		$unit  = rtrim( strtolower( $match[2] ), 's' );
		return (int) round( (float) $match[1] * ( $units[ $unit ] ?? 60 ) );
	}
}
