<?php
/**
 * LearnDash LMS integration.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_Post;
use WP_Query;

/**
 * LearnDash 4.0.0 and later, written from LearnDash's developer reference and checked against
 * its 4.25.2 and 5.2.0 source; the end-to-end checks run against 5.2.0 on a local site only,
 * since LearnDash isn't on wordpress.org. Every LearnDash function is called through ld(),
 * which checks it exists, so a renamed or removed function degrades a feature instead of
 * stopping the site.
 *
 * Structure: LearnDash's section headings become the app's topics, and each lesson is followed
 * by its topics (as lessons) and quizzes, in course builder order. Course quizzes come last.
 *
 * Access and progress are LearnDash's own: sfwd_lms_has_access() for enrollment, sample
 * lessons for previews, drip dates and linear progression for locked steps, and LearnDash's
 * step counts for progress, so the website and the app agree.
 *
 * Completing a lesson: LearnDash checks a lesson timer and video progression with browser
 * cookies the app doesn't have. The adapter first checks every other LearnDash rule itself
 * (earlier steps, topics and quizzes, assignments, attendance, drip dates) and refuses with a
 * clear message when one isn't met. In place of the cookies, a timed lesson must have been open
 * in the app for its time, and a video with video progression that the app plays itself (an
 * upload or a video file) must have been watched; YouTube, Vimeo and embeds play in a web view
 * the app can't measure, so they rely on the plugin's own watch requirement setting. Then it
 * marks the step complete with learndash_process_mark_complete() and `$force`, which skips only
 * the cookie checks and fires LearnDash's own completion hooks.
 *
 * Quizzes run on LearnDash's quiz page: an attempt is one web view question with the quiz page,
 * and submitting it reads the result LearnDash saved for the student (`_sfwd-quizzes`).
 *
 * Certificates: LearnDash's certificate links carry a nonce for the browser session that asked
 * for them, so the app gets a stable course page link that sends a signed-in visitor to a fresh
 * certificate link. Orders are LearnDash's own transactions (Stripe, PayPal and Razorpay).
 * LearnDash has no reviews, wishlist or Q&A.
 */
class LearnDash_Adapter extends Base_Adapter {

	const COURSE      = 'sfwd-courses';
	const LESSON      = 'sfwd-lessons';
	const TOPIC       = 'sfwd-topic';
	const QUIZ        = 'sfwd-quiz';
	const CERTIFICATE = 'sfwd-certificates';
	const TRANSACTION = 'sfwd-transactions';
	const CATEGORY    = 'ld_course_category';

	/** User meta with the quiz attempt started in the app and not submitted yet. */
	const OPEN_ATTEMPT_META = 'yallapp_ld_open_attempt';

	/** User meta prefix: when the student first opened a timed lesson in the app. */
	const OPENED_META = 'yallapp_ld_opened_';

	/** Query argument of the certificate link the app opens in the browser. */
	const CERTIFICATE_ARG = 'yallapp_ld_certificate';

	/**
	 * How much of a video with video progression must be watched in the app. LearnDash counts
	 * the video as watched when it ends; the app counts distinct seconds played, so the last
	 * few seconds may be missing.
	 */
	const VIDEO_WATCHED_PERCENT = 90;

	/**
	 * Machine name.
	 *
	 * @return string
	 */
	public function id() {
		return 'learndash';
	}

	/**
	 * Installed version.
	 *
	 * @return string
	 */
	public function version() {
		return defined( 'LEARNDASH_VERSION' ) ? (string) LEARNDASH_VERSION : '';
	}

	/**
	 * LearnDash has no free edition.
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
			'certificates' => function_exists( 'learndash_get_course_certificate_link' ) || has_filter( 'yallapp_certificate_url' ),
			'quizzes'      => true,
			'wishlist'     => false,
			'reviews'      => false,
			'qna'          => false,
		);
	}

	/**
	 * Connects LearnDash's enrollment hook, and the certificate link the app opens.
	 *
	 * @param callable $on_enrolled Called with (course ID, user ID).
	 * @param callable $on_answered Unused: LearnDash has no Q&A.
	 * @return void
	 */
	public function listen( callable $on_enrolled, callable $on_answered ) {
		add_action(
			'learndash_update_course_access', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LearnDash hook.
			static function ( $user_id, $course_id, $access_list = null, $remove = false ) use ( $on_enrolled ) {
				// The hook also fires when nothing changed; LearnDash stamps a new enrollment's time.
				$enrolled_at = (int) get_user_meta( (int) $user_id, 'learndash_course_' . (int) $course_id . '_enrolled_at', true );
				if ( ! $remove && $enrolled_at >= time() - MINUTE_IN_SECONDS ) {
					call_user_func( $on_enrolled, (int) $course_id, (int) $user_id );
				}
			},
			10,
			4
		);
		add_action( 'template_redirect', array( $this, 'certificate_redirect' ), 4 );
	}

	/**
	 * Post types.
	 *
	 * @return array{course: string, lesson: string, quiz: string, announcement: string}
	 */
	public function post_types() {
		return array(
			'course'       => self::COURSE,
			'lesson'       => self::LESSON,
			'quiz'         => self::QUIZ,
			'announcement' => '',
		);
	}

	/**
	 * Course categories (LearnDash's own taxonomy).
	 *
	 * @return array[]
	 */
	public function categories() {
		return taxonomy_exists( self::CATEGORY ) ? $this->terms( self::CATEGORY ) : array();
	}

	/**
	 * Lists courses. Paid means students can't join without paying or being added.
	 *
	 * @param array $args    Filters.
	 * @param int   $user_id Current user.
	 * @return array{items: array[], total: int}
	 */
	public function courses( array $args, $user_id ) {
		$query_args = self::course_query( $args, self::COURSE, self::CATEGORY );
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
		$post = $this->course_post( $course_id, $user_id );
		if ( ! $post ) {
			return null;
		}
		$content = (string) $post->post_content;
		$html    = has_blocks( $content ) ? do_blocks( $content ) : wpautop( $content );
		return array_merge(
			$this->summary( $post, $user_id ),
			array(
				'description_html' => wp_kses_post( do_shortcode( $html ) ),
				'intro_video'      => null,
				'duration_minutes' => null,
				'level'            => null,
				'has_certificate'  => $this->certificate_id( $post->ID ) > 0 || has_filter( 'yallapp_certificate_url' ),
				'categories'       => taxonomy_exists( self::CATEGORY ) ? $this->terms( self::CATEGORY, $post->ID ) : array(),
				'has_checkout'     => $this->has_checkout( $post->ID ),
				'qna'              => false,
			)
		);
	}

	/**
	 * Sections and their steps: each lesson, then its topics and quizzes. Lessons before the
	 * first section heading (or every lesson, when the course has none) come first, and course
	 * quizzes last, as on the course page.
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
		$tree     = $this->steps_tree( $post->ID );
		$lessons  = isset( $tree[ self::LESSON ] ) && is_array( $tree[ self::LESSON ] ) ? $tree[ self::LESSON ] : array();
		$sections = array();
		$placed   = array();
		foreach ( (array) $this->ld( 'learndash_course_get_sections', array(), $post->ID ) as $section ) {
			if ( ! is_object( $section ) || empty( $section->ID ) ) {
				continue;
			}
			$ids        = array_values( array_intersect( array_map( 'intval', (array) ( $section->steps ?? array() ) ), array_map( 'intval', array_keys( $lessons ) ) ) );
			$placed     = array_merge( $placed, $ids );
			$sections[] = array(
				'id'      => (int) $section->ID,
				'title'   => html_entity_decode( (string) ( $section->post_title ?? '' ), ENT_QUOTES, 'UTF-8' ),
				'lessons' => $ids,
			);
		}
		$loose = array_values( array_diff( array_map( 'intval', array_keys( $lessons ) ), $placed ) );
		if ( $loose ) {
			array_unshift(
				$sections,
				array(
					'id'      => 0,
					'title'   => __( 'Lessons', 'yallapp' ),
					'lessons' => $loose,
				)
			);
		}
		$topics = array();
		foreach ( $sections as $section ) {
			$items = array();
			foreach ( $section['lessons'] as $lesson_id ) {
				$items = array_merge( $items, $this->lesson_items( $lesson_id, (array) $lessons[ $lesson_id ], $post->ID, $user_id ) );
			}
			if ( $items ) {
				$topics[] = array(
					'id'    => $section['id'],
					'title' => $section['title'],
					'items' => $items,
				);
			}
		}
		$final = array();
		foreach ( array_keys( isset( $tree[ self::QUIZ ] ) && is_array( $tree[ self::QUIZ ] ) ? $tree[ self::QUIZ ] : array() ) as $quiz_id ) {
			$item = $this->quiz_item( (int) $quiz_id, $post->ID, $user_id );
			if ( $item ) {
				$final[] = $item;
			}
		}
		if ( $final ) {
			$topics[] = array(
				'id'    => (int) $post->ID,
				'title' => __( 'Course quizzes', 'yallapp' ),
				'items' => $final,
			);
		}
		return $topics;
	}

	/**
	 * A lesson's curriculum items: the lesson, each topic followed by its quizzes, then the
	 * lesson's quizzes.
	 *
	 * @param int   $lesson_id Lesson ID.
	 * @param array $children  The lesson's node of the course steps tree.
	 * @param int   $course_id Course ID.
	 * @param int   $user_id   Current user.
	 * @return array[]
	 */
	private function lesson_items( $lesson_id, array $children, $course_id, $user_id ) {
		$lesson = $this->step_item( $lesson_id, self::LESSON, $course_id, $user_id );
		if ( ! $lesson ) {
			return array();
		}
		$items = array( $lesson );
		foreach ( isset( $children[ self::TOPIC ] ) && is_array( $children[ self::TOPIC ] ) ? $children[ self::TOPIC ] : array() as $topic_id => $topic_children ) {
			$topic = $this->step_item( (int) $topic_id, self::TOPIC, $course_id, $user_id );
			if ( ! $topic ) {
				continue;
			}
			$items[] = $topic;
			foreach ( array_keys( isset( $topic_children[ self::QUIZ ] ) && is_array( $topic_children[ self::QUIZ ] ) ? $topic_children[ self::QUIZ ] : array() ) as $quiz_id ) {
				$quiz = $this->quiz_item( (int) $quiz_id, $course_id, $user_id );
				if ( $quiz ) {
					$items[] = $quiz;
				}
			}
		}
		foreach ( array_keys( isset( $children[ self::QUIZ ] ) && is_array( $children[ self::QUIZ ] ) ? $children[ self::QUIZ ] : array() ) as $quiz_id ) {
			$quiz = $this->quiz_item( (int) $quiz_id, $course_id, $user_id );
			if ( $quiz ) {
				$items[] = $quiz;
			}
		}
		return $items;
	}

	/**
	 * Curriculum item of a lesson or topic. Topics are lessons to the app.
	 *
	 * @param int    $step_id   Lesson or topic ID.
	 * @param string $post_type Its post type.
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   Current user.
	 * @return array|null
	 */
	private function step_item( $step_id, $post_type, $course_id, $user_id ) {
		$post = $this->published( $step_id, $post_type );
		if ( ! $post ) {
			return null;
		}
		$preview = (bool) $this->ld( 'learndash_is_sample', false, $post );
		return array(
			'id'               => (int) $post->ID,
			'type'             => 'lesson',
			'title'            => html_entity_decode( (string) $post->post_title, ENT_QUOTES, 'UTF-8' ),
			'duration_minutes' => null,
			'question_count'   => null,
			'preview'          => $preview,
			'locked'           => ! $this->step_open( $post->ID, $course_id, $user_id ),
			'completed'        => $this->step_complete( $post->ID, $course_id, $user_id ),
		);
	}

	/**
	 * Curriculum item of a quiz. Quizzes need enrollment, even under a sample lesson.
	 *
	 * @param int $quiz_id   Quiz ID.
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	private function quiz_item( $quiz_id, $course_id, $user_id ) {
		$quiz = $this->published( $quiz_id, self::QUIZ );
		if ( ! $quiz ) {
			return null;
		}
		return array(
			'id'               => (int) $quiz->ID,
			'type'             => 'quiz',
			'title'            => html_entity_decode( (string) $quiz->post_title, ENT_QUOTES, 'UTF-8' ),
			'duration_minutes' => null,
			'question_count'   => $this->question_count( $quiz->ID ),
			'preview'          => false,
			'locked'           => ! ( $user_id > 0 && ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) && $this->step_open( $quiz->ID, $course_id, $user_id ) ),
			'completed'        => $user_id > 0 && (bool) $this->ld( 'learndash_is_quiz_complete', false, (int) $user_id, $quiz->ID, (int) $course_id ),
		);
	}

	/**
	 * Whether a user has access to a course: LearnDash's own check (enrollment, groups, open
	 * courses, access dates and expiry).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function is_enrolled( $course_id, $user_id ) {
		return $user_id > 0 && $this->live( $course_id, self::COURSE ) && (bool) $this->ld( 'sfwd_lms_has_access', false, (int) $course_id, (int) $user_id );
	}

	/**
	 * Whether students can join without paying: open and free courses, and "Buy now" courses
	 * without a price, which LearnDash opens to everyone.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function is_free( $course_id ) {
		$type = $this->price_type( $course_id );
		return in_array( $type, array( 'open', 'free' ), true ) || ( 'paynow' === $type && $this->course_price( $course_id ) <= 0 );
	}

	/**
	 * Enrolls the way the course page's "Take this course" button does.
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
			$refused = $this->enrollment_refused( (int) $course_id, (int) $user_id );
			if ( $refused ) {
				return $refused;
			}
			$this->ld( 'ld_update_course_access', false, (int) $user_id, (int) $course_id );
			if ( ! $this->is_enrolled( $course_id, $user_id ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
		}
		$since = (int) get_user_meta( (int) $user_id, 'learndash_course_' . (int) $course_id . '_enrolled_at', true );
		return array(
			'course_id'   => (int) $course_id,
			'enrolled_at' => gmdate( 'Y-m-d\TH:i:s\Z', $since > 0 ? $since : time() ),
		);
	}

	/**
	 * Why LearnDash wouldn't let the student join a free course, or null: prerequisites, course
	 * points, and the course's dates and seats.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return WP_Error|null
	 */
	private function enrollment_refused( $course_id, $user_id ) {
		if ( ! $this->ld( 'learndash_is_course_prerequities_completed', true, $course_id, $user_id ) ) {
			return new WP_Error( 'enrollment_failed', __( 'Complete the required courses first.', 'yallapp' ), array( 'status' => 403 ) );
		}
		if ( ! $this->ld( 'learndash_check_user_course_points_access', true, $course_id, $user_id ) ) {
			return new WP_Error( 'enrollment_failed', __( 'You need more course points to join this course.', 'yallapp' ), array( 'status' => 403 ) );
		}
		$product_class = '\LearnDash\Core\Models\Product';
		if ( class_exists( $product_class ) && method_exists( $product_class, 'find' ) ) {
			$product = call_user_func( array( $product_class, 'find' ), $course_id );
			if ( $product && method_exists( $product, 'can_be_purchased' ) && ! $product->can_be_purchased( $user_id ) ) {
				return new WP_Error( 'enrollment_failed', __( 'Enrollment is not available for this course.', 'yallapp' ), array( 'status' => 403 ) );
			}
		}
		return null;
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
			if ( $this->course_completed( $course_id, $user_id ) ) {
				$completed[] = $course_id;
			}
		}
		return $this->my_course_page( $enrolled, $completed, $status, $user_id, $page, $per_page );
	}

	/**
	 * Raw lesson data for a lesson or topic. The lesson's materials follow its content.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   Current user.
	 * @return array|null
	 */
	public function lesson( $lesson_id, $user_id ) {
		$post      = $this->published( $lesson_id, array( self::LESSON, self::TOPIC ) );
		$course_id = $post ? $this->course_of( $post->ID ) : 0;
		if ( ! $post || ! $course_id ) {
			return null;
		}
		if ( $user_id > 0 && $this->timer_seconds( $post->ID ) > 0 && ! get_user_meta( (int) $user_id, self::OPENED_META . $post->ID, true ) && $this->step_open( $post->ID, $course_id, $user_id ) ) {
			update_user_meta( (int) $user_id, self::OPENED_META . $post->ID, time() );
		}
		$materials = $this->materials( $post );
		if ( '' !== $materials ) {
			$post               = clone $post;
			$post->post_content = $post->post_content . "\n\n<h3>" . esc_html__( 'Materials', 'yallapp' ) . "</h3>\n" . $materials;
		}
		$neighbours = $this->neighbours( $course_id, $post->ID, $user_id );
		return array(
			'id'          => (int) $post->ID,
			'course_id'   => $course_id,
			'title'       => (string) $post->post_title,
			'post'        => $post,
			'video'       => $this->video( $post->ID ),
			'attachments' => array(),
			'preview'     => (bool) $this->ld( 'learndash_is_sample', false, $post->ID ),
			'completed'   => $this->step_complete( $post->ID, $course_id, $user_id ),
			'previous_id' => $neighbours[0],
			'next_id'     => $neighbours[1],
		);
	}

	/**
	 * Whether a user may open a lesson or topic: a sample lesson, or access to the course and
	 * LearnDash's drip dates and linear progression.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	public function can_view_lesson( $lesson_id, $user_id ) {
		$post      = $this->published( $lesson_id, array( self::LESSON, self::TOPIC ) );
		$course_id = $post ? $this->course_of( $post->ID ) : 0;
		return $course_id > 0 && $this->step_open( $post->ID, $course_id, $user_id );
	}

	/**
	 * Marks a lesson or topic complete when LearnDash's rules allow it. See the class summary
	 * for the lesson timer and video progression.
	 *
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   User ID.
	 * @return array|WP_Error
	 */
	public function complete_lesson( $lesson_id, $user_id ) {
		$post      = $this->published( $lesson_id, array( self::LESSON, self::TOPIC ) );
		$course_id = $post ? $this->course_of( $post->ID ) : 0;
		if ( ! $course_id || ! ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) ) {
			return self::not_enrolled();
		}
		if ( ! $this->step_complete( $post->ID, $course_id, $user_id ) ) {
			$refused = $this->completion_refused( $post, $course_id, (int) $user_id );
			if ( $refused ) {
				return $refused;
			}
			$this->ld( 'learndash_process_mark_complete', false, (int) $user_id, $post->ID, false, $course_id, true );
			if ( ! $this->step_complete( $post->ID, $course_id, $user_id ) ) {
				return self::cannot_complete( __( 'This lesson can not be completed yet.', 'yallapp' ) );
			}
		}
		return $this->progress( $course_id, $user_id );
	}

	/**
	 * Why LearnDash wouldn't complete the step for the student, or null.
	 *
	 * @param WP_Post $post      Lesson or topic.
	 * @param int     $course_id Course ID.
	 * @param int     $user_id   User ID.
	 * @return WP_Error|null
	 */
	private function completion_refused( WP_Post $post, $course_id, $user_id ) {
		$available = $this->available_from( $post->ID, $course_id, $user_id );
		if ( $available ) {
			return self::cannot_complete(
				/* translators: %s: date the lesson becomes available. */
				sprintf( __( 'This lesson is available from %s.', 'yallapp' ), wp_date( (string) get_option( 'date_format' ), $available ) )
			);
		}
		if ( ! $this->step_open( $post->ID, $course_id, $user_id ) ) {
			return self::cannot_complete( __( 'Complete the earlier lessons first.', 'yallapp' ) );
		}
		if ( $this->bypasses( $user_id, 'learndash_course_progression' ) ) {
			return null;
		}
		// LearnDash's own rules except the lesson timer (a browser cookie).
		if ( function_exists( 'learndash_can_complete_step' ) && ! learndash_can_complete_step( $user_id, $post->ID, $course_id, true ) ) {
			if ( 'on' === $this->setting( $post->ID, 'lesson_assignment_upload' ) ) {
				return self::cannot_complete( __( 'Upload your assignment on the website. The lesson is completed once it is approved.', 'yallapp' ) );
			}
			if ( ! $this->ld( 'learndash_user_is_course_children_progress_complete', true, $user_id, $course_id, $post->ID ) ) {
				return self::cannot_complete( __( 'Complete the topics and quizzes of this lesson first.', 'yallapp' ) );
			}
			if ( $this->ld( 'learndash_course_steps_is_external_attendance_required', false, $post->ID ) ) {
				return self::cannot_complete( __( 'Your instructor marks this lesson complete once your attendance is confirmed.', 'yallapp' ) );
			}
			return self::cannot_complete( __( 'Complete the earlier lessons first.', 'yallapp' ) );
		}
		// The lesson timer: time since the student first opened the lesson in the app.
		$seconds = $this->timer_seconds( $post->ID );
		$opened  = (int) get_user_meta( $user_id, self::OPENED_META . $post->ID, true );
		if ( $seconds > 0 && ( ! $opened || time() - $opened < $seconds ) ) {
			$left = $opened ? $seconds - ( time() - $opened ) : $seconds;
			return self::cannot_complete(
				/* translators: %s: time left, e.g. "5 mins". */
				sprintf( __( 'Stay on this lesson a little longer. You can complete it in %s.', 'yallapp' ), human_time_diff( time(), time() + max( 1, $left ) ) )
			);
		}
		// Video progression: the video must have been watched in the app, when it plays there.
		if ( 'on' === $this->setting( $post->ID, 'lesson_video_enabled' ) && ! $this->ld( 'learndash_video_complete_for_step', false, $post->ID, $course_id, $user_id ) ) {
			$video = $this->video( $post->ID );
			if ( $video && in_array( $video['source'], array( 'upload', 'external' ), true ) && (float) get_user_meta( $user_id, \Yallapp\Rest\Learning_Controller::WATCHED_META . $post->ID, true ) < self::VIDEO_WATCHED_PERCENT ) {
				return self::cannot_complete( __( 'Watch the lesson video to the end to complete this lesson.', 'yallapp' ) );
			}
		}
		return null;
	}

	/**
	 * The `cannot_complete` error.
	 *
	 * @param string $message Message for the student.
	 * @return WP_Error
	 */
	private static function cannot_complete( $message ) {
		return new WP_Error( 'cannot_complete', $message, array( 'status' => 409 ) );
	}

	/**
	 * Course progress: LearnDash's completed and total steps (lessons, topics, and the course
	 * quizzes as one step).
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array
	 */
	public function progress( $course_id, $user_id ) {
		$total     = (int) $this->ld( 'learndash_get_course_steps_count', 0, (int) $course_id );
		$completed = $user_id > 0 ? (int) $this->ld( 'learndash_course_get_completed_steps', 0, (int) $user_id, (int) $course_id ) : 0;
		$progress  = self::progress_shape( $course_id, min( $completed, $total ), $total, $this->course_completed( $course_id, $user_id ) );
		// 45 LearnDash keeps when the course was completed as a timestamp.
		$done                     = $progress['course_completed'] ? (int) get_user_meta( (int) $user_id, 'course_completed_' . $course_id, true ) : 0;
		$progress['completed_at'] = $done > 0 ? gmdate( 'Y-m-d\TH:i:s\Z', $done ) : null;
		return $progress;
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
		$course_id = $this->course_of( $quiz->ID );
		$entries   = $this->quiz_entries( $user_id, $quiz->ID, $course_id );
		$limit     = 'on' === $this->setting( $quiz->ID, 'quiz_time_limit_enabled' ) ? (int) $this->setting( $quiz->ID, 'timeLimit' ) : 0;
		$last      = $entries ? array_key_last( $entries ) : null;
		return array(
			'id'                 => (int) $quiz->ID,
			'course_id'          => $course_id,
			'title'              => (string) $quiz->post_title,
			'question_count'     => $this->question_count( $quiz->ID ),
			'time_limit_seconds' => $limit > 0 ? $limit : null,
			'pass_percent'       => (int) $this->setting( $quiz->ID, 'passingpercentage' ),
			'attempts_allowed'   => $this->attempts_allowed( $quiz->ID ),
			'attempts_used'      => count( $entries ),
			'last_result'        => null !== $last ? $this->attempt_result( $entries[ $last ], $last ) : null,
		);
	}

	/**
	 * Starts an attempt: one web view question with LearnDash's quiz page.
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
		$course_id = $this->course_of( $quiz->ID );
		$allowed   = $this->attempts_allowed( $quiz->ID );
		if ( null !== $allowed && count( $this->quiz_entries( $user_id, $quiz->ID, $course_id ) ) >= $allowed && ! $this->bypasses( $user_id, 'learndash_course_lesson_access_from' ) ) {
			return new WP_Error( 'attempts_exhausted', __( 'You have used all attempts for this quiz.', 'yallapp' ), array( 'status' => 409 ) );
		}
		$attempt = array(
			'id'    => count( $this->raw_entries( $user_id ) ) + 1,
			'quiz'  => (int) $quiz->ID,
			'start' => time(),
		);
		update_user_meta( $user_id, self::OPEN_ATTEMPT_META, $attempt );
		$url = (string) $this->ld( 'learndash_get_step_permalink', '', $quiz->ID, $course_id );
		return array(
			'id'         => $attempt['id'],
			'quiz_id'    => (int) $quiz->ID,
			'started_at' => gmdate( 'c', $attempt['start'] ),
			'ends_at'    => null,
			'questions'  => array(
				array(
					'id'               => (int) $quiz->ID,
					'type'             => 'other',
					'title'            => (string) $quiz->post_title,
					'description_html' => '<p>' . esc_html__( 'Take the quiz below. When you have finished it, submit to see your result.', 'yallapp' ) . '</p>',
					'render_mode'      => 'webview',
					'webview_url'      => '' !== $url ? $url : (string) get_permalink( $quiz ),
					'options'          => array(),
					'points'           => null,
				),
			),
		);
	}

	/**
	 * Ends an attempt with the result LearnDash saved since it started.
	 *
	 * @param int   $quiz_id    Quiz ID.
	 * @param int   $attempt_id Attempt ID.
	 * @param int   $user_id    User ID.
	 * @param array $answers    Unused: the quiz is answered on its page.
	 * @return array|WP_Error
	 */
	public function submit_attempt( $quiz_id, $attempt_id, $user_id, array $answers ) {
		$open = get_user_meta( $user_id, self::OPEN_ATTEMPT_META, true );
		if ( ! is_array( $open ) || (int) $open['id'] !== (int) $attempt_id || (int) $open['quiz'] !== (int) $quiz_id ) {
			// A finished attempt's result was saved at or after the position it was given.
			foreach ( $this->raw_entries( $user_id ) as $index => $entry ) {
				if ( $index >= (int) $attempt_id - 1 && (int) ( $entry['quiz'] ?? 0 ) === (int) $quiz_id ) {
					return new WP_Error( 'attempt_finished', __( 'This attempt has already been submitted.', 'yallapp' ), array( 'status' => 409 ) );
				}
			}
			return self::not_found( __( 'Quiz attempt not found.', 'yallapp' ) );
		}
		$found = null;
		foreach ( $this->raw_entries( $user_id ) as $index => $entry ) {
			if ( $index >= (int) $open['id'] - 1 && (int) ( $entry['quiz'] ?? 0 ) === (int) $quiz_id && (int) ( $entry['time'] ?? 0 ) >= (int) $open['start'] - 5 ) {
				$found = $index;
			}
		}
		if ( null === $found ) {
			return new WP_Error( 'quiz_not_finished', __( 'Finish the quiz first. Your result shows here once the quiz is done.', 'yallapp' ), array( 'status' => 409 ) );
		}
		delete_user_meta( $user_id, self::OPEN_ATTEMPT_META );
		return $this->attempt_result( $this->raw_entries( $user_id )[ $found ], $found );
	}

	/**
	 * Finished attempts from LearnDash's quiz results, newest first.
	 *
	 * @param int $user_id  User ID.
	 * @param int $page     Page.
	 * @param int $per_page Page size.
	 * @return array{items: array[], total: int}
	 */
	public function attempts( $user_id, $page, $per_page ) {
		$all   = array_reverse( $this->raw_entries( $user_id ), true );
		$all   = array_filter(
			$all,
			static function ( $entry ) {
				return ! empty( $entry['quiz'] );
			}
		);
		$items = array();
		foreach ( array_slice( $all, ( max( 1, (int) $page ) - 1 ) * (int) $per_page, (int) $per_page, true ) as $index => $entry ) {
			$items[] = $this->attempt_result( $entry, $index );
		}
		return array(
			'items' => $items,
			'total' => count( $all ),
		);
	}

	/**
	 * Certificates of completed courses.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function certificates( $user_id ) {
		$items = array();
		foreach ( $this->enrolled_course_ids( $user_id ) as $course_id ) {
			$url = $this->certificate_url( $course_id, $user_id );
			if ( $url ) {
				$done    = (int) get_user_meta( (int) $user_id, 'course_completed_' . $course_id, true );
				$items[] = array(
					'course_id'    => (int) $course_id,
					'course_title' => get_the_title( $course_id ),
					'url'          => $url,
					'issued_at'    => $done > 0 ? gmdate( 'Y-m-d\TH:i:s\Z', $done ) : null,
				);
			}
		}
		return $items;
	}

	/**
	 * The certificate link for a completed course: the course page with a query argument that
	 * sends the signed-in student to LearnDash's certificate. Courses without a LearnDash
	 * certificate use the `yallapp_certificate_url` filter.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return string|null
	 */
	protected function certificate_url( $course_id, $user_id ) {
		if ( $this->certificate_id( $course_id ) && $this->course_completed( $course_id, $user_id ) ) {
			return add_query_arg( self::CERTIFICATE_ARG, (int) $course_id, (string) get_permalink( $course_id ) );
		}
		return parent::certificate_url( $course_id, $user_id );
	}

	/**
	 * Sends a visitor of the certificate link to LearnDash's certificate, signed in. Hooked to
	 * `template_redirect` before LearnDash shows certificates.
	 *
	 * @return void
	 */
	public function certificate_redirect() {
		if ( ! isset( $_GET[ self::CERTIFICATE_ARG ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only redirect.
			return;
		}
		$course_id = absint( wp_unslash( $_GET[ self::CERTIFICATE_ARG ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! is_user_logged_in() ) {
			auth_redirect();
		}
		$url = (string) $this->ld( 'learndash_get_course_certificate_link', '', $course_id, get_current_user_id() );
		if ( '' !== $url ) {
			wp_safe_redirect( $url );
			exit;
		}
	}

	/**
	 * Where the course is sold: a closed course's button URL, or the course page with
	 * LearnDash's payment buttons.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	public function checkout_url( $course_id ) {
		$button = $this->button_url( $course_id );
		return '' !== $button ? $button : (string) get_permalink( $course_id );
	}

	/**
	 * The course a lesson, topic or quiz belongs to: its primary course.
	 *
	 * @param int $post_id Content ID.
	 * @return int
	 */
	public function course_of( $post_id ) {
		$type = get_post_type( $post_id );
		if ( self::COURSE === $type ) {
			return (int) $post_id;
		}
		if ( ! in_array( $type, array( self::LESSON, self::TOPIC, self::QUIZ ), true ) ) {
			return 0;
		}
		$course_id = (int) $this->ld( 'learndash_get_course_id', 0, (int) $post_id );
		if ( $this->live( $course_id, self::COURSE ) ) {
			return $course_id;
		}
		// With shared steps, a step added to a course in the builder is linked by `ld_course_<ID>`.
		foreach ( array_keys( (array) get_post_meta( (int) $post_id ) ) as $key ) {
			if ( preg_match( '/^ld_course_(\d+)$/', (string) $key, $match ) && $this->live( (int) $match[1], self::COURSE ) ) {
				return (int) $match[1];
			}
		}
		return 0;
	}

	/**
	 * Users with access to a course (every user for an open course).
	 *
	 * @param int $course_id Course ID.
	 * @return int[]
	 */
	public function student_ids( $course_id ) {
		$users = $this->ld( 'learndash_get_users_for_course', array(), (int) $course_id, array( 'fields' => 'ID' ), false );
		if ( $users instanceof \WP_User_Query ) {
			$users = $users->get_results();
		}
		return array_values( array_unique( array_map( 'intval', (array) $users ) ) );
	}

	/**
	 * Courses a user has access to, as LearnDash lists them (open courses included).
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function enrolled_course_ids( $user_id ) {
		if ( ! $user_id ) {
			return array();
		}
		$ids = (array) $this->ld(
			'learndash_user_get_enrolled_courses',
			array(),
			(int) $user_id,
			array(
				'post_status' => Course_Visibility::STATUSES, // 50 Private courses too.
				'orderby'     => 'date',
				'order'       => 'DESC',
			),
			true
		);
		return array_values( array_map( 'intval', $ids ) );
	}

	/**
	 * Whether LearnDash sells a course ("Buy now" or "Recurring" with a price).
	 *
	 * @return bool
	 */
	public function sells_courses() {
		foreach ( $this->paid_course_ids() as $course_id ) {
			if ( in_array( $this->price_type( $course_id ), array( 'paynow', 'subscribe' ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * LearnDash transactions, newest first: an order (LearnDash 4.5 and later) with its
	 * products, or an older single-product transaction.
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
		$where = $wpdb->prepare(
			"p.post_type = %s AND p.post_status = 'publish' AND p.post_parent = 0 AND ( p.post_author = %d OR m.meta_value = %s )",
			self::TRANSACTION,
			(int) $user_id,
			(string) (int) $user_id
		);
		$join  = "LEFT JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND m.meta_key = 'user_id'";
		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- LearnDash's transactions; $where is prepared.
		$total = (int) $wpdb->get_var( "SELECT COUNT(DISTINCT p.ID) FROM {$wpdb->posts} p {$join} WHERE {$where}" );
		$ids   = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT p.ID, p.post_date_gmt FROM {$wpdb->posts} p {$join} WHERE {$where} ORDER BY p.post_date_gmt DESC, p.ID DESC LIMIT %d OFFSET %d", (int) $per_page, ( max( 1, (int) $page ) - 1 ) * (int) $per_page ) );
		// phpcs:enable
		$items = array();
		foreach ( (array) $ids as $order_id ) {
			$order = get_post( (int) $order_id );
			if ( $order ) {
				$items[] = $this->order_shape( $order );
			}
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * Order shape. LearnDash records completed payments, so every order is completed.
	 *
	 * @param WP_Post $order Transaction.
	 * @return array
	 */
	private function order_shape( WP_Post $order ) {
		$lines = get_posts(
			array(
				'post_type'      => self::TRANSACTION,
				'post_status'    => 'publish',
				'post_parent'    => $order->ID,
				'posts_per_page' => 50,
				'orderby'        => 'ID',
				'order'          => 'ASC',
			)
		);
		if ( ! $lines ) {
			$lines = array( $order );
		}
		$items    = array();
		$total    = 0.0;
		$currency = '';
		foreach ( $lines as $line ) {
			$pricing  = $this->transaction_pricing( $line );
			$total   += $pricing['amount'];
			$currency = '' !== $currency ? $currency : $pricing['currency'];
			$product  = 0;
			$snapshot = get_post_meta( $line->ID, 'post', true );
			foreach ( array( 'post_id', 'course_id', 'group_id' ) as $key ) {
				$product = $product ? $product : (int) get_post_meta( $line->ID, $key, true );
			}
			$name    = $product && get_post( $product ) ? get_the_title( $product ) : ( is_array( $snapshot ) && ! empty( $snapshot['post_title'] ) ? (string) $snapshot['post_title'] : (string) $line->post_title );
			$image   = $product ? get_the_post_thumbnail_url( $product, 'thumbnail' ) : false;
			$items[] = array(
				'name'       => html_entity_decode( wp_strip_all_tags( $name ), ENT_QUOTES, 'UTF-8' ),
				'course_id'  => ( $product && self::COURSE === get_post_type( $product ) ) ? $product : null,
				'product_id' => null,
				'quantity'   => 1,
				'image_url'  => $image ? $image : null,
			);
		}
		$currency = '' !== $currency ? $currency : $this->currency();
		return array(
			'id'           => (int) $order->ID,
			'number'       => (string) $order->ID,
			'status'       => 'completed',
			'status_label' => __( 'Completed', 'yallapp' ),
			'total'        => \Yallapp\Commerce\Money::plain( $this->format_price( $total, $currency ) ),
			'created_at'   => self::iso( (string) $order->post_date_gmt ),
			'items'        => $items,
		);
	}

	/**
	 * Amount paid and currency of a transaction, through LearnDash's Transaction model when it
	 * has one (it knows each payment gateway's older fields).
	 *
	 * @param WP_Post $line Transaction.
	 * @return array{amount: float, currency: string}
	 */
	private function transaction_pricing( WP_Post $line ) {
		$pricing = array();
		$model   = '\LearnDash\Core\Models\Transaction';
		if ( class_exists( $model ) && method_exists( $model, 'find' ) ) {
			$transaction = call_user_func( array( $model, 'find' ), (int) $line->ID );
			if ( $transaction && method_exists( $transaction, 'get_pricing' ) ) {
				$pricing = (array) $transaction->get_pricing();
			}
		}
		if ( ! $pricing ) {
			$pricing = (array) get_post_meta( $line->ID, 'pricing_info', true );
		}
		$price      = (float) ( $pricing['price'] ?? 0 );
		$discounted = (float) ( $pricing['discounted_price'] ?? 0 );
		$free       = (bool) get_post_meta( $line->ID, 'is_zero_price', true );
		return array(
			'amount'   => $free ? 0.0 : ( ( (float) ( $pricing['discount'] ?? 0 ) > 0 ) ? $discounted : $price ),
			'currency' => strtoupper( (string) ( $pricing['currency'] ?? '' ) ),
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
		$image = get_the_post_thumbnail_url( $post->ID, 'medium_large' );
		$steps = 0;
		foreach ( array( self::LESSON, self::TOPIC ) as $type ) {
			$steps += count( (array) $this->ld( 'learndash_course_get_steps_by_type', array(), $post->ID, $type ) );
		}
		return array(
			'id'           => (int) $post->ID,
			'title'        => (string) $post->post_title,
			'image_url'    => $image ? $image : null,
			'instructor'   => $this->instructor( (int) $post->post_author ),
			'price'        => $this->price( $post->ID ),
			'lesson_count' => $steps,
			'rating'       => null,
			'rating_count' => 0,
			'enrolled'     => $this->is_enrolled( $post->ID, $user_id ),
			'wishlisted'   => false,
		);
	}

	/**
	 * Price shape from the course's price type and price.
	 *
	 * @param int $course_id Course ID.
	 * @return array
	 */
	private function price( $course_id ) {
		if ( $this->is_free( $course_id ) ) {
			return self::price_shape( true );
		}
		$amount = $this->course_price( $course_id );
		if ( $amount <= 0 ) {
			return self::price_shape( false );
		}
		$currency = $this->currency();
		return self::price_shape( false, $amount, 0.0, '' !== $currency ? $currency : null, $this->format_price( $amount, $currency ) );
	}

	/**
	 * A price as LearnDash shows it.
	 *
	 * @param float  $amount   Amount.
	 * @param string $currency ISO currency code.
	 * @return string
	 */
	private function format_price( $amount, $currency ) {
		$formatted = (string) $this->ld( 'learndash_get_price_formatted', '', $amount, (string) $currency );
		return '' !== $formatted ? $formatted : trim( $currency . ' ' . number_format_i18n( (float) $amount, 2 ) );
	}

	/**
	 * LearnDash's currency code.
	 *
	 * @return string
	 */
	private function currency() {
		$code = (string) $this->ld( 'learndash_get_currency_code', '' );
		if ( '' === $code && class_exists( 'LearnDash_Settings_Section' ) && method_exists( 'LearnDash_Settings_Section', 'get_section_setting' ) ) {
			$code = (string) \LearnDash_Settings_Section::get_section_setting( 'LearnDash_Settings_Section_Payments_Defaults', 'currency' );
		}
		return strtoupper( trim( $code ) );
	}

	/**
	 * The course's price type: open, free, paynow, subscribe or closed.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	private function price_type( $course_id ) {
		$type = (string) $this->setting( $course_id, 'course_price_type' );
		return '' !== $type ? $type : 'free';
	}

	/**
	 * The course's price as a number.
	 *
	 * @param int $course_id Course ID.
	 * @return float
	 */
	private function course_price( $course_id ) {
		return (float) preg_replace( '/[^0-9.]/', '', str_replace( ',', '.', (string) $this->setting( $course_id, 'course_price' ) ) );
	}

	/**
	 * A closed course's button URL.
	 *
	 * @param int $course_id Course ID.
	 * @return string
	 */
	private function button_url( $course_id ) {
		return 'closed' === $this->price_type( $course_id ) ? esc_url_raw( trim( (string) $this->setting( $course_id, 'custom_button_url' ) ) ) : '';
	}

	/**
	 * Whether the website sells the course: LearnDash's payment buttons, or a closed course's
	 * button URL.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	private function has_checkout( $course_id ) {
		if ( $this->is_free( $course_id ) ) {
			return false;
		}
		$type = $this->price_type( $course_id );
		return ( in_array( $type, array( 'paynow', 'subscribe' ), true ) && $this->course_price( $course_id ) > 0 ) || '' !== $this->button_url( $course_id );
	}

	/**
	 * IDs of published courses that aren't free.
	 *
	 * @return int[]
	 */
	private function paid_course_ids() {
		$ids = array();
		foreach ( get_posts(
			array(
				'post_type'      => self::COURSE,
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
	 * The course's certificate, when it has one.
	 *
	 * @param int $course_id Course ID.
	 * @return int
	 */
	private function certificate_id( $course_id ) {
		$certificate = (int) $this->setting( $course_id, 'certificate' );
		return $certificate && $this->published( $certificate, self::CERTIFICATE ) ? $certificate : 0;
	}

	/**
	 * Whether LearnDash considers the course completed.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	private function course_completed( $course_id, $user_id ) {
		return $user_id > 0 && 'completed' === $this->ld( 'learndash_course_status', '', (int) $course_id, (int) $user_id, true );
	}

	/**
	 * The course steps tree (course builder order): lessons with their topics and quizzes, and
	 * the course quizzes.
	 *
	 * @param int $course_id Course ID.
	 * @return array
	 */
	private function steps_tree( $course_id ) {
		return (array) $this->ld( 'learndash_course_get_steps_by_type', array(), (int) $course_id, 'h' );
	}

	/**
	 * Whether a step is complete for the user.
	 *
	 * @param int $step_id   Lesson, topic or quiz ID.
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return bool
	 */
	private function step_complete( $step_id, $course_id, $user_id ) {
		return $user_id > 0 && (bool) $this->ld( 'learndash_user_progress_is_step_complete', false, (int) $user_id, (int) $course_id, (int) $step_id );
	}

	/**
	 * Whether a user may open a step: its instructor, a sample lesson, or access to the course
	 * once the step's (and its parents') drip date has passed and, with linear progression, the
	 * earlier steps are complete.
	 *
	 * @param int $step_id   Lesson, topic or quiz ID.
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID, or 0.
	 * @return bool
	 */
	private function step_open( $step_id, $course_id, $user_id ) {
		if ( $user_id > 0 && $this->teaches( $user_id, $course_id ) ) {
			return true;
		}
		$sample = (bool) $this->ld( 'learndash_is_sample', false, (int) $step_id );
		$access = $user_id > 0 ? $this->is_enrolled( $course_id, $user_id ) : 'open' === $this->price_type( $course_id );
		if ( ! $access || ! $user_id ) {
			return $access || $sample;
		}
		if ( $this->available_from( $step_id, $course_id, $user_id ) ) {
			return false;
		}
		if ( $this->step_complete( $step_id, $course_id, $user_id ) || $this->bypasses( $user_id, 'learndash_course_progression' ) || ! $this->ld( 'learndash_lesson_progression_enabled', false, (int) $course_id ) ) {
			return true;
		}
		$previous = (int) $this->ld( 'learndash_user_progress_get_previous_incomplete_step', 0, (int) $user_id, (int) $course_id, (int) $step_id );
		// Before LearnDash 5.1.8 the step itself means nothing earlier is incomplete.
		return ! $previous || (int) $step_id === $previous;
	}

	/**
	 * When a drip-fed step (or its lesson) becomes available, or 0 when it is available.
	 *
	 * @param int $step_id   Step ID.
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return int Timestamp.
	 */
	private function available_from( $step_id, $course_id, $user_id ) {
		if ( ! $user_id || $this->bypasses( $user_id, 'learndash_course_lesson_access_from' ) ) {
			return 0;
		}
		$steps   = (array) $this->ld( 'learndash_course_get_all_parent_step_ids', array(), (int) $course_id, (int) $step_id );
		$steps[] = (int) $step_id;
		foreach ( $steps as $id ) {
			$from = (int) $this->ld( 'ld_lesson_access_from', 0, (int) $id, (int) $user_id, (int) $course_id );
			if ( $from > time() ) {
				return $from;
			}
		}
		return 0;
	}

	/**
	 * Whether LearnDash lets the user skip a course limit (admins and group leaders, per the
	 * site's settings).
	 *
	 * @param int    $user_id User ID.
	 * @param string $context LearnDash bypass context.
	 * @return bool
	 */
	private function bypasses( $user_id, $context ) {
		return $user_id > 0 && (bool) $this->ld( 'learndash_can_user_bypass', false, (int) $user_id, $context );
	}

	/**
	 * A lesson timer in seconds, or 0.
	 *
	 * @param int $step_id Lesson or topic ID.
	 * @return int
	 */
	private function timer_seconds( $step_id ) {
		$time = $this->ld( 'learndash_forced_lesson_time', 0, (int) $step_id );
		if ( empty( $time ) ) {
			return 0;
		}
		return is_numeric( $time ) ? (int) $time : (int) $this->ld( 'learndash_convert_lesson_time_time', 0, $time );
	}

	/**
	 * The step's video from its video progression settings: a URL, an embed or video shortcode,
	 * or embed HTML.
	 *
	 * @param int $step_id Lesson or topic ID.
	 * @return array|null
	 */
	private function video( $step_id ) {
		if ( 'on' !== $this->setting( $step_id, 'lesson_video_enabled' ) ) {
			return null;
		}
		$value = html_entity_decode( trim( (string) $this->setting( $step_id, 'lesson_video_url' ) ), ENT_QUOTES, 'UTF-8' );
		if ( '' !== $value && '[' === $value[0] ) {
			if ( preg_match( '#\]\s*(https?://[^\s\[]+)\s*\[/embed\]#i', $value, $match ) || preg_match( '#\b(?:src|mp4|webm|ogv|m4v)=["\']?(https?://[^"\'\s\]]+)#i', $value, $match ) ) {
				$value = $match[1];
			} else {
				$value = do_shortcode( $value );
			}
		}
		return self::video_from_value( $value );
	}

	/**
	 * The step's materials as HTML, when it shows them.
	 *
	 * @param WP_Post $post Lesson or topic.
	 * @return string
	 */
	private function materials( WP_Post $post ) {
		$prefix = self::TOPIC === $post->post_type ? 'topic' : 'lesson';
		if ( 'on' !== $this->setting( $post->ID, $prefix . '_materials_enabled' ) ) {
			return '';
		}
		$materials = trim( (string) $this->setting( $post->ID, $prefix . '_materials' ) );
		return '' !== $materials ? wpautop( wp_specialchars_decode( $materials, ENT_QUOTES ) ) : '';
	}

	/**
	 * Quiz, if the user may take it: enrolled (or teaching), with the quiz open.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @param int $user_id User ID.
	 * @return WP_Post|WP_Error
	 */
	private function quiz_access( $quiz_id, $user_id ) {
		$quiz      = $this->published( $quiz_id, self::QUIZ );
		$course_id = $quiz ? $this->course_of( $quiz->ID ) : 0;
		if ( ! $quiz || ! $course_id ) {
			return self::not_found( __( 'Quiz not found.', 'yallapp' ) );
		}
		if ( ! $user_id || ! ( $this->is_enrolled( $course_id, $user_id ) || $this->teaches( $user_id, $course_id ) ) ) {
			return self::not_enrolled( __( 'Enroll in this course to take the quiz.', 'yallapp' ) );
		}
		if ( ! $this->step_open( $quiz->ID, $course_id, $user_id ) ) {
			return new WP_Error( 'quiz_locked', __( 'Complete the earlier lessons first.', 'yallapp' ), array( 'status' => 403 ) );
		}
		return $quiz;
	}

	/**
	 * Questions in a quiz.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int
	 */
	private function question_count( $quiz_id ) {
		return count( (array) $this->ld( 'learndash_get_quiz_questions', array(), (int) $quiz_id ) );
	}

	/**
	 * Attempts a quiz allows ("Restrict quiz retakes"), or null for unlimited.
	 *
	 * @param int $quiz_id Quiz ID.
	 * @return int|null
	 */
	private function attempts_allowed( $quiz_id ) {
		$repeats = function_exists( 'learndash_quiz_get_repeats' ) ? learndash_quiz_get_repeats( (int) $quiz_id ) : '';
		return ( '' === trim( (string) $repeats ) ) ? null : absint( $repeats ) + 1;
	}

	/**
	 * LearnDash's quiz results for a user, oldest first, keyed by their position.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	private function raw_entries( $user_id ) {
		$entries = $user_id ? get_user_meta( (int) $user_id, '_sfwd-quizzes', true ) : array();
		return is_array( $entries ) ? array_values( array_filter( $entries, 'is_array' ) ) : array();
	}

	/**
	 * A user's results for one quiz in one course, oldest first, keyed by their position.
	 *
	 * @param int $user_id   User ID.
	 * @param int $quiz_id   Quiz ID.
	 * @param int $course_id Course ID.
	 * @return array[]
	 */
	private function quiz_entries( $user_id, $quiz_id, $course_id ) {
		$entries = array();
		foreach ( $this->raw_entries( $user_id ) as $index => $entry ) {
			if ( (int) ( $entry['quiz'] ?? 0 ) === (int) $quiz_id && ( empty( $entry['course'] ) || (int) $entry['course'] === (int) $course_id ) ) {
				$entries[ $index ] = $entry;
			}
		}
		return $entries;
	}

	/**
	 * AttemptResult shape from a LearnDash quiz result. Essays waiting for a grade make it
	 * pending.
	 *
	 * @param array $entry Quiz result.
	 * @param int   $index Its position in the user's results.
	 * @return array
	 */
	private function attempt_result( array $entry, $index ) {
		$pending = false;
		foreach ( (array) ( $entry['graded'] ?? array() ) as $graded ) {
			$pending = $pending || ( is_array( $graded ) && 'not_graded' === ( $graded['status'] ?? '' ) );
		}
		$status = $pending ? 'pending_review' : ( empty( $entry['pass'] ) ? 'failed' : 'passed' );
		$ended  = (int) ( ! empty( $entry['completed'] ) ? $entry['completed'] : ( $entry['time'] ?? 0 ) );
		$scored = isset( $entry['percentage'] ) && ( ! empty( $entry['count'] ) || (float) $entry['percentage'] > 0 );
		return array(
			'attempt_id'    => (int) $index + 1,
			'quiz_id'       => (int) $entry['quiz'],
			'quiz_title'    => (string) get_post_field( 'post_title', (int) $entry['quiz'] ),
			'status'        => $status,
			'score_percent' => ( $scored && ! $pending ) ? round( (float) $entry['percentage'], 2 ) : null,
			'finished_at'   => $ended > 0 ? gmdate( 'Y-m-d\TH:i:s\Z', $ended ) : null,
		);
	}

	/**
	 * A LearnDash setting of a course, lesson, topic or quiz.
	 *
	 * @param int    $post_id Post ID.
	 * @param string $key     Setting name without the post type prefix.
	 * @return mixed
	 */
	private function setting( $post_id, $key ) {
		if ( function_exists( 'learndash_get_setting' ) ) {
			return learndash_get_setting( (int) $post_id, $key );
		}
		$type = (string) get_post_type( $post_id );
		$meta = get_post_meta( (int) $post_id, '_' . $type, true );
		return is_array( $meta ) && isset( $meta[ $type . '_' . $key ] ) ? $meta[ $type . '_' . $key ] : '';
	}

	/**
	 * Calls a LearnDash function when it exists.
	 *
	 * @param string $name     Function.
	 * @param mixed  $fallback Result when it doesn't exist.
	 * @param mixed  ...$args  Arguments.
	 * @return mixed
	 */
	private function ld( $name, $fallback, ...$args ) {
		return function_exists( $name ) ? call_user_func_array( $name, $args ) : $fallback;
	}
}
