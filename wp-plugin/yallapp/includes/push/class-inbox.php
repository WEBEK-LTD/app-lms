<?php
/**
 * The notifications inbox.
 *
 * @package Yallapp
 */

namespace Yallapp\Push;

defined( 'ABSPATH' ) || exit;

use Yallapp\Installer;

/**
 * Keeps every notification the site sends, so students can read them in the app
 * even when push didn't reach a device (or Firebase isn't set up).
 *
 * Each notification is one row with its audience (everyone, the students of a
 * course, or one student), not one row per student. A student's read state is
 * the ID of the newest notification they've seen, kept in their user meta.
 */
class Inbox {

	const READ_META = 'yallapp_notifications_read_id';
	const KEEP_DAYS = 90;

	const AUDIENCE_ALL    = 'all';
	const AUDIENCE_COURSE = 'course';
	const AUDIENCE_USER   = 'user';

	/**
	 * Saves a notification.
	 *
	 * @param string $type      new_lesson, announcement, enrolled or qna_answer.
	 * @param string $audience  all, course or user.
	 * @param int    $target_id Course ID or user ID; 0 for everyone.
	 * @param string $title     Title.
	 * @param string $body      Message.
	 * @param int    $course_id Course to open, or 0.
	 * @param int    $lesson_id   Lesson to open, or 0.
	 * @param int    $question_id Question to open, or 0.
	 * @return int Notification ID, 0 on failure.
	 */
	public function add( $type, $audience, $target_id, $title, $body, $course_id = 0, $lesson_id = 0, $question_id = 0 ) {
		global $wpdb;
		$inserted = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Plugin table.
			Installer::tables()['notifications'],
			array(
				'type'        => (string) $type,
				'audience'    => (string) $audience,
				'target_id'   => absint( $target_id ),
				'title'       => mb_substr( (string) $title, 0, 255 ),
				'body'        => (string) $body,
				'course_id'   => absint( $course_id ),
				'lesson_id'   => absint( $lesson_id ),
				'question_id' => absint( $question_id ),
				'created_at'  => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%d', '%s', '%s', '%d', '%d', '%d', '%s' )
		);
		return $inserted ? (int) $wpdb->insert_id : 0;
	}

	/**
	 * A student's notifications, newest first.
	 *
	 * @param int   $user_id    Student.
	 * @param int[] $course_ids Courses they're enrolled in.
	 * @param int   $page       Page.
	 * @param int   $per_page   Page size.
	 * @return array{items: array[], total: int, unread: int} Notification shapes.
	 */
	public function for_user( $user_id, array $course_ids, $page, $per_page ) {
		global $wpdb;
		$table   = Installer::tables()['notifications'];
		$where   = $this->visible_to( $user_id, $course_ids );
		$read_id = (int) get_user_meta( $user_id, self::READ_META, true );
		$offset  = max( 0, ( (int) $page - 1 ) * (int) $per_page );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Plugin table; $where is built with prepare().
		$total  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE {$where}" );
		$unread = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$where} AND id > %d", $read_id ) );
		$rows   = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE {$where} ORDER BY id DESC LIMIT %d OFFSET %d", (int) $per_page, $offset ) );
		// phpcs:enable

		$items = array();
		foreach ( (array) $rows as $row ) {
			$items[] = array(
				'id'          => (int) $row->id,
				'title'       => (string) $row->title,
				'body'        => (string) $row->body,
				'type'        => (string) $row->type,
				'course_id'   => (int) $row->course_id ? (int) $row->course_id : null,
				'lesson_id'   => (int) $row->lesson_id ? (int) $row->lesson_id : null,
				'question_id' => (int) $row->question_id ? (int) $row->question_id : null,
				'created_at'  => mysql2date( 'Y-m-d\TH:i:s\Z', $row->created_at, false ),
				'read'        => (int) $row->id <= $read_id,
			);
		}
		return array(
			'items'  => $items,
			'total'  => $total,
			'unread' => $unread,
		);
	}

	/**
	 * Marks everything the student can see as read.
	 *
	 * @param int   $user_id    Student.
	 * @param int[] $course_ids Courses they're enrolled in.
	 * @return void
	 */
	public function mark_read( $user_id, array $course_ids ) {
		global $wpdb;
		$table  = Installer::tables()['notifications'];
		$where  = $this->visible_to( $user_id, $course_ids );
		$newest = (int) $wpdb->get_var( "SELECT MAX(id) FROM {$table} WHERE {$where}" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Plugin table; $where is built with prepare().
		if ( $newest > (int) get_user_meta( $user_id, self::READ_META, true ) ) {
			update_user_meta( $user_id, self::READ_META, $newest );
		}
	}

	/**
	 * Deletes notifications older than KEEP_DAYS. Runs daily.
	 *
	 * @return void
	 */
	public function purge_old() {
		global $wpdb;
		$table = Installer::tables()['notifications'];
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE created_at < %s", gmdate( 'Y-m-d H:i:s', time() - self::KEEP_DAYS * DAY_IN_SECONDS ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Plugin table.
	}

	/**
	 * SQL condition for what a student sees: sent after they joined, to
	 * everyone, to them, or to a course they're enrolled in.
	 *
	 * @param int   $user_id    Student.
	 * @param int[] $course_ids Enrolled courses.
	 * @return string
	 */
	private function visible_to( $user_id, array $course_ids ) {
		global $wpdb;
		$user   = get_userdata( $user_id );
		$joined = $user ? $user->user_registered : '1970-01-01 00:00:00';
		$since  = gmdate( 'Y-m-d H:i:s', max( strtotime( $joined . ' UTC' ), time() - self::KEEP_DAYS * DAY_IN_SECONDS ) );

		$parts      = array(
			$wpdb->prepare( 'audience = %s', self::AUDIENCE_ALL ),
			$wpdb->prepare( '(audience = %s AND target_id = %d)', self::AUDIENCE_USER, $user_id ),
		);
		$course_ids = array_values( array_filter( array_map( 'absint', $course_ids ) ) );
		if ( $course_ids ) {
			$parts[] = $wpdb->prepare( 'audience = %s', self::AUDIENCE_COURSE ) . ' AND target_id IN (' . implode( ',', $course_ids ) . ')';
		}
		return $wpdb->prepare( 'created_at >= %s', $since ) . ' AND (' . implode( ' OR ', array_map( static fn( $part ) => "({$part})", $parts ) ) . ')';
	}
}
