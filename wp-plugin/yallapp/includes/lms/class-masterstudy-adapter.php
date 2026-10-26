<?php
/**
 * MasterStudy LMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use MasterStudy\Lms\Repositories\CurriculumMaterialRepository;
use MasterStudy\Lms\Repositories\CurriculumRepository;
use MasterStudy\Lms\Repositories\FileMaterialRepository;
use STM_LMS_Cart;
use STM_LMS_Course;
use STM_LMS_Helpers;
use STM_LMS_Lesson;
use STM_LMS_Options;
use STM_LMS_Quiz;
use STM_LMS_User;
use WP_Error;
use WP_Post;
use WP_Query;
use Yallapp\Commerce\Money;
use Yallapp\Commerce\Woo_Orders;

/**
 * MasterStudy LMS 3.0.0 and later; the end-to-end checks run against 3.4.9. Uses
 * MasterStudy's curriculum repositories, its enrollment and progress functions and its
 * answer checking (STM_LMS_Quiz::check_answer), so progress, emails and reports match
 * the website.
 *
 * MasterStudy's quiz page posts the answers to an AJAX handler that ends the request,
 * so submitting from the app repeats its steps: check each answer, store the answers
 * and the attempt, update the course progress and send the same email and hooks. The
 * app answers single choice, multiple choice and true/false questions natively; quizzes
 * with other question types (or a question bank) open in a web view.
 *
 * Reviews are held for approval, as on the website, and editing a review sends it back
 * for approval. A course counts as completed once its progress reaches MasterStudy's
 * certificate threshold. Certificates and assignments come from MasterStudy Pro, so
 * certificates use the `yallapp_certificate_url` filter.
 */
class MasterStudy_Adapter extends Base_Adapter {

	const NATIVE_QUESTION_TYPES = array( 'single_choice', 'multi_choice', 'true_false' );

	/** User meta with the attempt started in the app and not submitted yet. */
	const OPEN_ATTEMPT_META = 'yallapp_masterstudy_open_attempt';

	/** User meta mapping submitted app attempts to MasterStudy's attempt IDs. */
	const SUBMITTED_META = 'yallapp_masterstudy_submitted';

	/** User meta with the last attempt number given out. */
	const ATTEMPT_SEQ_META = 'yallapp_masterstudy_attempt_seq';

	/** Seconds allowed past the time limit for the answers to arrive. */
	const LATE_SUBMIT_GRACE = 30;

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'masterstudy';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'MS_LMS_VERSION' ) ? (string) MS_LMS_VERSION : '';
	}

	/**
	 * Whether MasterStudy LMS Pro is active.
	 *
	 * @return bool
	 */
	public function is_pro() {
		return defined( 'STM_LMS_PRO_FILE' ) || defined( 'STM_LMS_PRO_VERSION' );
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
			'wishlist'     => true,
			'reviews'      => true,
			'qna'          => false,
		);
	}

	/**
	 * Connects MasterStudy's enrollment hook, fired for free courses, orders and manual
	 * enrollments.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Unused: MasterStudy's Q&A is per lesson and not in the app.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'add_user_course', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- MasterStudy hook.
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
			'course'       => 'stm-courses',
			'lesson'       => 'stm-lessons',
			'quiz'         => 'stm-quizzes',
			'announcement' => '',
		);
	}

	/**
	 * Course categories.
	 *
	 * @return array[]
	 */
	public function categories() {
		return $this->terms( 'stm_lms_course_taxonomy' );
	}

	/**
	 * Lists courses. Free means no price and sold on its own (not only in a membership).
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, 'stm-courses', 'stm_lms_course_taxonomy' );
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
		$level  = (string) get_post_meta( $post->ID, 'level', true );
		$levels = STM_LMS_Helpers::get_course_levels();
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( wpautop( do_shortcode( $post->post_content ) ) ),
				'intro_video'      => null,
				'duration_minutes' => null,
				'level'            => '' !== $level ? (string) ( $levels[ $level ] ?? ucfirst( $level ) ) : null,
				'has_certificate'  => (bool) has_filter( 'yallapp_certificate_url' ),
				'categories'       => $this->terms( 'stm_lms_course_taxonomy', $post->ID ),
				'has_checkout'     => ! $this->is_free( $post->ID ) && ! get_post_meta( $post->ID, 'not_single_sale', true ) && (float) STM_LMS_Course::get_course_price( $post->ID ) > 0,
				'qna'              => false,
			)
		);
	}

	/**
	 * Sections and their materials in course order.
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
		$types  = array(
			'stm-lessons'      => 'lesson',
			'stm-quizzes'      => 'quiz',
			'stm-google-meets' => 'live',
		);
		if ( class_exists( 'STM_LMS_Assignments' ) ) {
			$types['stm-assignments'] = 'assignment';
		}
		$topics = array();
		foreach ( ( new CurriculumRepository() )->get_curriculum( $post->ID, true ) as $section ) {
			$items = array();
			foreach ( $section['materials'] as $material ) {
				$item_id = (int) $material['post_id'];
				$type    = $types[ $material['post_type'] ] ?? '';
				if ( '' === $type || ! $this->published( $item_id, $material['post_type'] ) ) {
					continue;
				}
				$preview = 'lesson' === $type && STM_LMS_Lesson::lesson_has_preview( $item_id );
				$items[] = array(
					'id'               => $item_id,
					'type'             => $type,
					'title'            => html_entity_decode( (string) get_the_title( $item_id ), ENT_QUOTES, 'UTF-8' ),
					'duration_minutes' => null,
					'question_count'   => 'quiz' === $type ? count( $this->quiz_question_ids( $item_id ) ) : null,
					'preview'          => $preview,
					'locked'           => ! ( $access || $preview ),
					'completed'        => $user_id > 0 && STM_LMS_Lesson::is_lesson_completed( (int) $user_id, $post->ID, $item_id ),
				);
			}
			$topics[] = array(
				'id'    => (int) $section['id'],
				'title' => html_entity_decode( (string) $section['title'], ENT_QUOTES, 'UTF-8' ),
				'items' => $items,
			);
		}
		return $topics;
	}

	/**
	 * Whether a user is enrolled and the course hasn't expired for them.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id ) {
		if ( $user_id <= 0 || $course_id <= 0 ) {
			return false;
		}
		return (bool) stm_lms_get_user_course( (int) $user_id, (int) $course_id, array( 'user_course_id' ) ) && ! STM_LMS_Course::is_course_time_expired( (int) $user_id, (int) $course_id );
	}

	/**
	 * Whether a course is free: no price, and sold on its own rather than only in a membership.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		return ! get_post_meta( (int) $course_id, 'not_single_sale', true ) && empty( STM_LMS_Course::get_course_price( (int) $course_id ) );
	}

	/**
	 * Enrolls in a free course the way the course page does.
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
		if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
			if ( class_exists( 'STM_LMS_Prerequisites' ) && ! \STM_LMS_Prerequisites::is_prerequisite( true, (int) $course_id ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Finish the required courses first.', 'yallapp' ), array( 'status' => 403 ) );
			}
			STM_LMS_Course::add_user_course( (int) $course_id, (int) $user_id, STM_LMS_Lesson::get_lesson_url( (int) $course_id, '' ), 0 );
			STM_LMS_Course::add_student( (int) $course_id );
		}
		$row = STM_LMS_Course::get_user_course( (int) $user_id, (int) $course_id );
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => gmdate( 'Y-m-d\TH:i:s\Z', ! empty( $row['start_time'] ) ? (int) $row['start_time'] : time() ),
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
			if ( $this->passed( $course_id, $user_id ) ) {
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
		$post = $this->published( $lesson_id, 'stm-lessons' );
		if ( ! $post ) {
			return null;
		}
		$course_id   = $this->course_of( $post->ID );
		$neighbours  = $this->neighbours( $course_id, $post->ID, $user_id );
		$attachments = array();
		foreach ( ( new FileMaterialRepository() )->get_files( get_post_meta( $post->ID, 'lesson_files', true ) ) as $file ) {
			$shape = self::attachment_shape( $file->ID );
			if ( $shape ) {
				$attachments[] = $shape;
			}
		}
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => $this->video( $post->ID ),
			'attachments' => $attachments,
			'preview'     => STM_LMS_Lesson::lesson_has_preview( $post->ID ),
			'completed'   => $user_id > 0 && $course_id && STM_LMS_Lesson::is_lesson_completed( (int) $user_id, $course_id, $post->ID ),
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
		);
	}

	/**
	 * Whether a user may open a lesson: a preview lesson, or enrolled in its course.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		if ( 'stm-lessons' !== get_post_type( $lesson_id ) ) {
			return false;
		}
		if ( STM_LMS_Lesson::lesson_has_preview( $lesson_id ) ) {
			return true;
		}
		$course_id = $this->course_of( $lesson_id );
		return $user_id > 0 && $course_id && ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) );
	}

	/**
	 * Marks a lesson complete as the lesson page's "Complete lesson" button does.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$course_id = $this->course_of( $lesson_id );
		if ( ! $course_id || 'stm-lessons' !== get_post_type( $lesson_id ) || ! $this->is_enrolled( $course_id, $user_id ) ) {
			return self::not_enrolled();
		}
		$lesson_id = (int) $lesson_id;
		$user_id   = (int) $user_id;
		if ( ! STM_LMS_Lesson::is_lesson_completed( $user_id, $course_id, $lesson_id ) ) {
			$end_time   = time();
			$start_time = get_user_meta( $user_id, "stm_lms_course_started_{$course_id}_{$lesson_id}", true );
			stm_lms_add_user_lesson( compact( 'user_id', 'course_id', 'lesson_id', 'start_time', 'end_time' ) );
			STM_LMS_Course::update_course_progress( $user_id, $course_id );
			/** This action is documented in MasterStudy LMS. */
			do_action( 'stm_lms_lesson_passed', $user_id, $lesson_id, $course_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- MasterStudy hook.
			delete_user_meta( $user_id, "stm_lms_course_started_{$course_id}_{$lesson_id}" );
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Course progress: MasterStudy's percentage, with lessons and quizzes completed.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$materials = array_map( 'intval', ( new CurriculumMaterialRepository() )->get_course_materials( (int) $course_id ) );
		$done      = 0;
		if ( $user_id ) {
			foreach ( $materials as $item_id ) {
				if ( STM_LMS_Lesson::is_lesson_completed( (int) $user_id, (int) $course_id, $item_id ) ) {
					++$done;
				}
			}
		}
		$row = $user_id ? STM_LMS_Course::get_user_course( (int) $user_id, (int) $course_id ) : array();
		return self::progress_shape(
			$course_id,
			$done,
			count( $materials ),
			$this->passed( $course_id, $user_id ),
			(int) ( $row['progress_percent'] ?? 0 )
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
		$course_id = $this->quiz_access( $quiz_id, $user_id );
		if ( is_wp_error( $course_id ) ) {
			return $course_id;
		}
		$duration = STM_LMS_Quiz::get_quiz_duration( $quiz_id );
		$rows     = $this->quiz_attempts( $user_id, $quiz_id );
		return array(
			'id'                 => (int) $quiz_id,
			'course_id'          => $course_id,
			'title'              => (string) get_post_field( 'post_title', $quiz_id ),
			'question_count'     => count( $this->quiz_question_ids( $quiz_id ) ),
			'time_limit_seconds' => $duration ? (int) $duration : null,
			'pass_percent'       => (int) round( (float) get_post_meta( $quiz_id, 'passing_grade', true ) ),
			'attempts_allowed'   => $this->attempts_allowed( $quiz_id ),
			'attempts_used'      => count( $rows ),
			'last_result'        => $rows ? $this->attempt_result( $rows[0] ) : null,
		);
	}

	/**
	 * Starts an attempt and its timer, as the quiz page's "Start quiz" button does.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return array|WP_Error
	 */
	public function start_attempt( $quiz_id, $user_id ) {
		$course_id = $this->quiz_access( $quiz_id, $user_id );
		if ( is_wp_error( $course_id ) ) {
			return $course_id;
		}
		$allowed = $this->attempts_allowed( $quiz_id );
		if ( null !== $allowed && $this->course_attempt_count( $user_id, $course_id, $quiz_id ) >= $allowed ) {
			return new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$ids = $this->quiz_question_ids( $quiz_id );
		if ( ! $ids ) {
			return new WP_Error( 'unsupported', __( 'This quiz has no questions yet.', 'yallapp' ), array( 'status' => 409 ) );
		}
		if ( get_post_meta( $quiz_id, 'random_questions', true ) ) {
			shuffle( $ids );
		}
		$native = true;
		foreach ( $ids as $question_id ) {
			$native = $native && in_array( (string) get_post_meta( $question_id, 'type', true ), self::NATIVE_QUESTION_TYPES, true );
		}
		$shaped = array();
		foreach ( $ids as $question_id ) {
			$shaped[] = $this->question_shape( $question_id, $native, $course_id, (int) $quiz_id );
		}

		// The quiz page's timer: a new one when none is running or the last one ran out.
		$duration = (int) STM_LMS_Quiz::get_quiz_duration( $quiz_id );
		$timer    = STM_LMS_Helpers::simplify_db_array( stm_lms_get_user_quizzes_time( (int) $user_id, (int) $quiz_id, array( 'start_time', 'end_time' ) ) );
		if ( empty( $timer ) || ( $duration && time() > (int) $timer['end_time'] ) ) {
			stm_lms_get_delete_user_quiz_time( (int) $user_id, (int) $quiz_id );
			$timer = array(
				'user_id'    => (int) $user_id,
				'quiz_id'    => (int) $quiz_id,
				'start_time' => time(),
				'end_time'   => $duration ? time() + $duration : 0,
			);
			stm_lms_add_user_quiz_time( $timer );
		}
		$attempt = array(
			'id'        => $this->next_attempt_id( $user_id ),
			'quiz'      => (int) $quiz_id,
			'course'    => $course_id,
			'native'    => $native,
			'questions' => $ids,
		);
		update_user_meta( $user_id, self::OPEN_ATTEMPT_META, $attempt );
		return array(
			'id'         => $attempt['id'],
			'quiz_id'    => (int) $quiz_id,
			'started_at' => gmdate( 'c', (int) $timer['start_time'] ),
			'ends_at'    => $duration && (int) $timer['end_time'] ? gmdate( 'c', (int) $timer['end_time'] ) : null,
			'questions'  => $shaped,
		);
	}

	/**
	 * Checks and stores the answers the way MasterStudy's quiz page handler does
	 * (STM_LMS_Quiz::user_answers): every question is worth the same share of 100%, retakes
	 * lose the quiz's retake cut, and a passed quiz updates the course progress.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    AnswerInput shapes.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$user_id = (int) $user_id;
		$quiz_id = (int) $quiz_id;
		$open    = get_user_meta( $user_id, self::OPEN_ATTEMPT_META, true );
		if ( ! is_array( $open ) || (int) $open['id'] !== (int) $attempt_id || (int) $open['quiz'] !== $quiz_id ) {
			$submitted = get_user_meta( $user_id, self::SUBMITTED_META, true );
			if ( is_array( $submitted ) && isset( $submitted[ (int) $attempt_id ] ) ) {
				return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
			}
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		if ( empty( $open['native'] ) ) {
			return new WP_Error( 'unsupported', __( 'Take this quiz on the quiz page.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$course_id = (int) $open['course'];
		$given     = array();
		foreach ( $answers as $answer ) {
			$given[ (int) ( $answer['question_id'] ?? 0 ) ] = array_values( array_filter( array_map( 'strval', (array) ( $answer['option_ids'] ?? array() ) ), 'strlen' ) );
		}

		$quiz_info      = STM_LMS_Helpers::parse_meta_field( $quiz_id );
		$questions      = array_map( 'intval', (array) $open['questions'] );
		$share          = 100 / count( $questions );
		$cutting_rate   = ! empty( $quiz_info['re_take_cut'] ) ? ( 100 - $quiz_info['re_take_cut'] ) / 100 : 1;
		$passing_grade  = ! empty( $quiz_info['passing_grade'] ) ? intval( $quiz_info['passing_grade'] ) : 0;
		$attempt_number = count( stm_lms_get_user_quizzes( $user_id, $quiz_id, array( 'user_quiz_id' ) ) ) + 1;
		$progress       = 0;
		$timer          = STM_LMS_Helpers::simplify_db_array( stm_lms_get_user_quizzes_time( $user_id, $quiz_id, array( 'end_time' ) ) );
		$late           = STM_LMS_Quiz::get_quiz_duration( $quiz_id ) && ! empty( $timer['end_time'] ) && time() > (int) $timer['end_time'] + self::LATE_SUBMIT_GRACE;
		if ( ! $late ) {
			foreach ( $questions as $question_id ) {
				$answer         = $this->answer_value( $question_id, $given[ $question_id ] ?? array() );
				$correct_answer = STM_LMS_Quiz::check_answer( $question_id, $answer );
				if ( $correct_answer ) {
					$progress += $share;
				}
				$user_answer = is_array( $answer ) ? implode( ',', $answer ) : $answer;
				stm_lms_add_user_answer( compact( 'user_id', 'course_id', 'quiz_id', 'question_id', 'attempt_number', 'user_answer', 'correct_answer' ) );
			}
		}
		// As the quiz page does, a quiz answered after its time ran out fails with 0%.
		$progress  = 1 === $attempt_number ? round( $progress ) : round( $progress * $cutting_rate );
		$status    = $progress < $passing_grade ? 'failed' : 'passed';
		$sequency  = wp_json_encode( array() );
		$user_quiz = compact( 'user_id', 'course_id', 'quiz_id', 'progress', 'status', 'sequency' );
		global $wpdb;
		stm_lms_add_user_quiz( $user_quiz );
		$user_quiz_id = (int) $wpdb->insert_id;
		stm_lms_get_delete_user_quiz_time( $user_id, $quiz_id );
		delete_user_meta( $user_id, self::OPEN_ATTEMPT_META );
		$submitted                      = get_user_meta( $user_id, self::SUBMITTED_META, true );
		$submitted                      = is_array( $submitted ) ? $submitted : array();
		$submitted[ (int) $attempt_id ] = $user_quiz_id;
		update_user_meta( $user_id, self::SUBMITTED_META, array_slice( $submitted, -20, null, true ) );

		if ( 'passed' === $status ) {
			STM_LMS_Course::update_course_progress( $user_id, $course_id );
			$user         = STM_LMS_User::get_current_user( $user_id );
			$user_login   = $user['login'] ?? '';
			$course_title = get_the_title( $course_id );
			$quiz_name    = get_the_title( $quiz_id );
			$message      = sprintf(
				/* translators: The quiz email MasterStudy sends (its own wording): 1: student, 2: quiz, 3: course, 4: passing grade, 5: result. */
				esc_html__( '%1$s completed the %2$s on the course %3$s with a Passing grade of %4$s%% and a result of %5$s%%', 'yallapp' ),
				$user_login,
				$quiz_name,
				$course_title,
				$passing_grade,
				$progress
			);
			STM_LMS_Helpers::send_email( $user['email'] ?? '', 'Quiz Completed', $message, 'stm_lms_course_quiz_completed_for_user', compact( 'user_login', 'course_title', 'quiz_name', 'passing_grade', 'progress' ) );
		}
		/** This action is documented in MasterStudy LMS. */
		do_action( 'stm_lms_quiz_' . $status, $user_id, $quiz_id, (int) $progress, $course_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- MasterStudy hook.

		return $this->attempt_result(
			array(
				'user_quiz_id' => $user_quiz_id,
				'quiz_id'      => $quiz_id,
				'progress'     => $progress,
				'status'       => $status,
			)
		);
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
		$fields = array( 'user_quiz_id', 'quiz_id', 'progress', 'status' );
		$rows   = stm_lms_get_user_all_quizzes( (int) $user_id, (int) $per_page, max( 0, ( (int) $page - 1 ) * (int) $per_page ), $fields );
		$total  = STM_LMS_Helpers::simplify_db_array( stm_lms_get_user_all_quizzes( (int) $user_id, '', '', array(), true ) );
		return array(
			'items' => array_map( array( $this, 'attempt_result' ), (array) $rows ),
			'total' => (int) ( $total['COUNT(*)'] ?? 0 ),
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
	 * The course page, where MasterStudy's "Buy" button starts its checkout.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		return (string) get_permalink( $course_id );
	}

	/**
	 * The course a lesson or quiz belongs to: the first published course whose curriculum
	 * has it (MasterStudy can reuse a lesson in several courses).
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		if ( 'stm-courses' === get_post_type( $post_id ) ) {
			return (int) $post_id;
		}
		foreach ( ( new CurriculumRepository() )->get_lesson_course_ids( (int) $post_id ) as $course_id ) {
			if ( $this->live( (int) $course_id, 'stm-courses' ) ) {
				return (int) $course_id;
			}
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
		return array_values( array_unique( array_map( 'intval', wp_list_pluck( (array) stm_lms_get_course_users( (int) $course_id, array( 'user_id' ) ), 'user_id' ) ) ) );
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
		$ids = array();
		foreach ( (array) stm_lms_get_user_courses( (int) $user_id, '', '', array( 'course_id' ) ) as $row ) {
			$course_id = (int) $row['course_id'];
			if ( $this->live( $course_id, 'stm-courses' ) && ! STM_LMS_Course::is_course_time_expired( (int) $user_id, $course_id ) ) {
				$ids[] = $course_id;
			}
		}
		return array_values( array_unique( $ids ) );
	}

	/**
	 * Wishlisted courses. 62 Private ones the student may open (Course_Visibility) too.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function wishlist( $user_id ) {
		$items = array();
		foreach ( array_reverse( array_map( 'intval', (array) STM_LMS_User::get_wishlist( (int) $user_id ) ) ) as $course_id ) {
			$post = $this->course_post( $course_id, (int) $user_id );
			if ( $post ) {
				$items[] = $this->summary( $post, $user_id );
			}
		}
		return $items;
	}

	/**
	 * Adds or removes a wishlist entry in MasterStudy's own wishlist.
	 *
	 * @param int  $user_id   User ID.
	 * @param int  $course_id Course ID.
	 * @param bool $on        Add when true.
	 * @return true|WP_Error
	 */
	public function set_wishlist( $user_id, $course_id, $on ) {
		if ( ! $this->course_post( $course_id, (int) $user_id ) ) {
			return self::not_found( __( 'Course not found.', 'yallapp' ) );
		}
		$list = array_values(
			array_diff( array_map( 'intval', (array) STM_LMS_User::get_wishlist( (int) $user_id ) ), array( (int) $course_id ) )
		);
		if ( $on ) {
			$list[] = (int) $course_id;
		}
		STM_LMS_User::update_wishlist( (int) $user_id, $list );
		return true;
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
		$query = new WP_Query(
			array(
				'post_type'      => 'stm-reviews',
				'post_status'    => 'publish',
				'posts_per_page' => (int) $per_page,
				'paged'          => max( 1, (int) $page ),
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => 'review_course',
						'value' => (int) $course_id,
					),
				),
			)
		);
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->review_shape( $post, $user_id );
		}
		return array(
			'items'   => $items,
			'total'   => (int) $query->found_posts,
			'summary' => self::rating_summary( $this->rating_counts( $course_id ) ),
		);
	}

	/**
	 * The user's review, approved or waiting for approval.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|null
	 */
	public function my_review( $course_id, $user_id ) {
		$post = $user_id ? $this->review_post( $course_id, $user_id ) : null;
		return $post ? $this->review_shape( $post, $user_id ) : null;
	}

	/**
	 * Writes a review the way MasterStudy's review form does: held for approval, with an
	 * email to the site admin. Editing a review sends it back for approval.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param int    $rating    1 to 5.
	 * @param string $text      Review text.
	 * @return array|WP_Error
	 */
	public function save_review( $course_id, $user_id, $rating, $text ) {
		if ( (int) get_post_field( 'post_author', $course_id ) === (int) $user_id || (int) get_post_meta( $course_id, 'co_instructor', true ) === (int) $user_id ) {
			return new WP_Error( 'not_allowed', __( "You can't review your own course.", 'yallapp' ), array( 'status' => 403 ) );
		}
		$text = trim( (string) $text );
		if ( '' === $text ) {
			return new WP_Error( 'invalid_review', __( 'Write a few words about the course.', 'yallapp' ), array( 'status' => 400 ) );
		}
		$rating   = max( 1, min( 5, (int) $rating ) );
		$existing = $this->review_post( $course_id, $user_id );
		if ( $existing ) {
			wp_update_post(
				array(
					'ID'           => $existing->ID,
					'post_content' => $text,
					'post_status'  => 'pending',
				)
			);
			update_post_meta( $existing->ID, 'review_mark', $rating );
		} else {
			$user      = STM_LMS_User::get_current_user( (int) $user_id );
			$login     = $user['login'] ?? '';
			$review_id = wp_insert_post(
				array(
					'post_type'    => 'stm-reviews',
					'post_title'   => wp_strip_all_tags(
						/* translators: The review title MasterStudy uses (its own wording): 1: course, 2: student. */
						sprintf( esc_html__( 'Review on %1$s by %2$s', 'yallapp' ), get_the_title( $course_id ), $login )
					),
					'post_content' => $text,
					'post_status'  => 'pending',
					'post_author'  => (int) $user_id,
				)
			);
			if ( ! $review_id || is_wp_error( $review_id ) ) {
				return new WP_Error( 'review_failed', __( 'Your review could not be saved. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
			}
			update_post_meta( $review_id, 'review_course', (int) $course_id );
			update_post_meta( $review_id, 'review_user', (int) $user_id );
			update_post_meta( $review_id, 'review_mark', $rating );
			$course_title = get_the_title( $course_id );
			STM_LMS_Helpers::send_email(
				'admin',
				esc_html__( 'New Review', 'yallapp' ),
				/* translators: The new review email MasterStudy sends (its own wording): 1: course, 2: student. */
				sprintf( esc_html__( 'Check out new review on course %1$s by %2$s', 'yallapp' ), $course_title, $login ),
				'stm_lms_new_review',
				compact( 'course_title', 'login' )
			);
		}
		$review = $this->my_review( $course_id, $user_id );
		return $review ? $review : new WP_Error( 'review_failed', __( 'Your review could not be saved. Please try again.', 'yallapp' ), array( 'status' => 500 ) );
	}

	/**
	 * MasterStudy sells courses through its own checkout or WooCommerce.
	 *
	 * @return bool
	 */
	public function sells_courses() {
		return true;
	}

	/**
	 * Orders, newest first: WooCommerce's when MasterStudy checks out through it, otherwise
	 * MasterStudy's own.
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
		if ( STM_LMS_Cart::woocommerce_checkout_enabled() && Woo_Orders::available() ) {
			return Woo_Orders::for_user(
				$user_id,
				$page,
				$per_page,
				static function ( $product_id ) {
					// MasterStudy sells the course post itself as the WooCommerce product.
					return 'stm-courses' === get_post_type( (int) $product_id ) ? (int) $product_id : 0;
				}
			);
		}
		$query = new WP_Query(
			array(
				'post_type'      => 'stm-orders',
				'post_status'    => 'publish',
				'posts_per_page' => (int) $per_page,
				'paged'          => max( 1, (int) $page ),
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => 'user_id',
						'value' => (int) $user_id,
					),
				),
			)
		);
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->order_shape( $post );
		}
		return array(
			'items' => $items,
			'total' => (int) $query->found_posts,
		);
	}

	/**
	 * Order shape for a MasterStudy order.
	 *
	 * @param WP_Post $post Order.
	 * @return array
	 */
	private function order_shape( WP_Post $post ) {
		$status = (string) get_post_meta( $post->ID, 'status', true );
		$labels = array(
			'completed' => __( 'Completed', 'yallapp' ),
			'pending'   => __( 'Pending payment', 'yallapp' ),
			'cancelled' => __( 'Cancelled', 'yallapp' ),
		);
		$total  = 0.0;
		$lines  = array();
		foreach ( (array) get_post_meta( $post->ID, 'items', true ) as $item ) {
			$item_id = (int) ( $item['item_id'] ?? 0 );
			$total  += (float) ( $item['price'] ?? 0 );
			$lines[] = array(
				'name'      => html_entity_decode( (string) get_the_title( $item_id ), ENT_QUOTES, 'UTF-8' ),
				'course_id' => 'stm-courses' === get_post_type( $item_id ) ? $item_id : null,
			);
		}
		$date = (int) get_post_meta( $post->ID, 'date', true );
		return array(
			'id'           => (int) $post->ID,
			'number'       => (string) $post->ID,
			'status'       => isset( $labels[ $status ] ) ? $status : 'pending',
			'status_label' => $labels[ $status ] ?? $labels['pending'],
			'total'        => Money::plain( STM_LMS_Helpers::display_price( $total ) ),
			'created_at'   => $date ? gmdate( 'Y-m-d\TH:i:s\Z', $date ) : self::iso( (string) $post->post_date_gmt ),
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
		$image   = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		$lessons = 0;
		foreach ( ( new CurriculumMaterialRepository() )->get_course_materials( $post->ID, false ) as $material ) {
			if ( 'stm-lessons' === ( is_object( $material ) ? $material->post_type : ( $material['post_type'] ?? '' ) ) ) {
				++$lessons;
			}
		}
		$rating = self::rating_summary( $this->rating_counts( $post->ID ) );
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $post->ID ),
			'lesson_count' => $lessons,
			'rating'       => $rating['rating'],
			'rating_count' => $rating['rating_count'],
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => $user_id > 0 && in_array( (int) $post->ID, array_map( 'intval', (array) STM_LMS_User::get_wishlist( (int) $user_id ) ), true ),
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
			return self::price_shape( true );
		}
		$regular = (float) get_post_meta( $course_id, 'price', true );
		$sale    = (float) STM_LMS_Course::get_sale_price( $course_id );
		$current = STM_LMS_Course::get_course_price( $course_id );
		return self::price_shape( false, $regular > 0 ? $regular : $sale, $sale, null, $current ? STM_LMS_Helpers::display_price( $current ) : '' );
	}

	/**
	 * IDs of published free courses.
	 *
	 * @return int[]
	 */
	private function free_course_ids() {
		$ids = array();
		foreach ( get_posts(
			array(
				'post_type'      => 'stm-courses',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		) as $course_id ) {
			if ( $this->is_free( (int) $course_id ) ) {
				$ids[] = (int) $course_id;
			}
		}
		return $ids;
	}

	/**
	 * Whether the student passed the course: progress at MasterStudy's certificate threshold.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	private function passed( $course_id, $user_id ) {
		if ( ! $user_id ) {
			return false;
		}
		$row = STM_LMS_Course::get_user_course( (int) $user_id, (int) $course_id );
		return ! empty( $row ) && (int) $row['progress_percent'] > 0 && (int) STM_LMS_Options::get_option( 'certificate_threshold', 70 ) <= (int) $row['progress_percent'];
	}

	/**
	 * Whether a user teaches a course: its author, its co-instructor or an administrator.
	 *
	 * @param int $user_id   User.
	 * @param int $course_id Course.
	 * @return bool
	 */
	protected function teaches( $user_id, $course_id ) {
		return parent::teaches( $user_id, $course_id ) || ( $user_id > 0 && (int) get_post_meta( $course_id, 'co_instructor', true ) === (int) $user_id );
	}

	/**
	 * Raw video data from the lesson's video source.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @return array|null
	 */
	private function video( $lesson_id ) {
		$poster_id = (int) get_post_meta( $lesson_id, 'lesson_video_poster', true );
		$poster    = $poster_id ? (string) wp_get_attachment_url( $poster_id ) : '';
		switch ( (string) get_post_meta( $lesson_id, 'video_type', true ) ) {
			case 'youtube':
				return self::video_from_value( (string) get_post_meta( $lesson_id, 'lesson_youtube_url', true ) );
			case 'vimeo':
				return self::video_from_value( (string) get_post_meta( $lesson_id, 'lesson_vimeo_url', true ) );
			case 'ext_link':
				return self::video_from_value( (string) get_post_meta( $lesson_id, 'lesson_ext_link_url', true ), null, $poster );
			case 'embed':
				return self::video_from_value( (string) get_post_meta( $lesson_id, 'lesson_embed_ctx', true ) );
			case 'html':
				$video = self::video_from_attachment( (int) get_post_meta( $lesson_id, 'lesson_video', true ) );
				if ( $video && '' !== $poster ) {
					$video['poster_url'] = $poster;
				}
				return $video;
			default:
				return null;
		}
	}

	/**
	 * The quiz's question IDs in order.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int[]
	 */
	private function quiz_question_ids( $quiz_id ) {
		$ids = array();
		foreach ( explode( ',', (string) get_post_meta( $quiz_id, 'questions', true ) ) as $id ) {
			if ( (int) $id && $this->published( (int) $id, 'stm-questions' ) ) {
				$ids[] = (int) $id;
			}
		}
		return $ids;
	}

	/**
	 * The quiz's attempt limit when the site limits attempts.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int|null
	 */
	private function attempts_allowed( $quiz_id ) {
		$attempts = (int) get_post_meta( $quiz_id, 'attempts', true );
		return ( 'limited' === STM_LMS_Options::get_option( 'quiz_attempts' ) && $attempts > 0 ) ? $attempts : null;
	}

	/**
	 * How many times the student took the quiz in a course.
	 *
	 * @param int $user_id   User ID.
	 * @param int $course_id Course ID.
	 * @param int $quiz_id   Quiz ID.
	 * @return int
	 */
	private function course_attempt_count( $user_id, $course_id, $quiz_id ) {
		$total = STM_LMS_Helpers::simplify_db_array( stm_lms_get_user_all_course_quizzes( (int) $user_id, (int) $course_id, (int) $quiz_id, array(), true ) );
		return (int) ( $total['COUNT(*)'] ?? 0 );
	}

	/**
	 * The course of a quiz, if the user may take it.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return int|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$course_id = $this->published( $quiz_id, 'stm-quizzes' ) ? $this->course_of( $quiz_id ) : 0;
		if ( ! $course_id ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		if ( ! $user_id || ! ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		return $course_id;
	}

	/**
	 * A question's stored answers.
	 *
	 * @param int $question_id Question ID.
	 * @return array[]
	 */
	private static function stored_answers( $question_id ) {
		$answers = get_post_meta( $question_id, 'answers', true );
		return is_array( $answers ) ? array_values( $answers ) : array();
	}

	/**
	 * A stored answer as the quiz page posts it: its text, and its image URL when it has one.
	 *
	 * @param array $answer Stored answer.
	 * @return string
	 */
	private static function answer_text( array $answer ) {
		$text = (string) ( $answer['text'] ?? '' );
		if ( ! empty( $answer['text_image']['url'] ) ) {
			$text .= '|' . esc_url( $answer['text_image']['url'] );
		}
		return $text;
	}

	/**
	 * A submitted answer in the form MasterStudy's quiz page posts it.
	 *
	 * @param int      $question_id Question ID.
	 * @param string[] $option_ids  Chosen option IDs (answer positions).
	 * @return string|string[]
	 */
	private function answer_value( $question_id, array $option_ids ) {
		$stored = self::stored_answers( $question_id );
		$texts  = array();
		foreach ( $option_ids as $id ) {
			if ( ctype_digit( $id ) && isset( $stored[ (int) $id ] ) ) {
				$texts[] = self::answer_text( $stored[ (int) $id ] );
			}
		}
		if ( 'multi_choice' === get_post_meta( $question_id, 'type', true ) ) {
			return $texts;
		}
		return $texts ? $texts[0] : '';
	}

	/**
	 * Question shape.
	 *
	 * @param int  $question_id Question ID.
	 * @param bool $native      Whether the app answers natively.
	 * @param int  $course_id   Course ID.
	 * @param int  $quiz_id     Quiz ID.
	 * @return array
	 */
	private function question_shape( $question_id, $native, $course_id, $quiz_id ) {
		$type    = (string) get_post_meta( $question_id, 'type', true );
		$types   = array(
			'single_choice' => 'single_choice',
			'multi_choice'  => 'multiple_choice',
			'true_false'    => 'true_false',
			'item_match'    => 'matching',
			'image_match'   => 'matching',
			'keywords'      => 'short_answer',
			'fill_the_gap'  => 'fill_in_blank',
		);
		$options = array();
		if ( $native ) {
			foreach ( self::stored_answers( $question_id ) as $index => $answer ) {
				$options[] = array(
					'id'        => (string) $index,
					'label'     => self::plain_text( (string) ( $answer['text'] ?? '' ) ),
					'image_url' => ! empty( $answer['text_image']['url'] ) ? esc_url_raw( $answer['text_image']['url'] ) : null,
				);
			}
		}
		$description = trim( (string) get_post_field( 'post_content', $question_id ) );
		return array(
			'id'               => (int) $question_id,
			'type'             => $types[ $type ] ?? 'other',
			'title'            => wp_strip_all_tags( (string) get_post_field( 'post_title', $question_id ) ),
			'description_html' => '' !== $description ? wp_kses_post( wpautop( $description ) ) : null,
			'render_mode'      => $native ? 'native' : 'webview',
			'webview_url'      => $native ? null : STM_LMS_Lesson::get_lesson_url( $course_id, $quiz_id ),
			'options'          => $options,
			'points'           => 1.0,
		);
	}

	/**
	 * The student's attempts on a quiz, newest first.
	 *
	 * @param int $user_id User ID.
	 * @param int $quiz_id Quiz ID.
	 * @return array[]
	 */
	private function quiz_attempts( $user_id, $quiz_id ) {
		$rows = (array) stm_lms_get_user_quizzes( (int) $user_id, (int) $quiz_id, array( 'user_quiz_id', 'quiz_id', 'progress', 'status' ) );
		usort(
			$rows,
			static function ( $a, $b ) {
				return (int) $b['user_quiz_id'] - (int) $a['user_quiz_id'];
			}
		);
		return $rows;
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
	 * AttemptResult shape. MasterStudy doesn't record when an attempt finished.
	 *
	 * @param array $row user_quizzes row.
	 * @return array
	 */
	private function attempt_result( array $row ) {
		return array(
			'attempt_id'    => (int) $row['user_quiz_id'],
			'quiz_id'       => (int) $row['quiz_id'],
			'quiz_title'    => (string) get_post_field( 'post_title', (int) $row['quiz_id'] ),
			'status'        => 'passed' === $row['status'] ? 'passed' : 'failed',
			'score_percent' => (float) $row['progress'],
			'finished_at'   => null,
		);
	}

	/**
	 * Approved reviews per star.
	 *
	 * @param int $course_id Course ID.
	 * @return array<int, int>
	 */
	private function rating_counts( $course_id ) {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- One grouped query instead of loading every review.
		$rows   = $wpdb->get_results( $wpdb->prepare( "SELECT mark.meta_value AS mark, COUNT(*) AS n FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} course ON course.post_id = p.ID AND course.meta_key = 'review_course' AND course.meta_value = %d INNER JOIN {$wpdb->postmeta} mark ON mark.post_id = p.ID AND mark.meta_key = 'review_mark' WHERE p.post_type = 'stm-reviews' AND p.post_status = 'publish' GROUP BY mark.meta_value", (int) $course_id ) );
		$counts = array();
		foreach ( (array) $rows as $row ) {
			$star            = max( 1, min( 5, (int) $row->mark ) );
			$counts[ $star ] = ( $counts[ $star ] ?? 0 ) + (int) $row->n;
		}
		return $counts;
	}

	/**
	 * The user's review post on a course.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return WP_Post|null
	 */
	private function review_post( $course_id, $user_id ) {
		$posts = get_posts(
			array(
				'post_type'      => 'stm-reviews',
				'post_status'    => array( 'publish', 'pending' ),
				'posts_per_page' => 1,
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
					array(
						'key'   => 'review_course',
						'value' => (int) $course_id,
					),
					array(
						'key'   => 'review_user',
						'value' => (int) $user_id,
					),
				),
			)
		);
		return $posts ? $posts[0] : null;
	}

	/**
	 * Review shape.
	 *
	 * @param WP_Post $post    Review.
	 * @param int     $user_id Current user.
	 * @return array
	 */
	private function review_shape( WP_Post $post, $user_id ) {
		$author    = (int) get_post_meta( $post->ID, 'review_user', true );
		$course_id = (int) get_post_meta( $post->ID, 'review_course', true );
		return array(
			'id'         => (int) $post->ID,
			'rating'     => max( 1, min( 5, (int) get_post_meta( $post->ID, 'review_mark', true ) ) ),
			'text'       => self::plain_text( (string) $post->post_content ),
			'author'     => $this->person( $author, $this->teaches( $author, $course_id ) ),
			'created_at' => gmdate( 'Y-m-d\TH:i:s\Z', (int) get_post_time( 'U', true, $post ) ),
			'status'     => 'publish' === $post->post_status ? 'approved' : 'pending',
			'mine'       => $user_id > 0 && $author === (int) $user_id,
		);
	}
}
