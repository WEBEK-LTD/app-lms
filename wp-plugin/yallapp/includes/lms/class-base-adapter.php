<?php
/**
 * Shared parts of the LMS adapters.
 *
 * @package Yallapp
 */

namespace Yallapp\Lms;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_Post;

/**
 * Shapes and defaults every adapter needs in the same form: people, categories, prices,
 * videos given as URLs, lesson navigation, and the documented results for features an
 * LMS doesn't have (wishlist, reviews, Q&A). Adapters override what their LMS supports.
 */
abstract class Base_Adapter implements Lms_Adapter {

	/**
	 * Wishlisted courses. Empty when the LMS has no wishlist.
	 *
	 * @param int $user_id User ID.
	 * @return array[]
	 */
	public function wishlist( $user_id ) {
		return array();
	}

	/**
	 * Adds or removes a wishlist entry. Refused when the LMS has no wishlist.
	 *
	 * @param int  $user_id   User ID.
	 * @param int  $course_id Course ID.
	 * @param bool $on        Add when true.
	 * @return true|WP_Error
	 */
	public function set_wishlist( $user_id, $course_id, $on ) {
		return self::disabled( __( 'The wishlist is not available on this site.', 'yallapp' ) );
	}

	/**
	 * Reviews. Empty when the LMS has no reviews.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int, summary: array}
	 */
	public function reviews( $course_id, $user_id, $page, $per_page ) {
		return array(
			'items'   => array(),
			'total'   => 0,
			'summary' => self::rating_summary( array() ),
		);
	}

	/**
	 * The user's review. None when the LMS has no reviews.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return array|null
	 */
	public function my_review( $course_id, $user_id ) {
		return null;
	}

	/**
	 * Writes a review. Refused when the LMS has no reviews.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param int    $rating    1 to 5.
	 * @param string $text      Review text.
	 * @return array|WP_Error
	 */
	public function save_review( $course_id, $user_id, $rating, $text ) {
		return self::disabled( __( 'Reviews are turned off on this site.', 'yallapp' ) );
	}

	/**
	 * Whether students can ask questions. Never when the LMS has no Q&A.
	 *
	 * @param int $course_id Course ID.
	 * @return bool
	 */
	public function qna_enabled( $course_id ) {
		return false;
	}

	/**
	 * Questions. Empty when the LMS has no Q&A.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   Current user.
	 * @param int $page      Page.
	 * @param int $per_page  Page size.
	 * @return array{items: array[], total: int}
	 */
	public function questions( $course_id, $user_id, $page, $per_page ) {
		return self::empty_page();
	}

	/**
	 * A question. None when the LMS has no Q&A.
	 *
	 * @param int $question_id Question ID.
	 * @param int $user_id     Current user.
	 * @return array|null
	 */
	public function question( $question_id, $user_id ) {
		return null;
	}

	/**
	 * Asks a question. Refused when the LMS has no Q&A.
	 *
	 * @param int    $course_id Course ID.
	 * @param int    $user_id   User ID.
	 * @param string $text      Question.
	 * @return array|WP_Error
	 */
	public function ask( $course_id, $user_id, $text ) {
		return self::disabled( __( 'Questions are turned off for this course.', 'yallapp' ) );
	}

	/**
	 * Replies to a question. Refused when the LMS has no Q&A.
	 *
	 * @param int    $question_id Question ID.
	 * @param int    $user_id     User ID.
	 * @param string $text        Reply.
	 * @return array|WP_Error
	 */
	public function answer( $question_id, $user_id, $text ) {
		return self::disabled( __( 'Questions are turned off for this course.', 'yallapp' ) );
	}

	/**
	 * The `feature_disabled` error.
	 *
	 * @param string $message Message for the student.
	 * @return WP_Error
	 */
	protected static function disabled( $message ) {
		return new WP_Error( 'feature_disabled', $message, array( 'status' => 403 ) );
	}

	/**
	 * The `not_enrolled` error.
	 *
	 * @param string $message Message for the student, or empty for the default.
	 * @return WP_Error
	 */
	protected static function not_enrolled( $message = '' ) {
		return new WP_Error( 'not_enrolled', '' !== $message ? $message : __( 'Enroll in this course to continue.', 'yallapp' ), array( 'status' => 403 ) );
	}

	/**
	 * The `not_found` error.
	 *
	 * @param string $message Message for the student.
	 * @return WP_Error
	 */
	protected static function not_found( $message ) {
		return new WP_Error( 'not_found', $message, array( 'status' => 404 ) );
	}

	/**
	 * An empty page of results.
	 *
	 * @return array{items: array[], total: int}
	 */
	protected static function empty_page() {
		return array(
			'items' => array(),
			'total' => 0,
		);
	}

	/**
	 * One page of a list.
	 *
	 * @param array $items    Everything.
	 * @param int   $page     Page.
	 * @param int   $per_page Page size.
	 * @return array
	 */
	protected static function slice( array $items, $page, $per_page ) {
		return array_slice( array_values( $items ), ( max( 1, (int) $page ) - 1 ) * (int) $per_page, (int) $per_page );
	}

	/**
	 * A published post of a type, or null.
	 *
	 * @param int             $post_id   Post ID.
	 * @param string|string[] $post_type Post type(s).
	 * @return WP_Post|null
	 */
	protected function published( $post_id, $post_type ) {
		$post = $post_id ? get_post( (int) $post_id ) : null;
		return ( $post && in_array( $post->post_type, (array) $post_type, true ) && 'publish' === $post->post_status ) ? $post : null;
	}

	/**
	 * 50 A course the user may open (Course_Visibility): published, or private and the user
	 * is enrolled in it or may read it. Null otherwise, as for a course that doesn't exist.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User, or 0.
	 * @return WP_Post|null
	 */
	protected function course_post( $course_id, $user_id ) {
		$post = $this->live( $course_id, $this->post_types()['course'] );
		return ( $post && Course_Visibility::viewable( $post, $user_id, array( $this, 'is_enrolled' ) ) ) ? $post : null;
	}

	/**
	 * 50 Whether a user may see and open a course.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User, or 0.
	 * @return bool
	 */
	public function course_visible( $course_id, $user_id ) {
		return null !== $this->course_post( $course_id, $user_id );
	}

	/**
	 * 50 A published or private post of a type (Course_Visibility::STATUSES), or null: a
	 * course the LMS keeps, whoever may open it.
	 *
	 * @param int             $post_id   Post ID.
	 * @param string|string[] $post_type Post type(s).
	 * @return WP_Post|null
	 */
	protected function live( $post_id, $post_type ) {
		$post = $post_id ? get_post( (int) $post_id ) : null;
		return Course_Visibility::live( $post, $post_type ) ? $post : null;
	}

	/**
	 * WP_Query arguments shared by course lists: paging, search, category, order and IDs.
	 * The adapter adds its price filter.
	 *
	 * @param array  $args      Filters from the request.
	 * @param string $post_type Course post type.
	 * @param string $taxonomy  Course category taxonomy.
	 * @return array
	 */
	protected static function course_query( array $args, $post_type, $taxonomy ) {
		$query = array(
			'post_type'      => $post_type,
			'post_status'    => 'publish',
			'posts_per_page' => max( 1, (int) ( $args['per_page'] ?? 20 ) ),
			'paged'          => max( 1, (int) ( $args['page'] ?? 1 ) ),
		);
		if ( ! empty( $args['ids'] ) ) {
			$query['post__in'] = array_map( 'absint', (array) $args['ids'] );
			$query['orderby']  = 'post__in';
		}
		if ( ! empty( $args['search'] ) ) {
			$query['s'] = (string) $args['search'];
		}
		if ( ! empty( $args['category'] ) ) {
			$query['tax_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				array(
					'taxonomy' => $taxonomy,
					'field'    => 'term_id',
					'terms'    => (int) $args['category'],
				),
			);
		}
		if ( empty( $args['ids'] ) ) {
			$orderby = $args['orderby'] ?? 'newest';
			if ( 'title' === $orderby ) {
				$query['orderby'] = 'title';
				$query['order']   = 'ASC';
			} elseif ( 'popular' === $orderby ) {
				$query['orderby'] = array(
					'comment_count' => 'DESC',
					'date'          => 'DESC',
				);
			} else {
				$query['orderby'] = 'date';
				$query['order']   = 'DESC';
			}
		}
		return $query;
	}

	/**
	 * Categories of a taxonomy, or of one course.
	 *
	 * @param string $taxonomy  Taxonomy.
	 * @param int    $course_id Course, or 0 for every category with courses.
	 * @return array[]
	 */
	protected function terms( $taxonomy, $course_id = 0 ) {
		$terms = $course_id
			? get_the_terms( $course_id, $taxonomy )
			: get_terms(
				array(
					'taxonomy'   => $taxonomy,
					'hide_empty' => true,
				)
			);
		return is_array( $terms ) ? array_values( array_map( array( $this, 'category_shape' ), $terms ) ) : array();
	}

	/**
	 * Category shape.
	 *
	 * @param \WP_Term $term Term.
	 * @return array
	 */
	protected function category_shape( $term ) {
		return array(
			'id'    => (int) $term->term_id,
			'name'  => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
			'count' => (int) $term->count,
		);
	}

	/**
	 * Instructor shape.
	 *
	 * @param int    $user_id  Instructor user ID.
	 * @param string $bio_meta User meta with the LMS's own biography, if it has one.
	 * @return array
	 */
	protected function instructor( $user_id, $bio_meta = '' ) {
		$user = get_userdata( $user_id );
		$bio  = $user && '' !== $bio_meta ? (string) get_user_meta( $user_id, $bio_meta, true ) : '';
		if ( $user && '' === $bio ) {
			$bio = (string) $user->description;
		}
		return array(
			'id'         => (int) $user_id,
			'name'       => $user ? (string) $user->display_name : '',
			'avatar_url' => $user ? \Yallapp\Otp\Sign_In::avatar_url( $user_id ) : null,
			'bio'        => '' !== $bio ? wp_strip_all_tags( $bio ) : null,
		);
	}

	/**
	 * Person shape: a reviewer, asker or replier.
	 *
	 * @param int  $user_id    User.
	 * @param bool $instructor Whether they teach the course.
	 * @return array
	 */
	protected function person( $user_id, $instructor ) {
		$user = get_userdata( $user_id );
		return array(
			'name'       => $user ? (string) $user->display_name : __( 'Former student', 'yallapp' ),
			'avatar_url' => $user ? \Yallapp\Otp\Sign_In::avatar_url( $user_id ) : null,
			'instructor' => $user && $instructor,
		);
	}

	/**
	 * Whether a user teaches a course: its author or an administrator. Adapters add their
	 * LMS's co-instructors.
	 *
	 * @param int $user_id   User.
	 * @param int $course_id Course.
	 * @return bool
	 */
	protected function teaches( $user_id, $course_id ) {
		return $user_id > 0 && ( user_can( $user_id, 'manage_options' ) || (int) get_post_field( 'post_author', $course_id ) === (int) $user_id );
	}

	/**
	 * Price shape.
	 *
	 * @param bool        $is_free   Whether the course is free.
	 * @param float       $regular   Regular price.
	 * @param float       $sale      Sale price, 0 when there is none.
	 * @param string|null $currency  ISO currency code.
	 * @param string      $formatted Price HTML or text as the website shows it.
	 * @return array
	 */
	protected static function price_shape( $is_free, $regular = 0.0, $sale = 0.0, $currency = null, $formatted = '' ) {
		if ( $is_free ) {
			return array(
				'is_free'     => true,
				'amount'      => null,
				'sale_amount' => null,
				'currency'    => null,
				'formatted'   => null,
			);
		}
		// 39 The price paid now: a sale's crossed-out regular price is in `amount`.
		$text = \Yallapp\Commerce\Money::current( $formatted );
		return array(
			'is_free'     => false,
			'amount'      => $regular > 0 ? number_format( (float) $regular, 2, '.', '' ) : null,
			'sale_amount' => ( $sale > 0 && $sale < $regular ) ? number_format( (float) $sale, 2, '.', '' ) : null,
			'currency'    => $currency ? (string) $currency : null,
			'formatted'   => '' !== $text ? $text : null,
		);
	}

	/**
	 * RatingSummary shape from star counts.
	 *
	 * @param array<int, int> $counts Reviews per star, 1 to 5.
	 * @return array
	 */
	protected static function rating_summary( array $counts ) {
		$shaped = array();
		$total  = 0;
		$sum    = 0;
		foreach ( array( 1, 2, 3, 4, 5 ) as $star ) {
			$shaped[ (string) $star ] = (int) ( $counts[ $star ] ?? 0 );
			$total                   += $shaped[ (string) $star ];
			$sum                     += $star * $shaped[ (string) $star ];
		}
		return array(
			'rating'       => $total ? round( $sum / $total, 1 ) : null,
			'rating_count' => $total,
			'counts'       => $shaped,
		);
	}

	/**
	 * Raw video data for a video given as a URL (or embed code), the way most LMSs store it.
	 *
	 * @param string   $value    URL or embed HTML.
	 * @param int|null $seconds  Duration, when the LMS knows it.
	 * @param string   $poster   Poster image URL.
	 * @return array|null source, attachment_id, url, embed_html, duration_seconds, poster_url.
	 */
	protected static function video_from_value( $value, $seconds = null, $poster = '' ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return null;
		}
		$video = array(
			'source'           => 'external',
			'attachment_id'    => 0,
			'url'              => null,
			'embed_html'       => null,
			'duration_seconds' => $seconds ? (int) $seconds : null,
			'poster_url'       => '' !== $poster ? (string) $poster : null,
		);
		if ( '<' === $value[0] ) {
			$video['source']     = 'embed';
			$video['embed_html'] = $value;
			return $video;
		}
		$url = esc_url_raw( $value );
		if ( '' === $url ) {
			return null;
		}
		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );
		if ( preg_match( '/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/', $host ) ) {
			$video['source'] = 'youtube';
		} elseif ( preg_match( '/(^|\.)vimeo\.com$/', $host ) ) {
			$video['source'] = 'vimeo';
		} else {
			$attachment = attachment_url_to_postid( $url );
			if ( $attachment ) {
				$video['source']        = 'upload';
				$video['attachment_id'] = (int) $attachment;
			}
		}
		$video['url'] = $url;
		return $video;
	}

	/**
	 * Raw video data for an uploaded video.
	 *
	 * @param int      $attachment_id Attachment ID.
	 * @param int|null $seconds       Duration, when the LMS knows it.
	 * @return array|null
	 */
	protected static function video_from_attachment( $attachment_id, $seconds = null ) {
		if ( ! $attachment_id || ! wp_get_attachment_url( (int) $attachment_id ) ) {
			return null;
		}
		return array(
			'source'           => 'upload',
			'attachment_id'    => (int) $attachment_id,
			'url'              => null,
			'embed_html'       => null,
			'duration_seconds' => $seconds ? (int) $seconds : null,
			'poster_url'       => null,
		);
	}

	/**
	 * Attachment shape for a media library file.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return array|null
	 */
	protected static function attachment_shape( $attachment_id ) {
		$url = wp_get_attachment_url( (int) $attachment_id );
		if ( ! $url ) {
			return null;
		}
		$file = get_attached_file( (int) $attachment_id );
		$mime = get_post_mime_type( (int) $attachment_id );
		return array(
			'name'       => $file ? basename( (string) $file ) : basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ),
			'url'        => $url,
			'size_bytes' => ( $file && file_exists( $file ) ) ? (int) filesize( $file ) : null,
			'mime_type'  => $mime ? $mime : null,
		);
	}

	/**
	 * Lessons of a course in curriculum order, for previous and next links.
	 *
	 * @param int $course_id Course ID.
	 * @param int $lesson_id Lesson ID.
	 * @param int $user_id   50 The student, so a private course's lessons link to each other.
	 * @return array{0: int|null, 1: int|null} Previous and next lesson IDs.
	 */
	protected function neighbours( $course_id, $lesson_id, $user_id = 0 ) {
		$lessons = array();
		foreach ( (array) $this->curriculum( $course_id, $user_id ) as $topic ) {
			foreach ( $topic['items'] as $item ) {
				if ( 'lesson' === $item['type'] ) {
					$lessons[] = (int) $item['id'];
				}
			}
		}
		$index = array_search( (int) $lesson_id, $lessons, true );
		return array(
			( false !== $index && $index > 0 ) ? $lessons[ $index - 1 ] : null,
			( false !== $index && isset( $lessons[ $index + 1 ] ) ) ? $lessons[ $index + 1 ] : null,
		);
	}

	/**
	 * MyCourse shape: summary, progress, the next unfinished item and the certificate.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id User ID.
	 * @return array
	 */
	protected function my_course( WP_Post $post, $user_id ) {
		return array(
			'course'          => $this->summary( $post, $user_id ),
			'progress'        => $this->progress( $post->ID, $user_id ),
			'next_item'       => Next_Item::pick( (array) $this->curriculum( $post->ID, $user_id ) ),
			'certificate_url' => $this->certificate_url( $post->ID, $user_id ),
		);
	}

	/**
	 * MyCourse shapes for a list of course IDs, one page of them.
	 *
	 * @param int[]  $ids       Enrolled courses, newest first.
	 * @param int[]  $completed Completed courses among them.
	 * @param string $status    in_progress|completed.
	 * @param int    $user_id   User ID.
	 * @param int    $page      Page.
	 * @param int    $per_page  Page size.
	 * @return array{items: array[], total: int}
	 */
	protected function my_course_page( array $ids, array $completed, $status, $user_id, $page, $per_page ) {
		$ids       = array_map( 'intval', $ids );
		$completed = array_map( 'intval', $completed );
		$ids       = 'completed' === $status ? array_values( array_intersect( $ids, $completed ) ) : array_values( array_diff( $ids, $completed ) );
		$items     = array();
		foreach ( self::slice( $ids, $page, $per_page ) as $course_id ) {
			// 50 Private courses too: they show in My courses for their students.
			$post = $this->course_post( $course_id, $user_id );
			if ( $post ) {
				$items[] = $this->my_course( $post, $user_id );
			}
		}
		return array(
			'items' => $items,
			'total' => count( $ids ),
		);
	}

	/**
	 * Progress shape.
	 *
	 * @param int  $course_id Course ID.
	 * @param int  $completed Completed items.
	 * @param int  $total     All items.
	 * @param bool $finished  Whether the LMS considers the course complete.
	 * @param int  $percent   The LMS's own percentage, or -1 to work it out from the counts.
	 * @return array
	 */
	protected static function progress_shape( $course_id, $completed, $total, $finished, $percent = -1 ) {
		if ( $percent < 0 ) {
			$percent = $total > 0 ? (int) floor( $completed * 100 / $total ) : 0;
		}
		return array(
			'course_id'        => (int) $course_id,
			'completed_items'  => (int) $completed,
			'total_items'      => (int) $total,
			'percent'          => max( 0, min( 100, $finished ? 100 : (int) $percent ) ),
			'course_completed' => (bool) $finished,
		);
	}

	/**
	 * Certificate URL for a completed course from the `yallapp_certificate_url` filter, for
	 * LMSs whose certificates come from add-ons.
	 *
	 * @param int $course_id Course ID.
	 * @param int $user_id   User ID.
	 * @return string|null
	 */
	protected function certificate_url( $course_id, $user_id ) {
		if ( ! $this->progress( $course_id, $user_id )['course_completed'] ) {
			return null;
		}
		/** This filter is documented in includes/lms/class-tutor-adapter.php */
		$url = apply_filters( 'yallapp_certificate_url', null, $course_id, $user_id );
		return $url ? esc_url_raw( (string) $url ) : null;
	}

	/**
	 * Certificates from the `yallapp_certificate_url` filter for every completed course.
	 *
	 * @param int[] $course_ids Courses the user is enrolled in.
	 * @param int   $user_id    User ID.
	 * @return array[]
	 */
	protected function filtered_certificates( array $course_ids, $user_id ) {
		$items = array();
		foreach ( $course_ids as $course_id ) {
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
	 * ISO 8601 UTC from a GMT MySQL date, or null.
	 *
	 * @param string|null $gmt MySQL date in UTC.
	 * @return string|null
	 */
	protected static function iso( $gmt ) {
		if ( ! $gmt || '0000-00-00 00:00:00' === $gmt ) {
			return null;
		}
		return gmdate( 'Y-m-d\TH:i:s\Z', (int) strtotime( $gmt . ' UTC' ) );
	}

	/**
	 * Text from HTML, keeping line breaks.
	 *
	 * @param string $html Content.
	 * @return string
	 */
	protected static function plain_text( $html ) {
		$text = preg_replace( '#<br\s*/?>|</p>\s*<p[^>]*>#i', "\n", (string) $html );
		return trim( html_entity_decode( wp_strip_all_tags( (string) $text ), ENT_QUOTES, 'UTF-8' ) );
	}

	/**
	 * CourseSummary shape.
	 *
	 * @param WP_Post $post    Course.
	 * @param int     $user_id Current user.
	 * @return array
	 */
	abstract protected function summary( WP_Post $post, $user_id );
}
