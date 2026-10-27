<?php
/**
 * Gives and takes the access bought in the app through Google Play or the App Store.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

use Throwable;
use WP_Error;
use Yallapp\Lms\Store_Enrolment;
use Yallapp\Plugin;

/**
 * 100.4 What `POST /billing/access` does on the site: a course through the site's LMS adapter
 * (Store_Enrolment), a plan through Paid Memberships Pro (the level until `expires_at`), a
 * LearnDash group (until `expires_at`, ended by the daily job) or WooCommerce Subscriptions (a
 * subscription of the plan's product ending at `expires_at`, renewed by the store, never by a
 * payment gateway), and with WooCommerce a completed order paid by the store.
 *
 * What the app gave is kept in the user's `yallapp_store_access` meta, so taking it back
 * never takes what the student has from the website: access they had before the purchase is
 * left as it is.
 */
class Store_Access {

	/**
	 * The user meta: key (`course:<id>` or a plan ID) => own, transaction_id, expires, since,
	 * subscription_id.
	 */
	const META = 'yallapp_store_access';

	/**
	 * A LearnDash group bought in the app ends a day after `expires_at`, if no renewal came.
	 */
	const GRACE = 86400;

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Hooks into WordPress.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'yallapp_daily', array( $this, 'end_expired' ) );
	}

	/**
	 * Gives or takes the access of a checked request (Access_Request::parse()).
	 *
	 * @param array $request The request.
	 * @return array{ok: bool, order_id: int|null}|WP_Error `not_found` (404) for a user, course or
	 *                                                       plan that isn't on the site; others (503)
	 *                                                       are tried again by Yallapp.
	 */
	public function apply( array $request ) {
		$user_id = (int) $request['user_id'];
		$user    = get_userdata( $user_id );
		if ( ! $user ) {
			return new WP_Error( 'not_found', __( 'User not found.', 'yallapp' ), array( 'status' => 404 ) );
		}
		$key     = 'course' === $request['kind'] ? 'course:' . (int) $request['course_id'] : (string) $request['plan_id'];
		$entries = self::entries( $user_id );
		$entry   = $entries[ $key ] ?? null;
		if ( 'revoke' === $request['action'] ) {
			if ( $entry && ! empty( $entry['own'] ) ) {
				$result = 'course' === $request['kind'] ? $this->revoke_course( (int) $request['course_id'], $user_id ) : $this->revoke_plan( (string) $request['plan_id'], $user_id, $entry );
				if ( is_wp_error( $result ) ) {
					return $result;
				}
			}
			unset( $entries[ $key ] );
			self::save_entries( $user_id, $entries );
			return array(
				'ok'       => true,
				'order_id' => null,
			);
		}
		$result = 'course' === $request['kind'] ? $this->grant_course( (int) $request['course_id'], $user_id, $entry ) : $this->grant_plan( (string) $request['plan_id'], $user_id, $request['expires_at'], $entry, $request );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		// A payment the site hasn't recorded yet: a new purchase, or a renewal with a later end.
		$paid            = ! $entry || ( $entry['transaction_id'] ?? '' ) !== $request['transaction_id'] || (int) ( $request['expires_at'] ?? 0 ) > (int) ( $entry['expires'] ?? 0 );
		$entries[ $key ] = array_merge(
			$result,
			array(
				'transaction_id' => (string) $request['transaction_id'],
				'expires'        => null !== $request['expires_at'] ? (int) $request['expires_at'] : null,
			)
		);
		self::save_entries( $user_id, $entries );
		return array(
			'ok'       => true,
			'order_id' => $paid ? $this->record_order( $request, $user ) : null,
		);
	}

	/**
	 * Enrols a student in a course bought in the app.
	 *
	 * @param int        $course_id Course.
	 * @param int        $user_id   User.
	 * @param array|null $entry     What the app gave before.
	 * @return array|WP_Error The entry's own fields.
	 */
	private function grant_course( $course_id, $user_id, $entry ) {
		$lms = $this->plugin->lms();
		if ( ! $lms instanceof Store_Enrolment ) {
			return new WP_Error( 'lms_unavailable', __( 'Courses are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		$own    = $entry ? ! empty( $entry['own'] ) : ! $lms->is_enrolled( $course_id, $user_id );
		$result = $lms->grant_course( $course_id, $user_id );
		return is_wp_error( $result ) ? $result : array( 'own' => $own );
	}

	/**
	 * Takes a course bought in the app back.
	 *
	 * @param int $course_id Course.
	 * @param int $user_id   User.
	 * @return true|WP_Error
	 */
	private function revoke_course( $course_id, $user_id ) {
		$lms = $this->plugin->lms();
		if ( ! $lms instanceof Store_Enrolment ) {
			return new WP_Error( 'lms_unavailable', __( 'Courses are not available right now.', 'yallapp' ), array( 'status' => 503 ) );
		}
		return $lms->revoke_course( $course_id, $user_id );
	}

	/**
	 * Gives a plan bought in the app until it ends.
	 *
	 * @param string     $plan_id Plan.
	 * @param int        $user_id User.
	 * @param int|null   $expires When the paid period ends.
	 * @param array|null $entry   What the app gave before.
	 * @param array      $request The request.
	 * @return array|WP_Error The entry's own fields.
	 */
	private function grant_plan( $plan_id, $user_id, $expires, $entry, array $request ) {
		$source = Store_Billing::plan_source( $plan_id );
		try {
			switch ( $source['source'] ) {
				case 'pmpro':
					return self::grant_pmpro( $source['id'], $user_id, $expires, $entry );
				case 'ld_group':
					return self::grant_ld_group( $source['id'], $user_id, $entry );
				default:
					return self::grant_wcs( $source['id'], $user_id, $expires, $entry, $request );
			}
		} catch ( Throwable $e ) {
			return self::unavailable();
		}
	}

	/**
	 * Takes a plan bought in the app back.
	 *
	 * @param string $plan_id Plan.
	 * @param int    $user_id User.
	 * @param array  $entry   What the app gave.
	 * @return true|WP_Error
	 */
	private function revoke_plan( $plan_id, $user_id, array $entry ) {
		$source = Store_Billing::plan_source( $plan_id );
		try {
			if ( 'pmpro' === $source['source'] ) {
				if ( function_exists( 'pmpro_cancelMembershipLevel' ) && function_exists( 'pmpro_hasMembershipLevel' ) && pmpro_hasMembershipLevel( $source['id'], $user_id ) ) {
					pmpro_cancelMembershipLevel( $source['id'], $user_id, 'cancelled' );
				}
				return true;
			}
			if ( 'ld_group' === $source['source'] ) {
				if ( function_exists( 'ld_update_group_access' ) ) {
					ld_update_group_access( $user_id, $source['id'], true );
				}
				return true;
			}
			$subscription = ! empty( $entry['subscription_id'] ) && function_exists( 'wcs_get_subscription' ) ? wcs_get_subscription( (int) $entry['subscription_id'] ) : null;
			if ( $subscription && $subscription->can_be_updated_to( 'cancelled' ) ) {
				$subscription->update_status( 'cancelled', __( 'Refunded or ended in the app store.', 'yallapp' ) );
			}
			return true;
		} catch ( Throwable $e ) {
			return self::unavailable();
		}
	}

	/**
	 * A Paid Memberships Pro level until `expires_at` (PMPro ends it then), with no payments of its own.
	 *
	 * @param int        $level_id Level.
	 * @param int        $user_id  User.
	 * @param int|null   $expires  When it ends.
	 * @param array|null $entry    What the app gave before.
	 * @return array|WP_Error
	 */
	private static function grant_pmpro( $level_id, $user_id, $expires, $entry ) {
		if ( ! function_exists( 'pmpro_changeMembershipLevel' ) || ! function_exists( 'pmpro_getLevel' ) || ! function_exists( 'pmpro_hasMembershipLevel' ) ) {
			return self::unavailable();
		}
		if ( empty( pmpro_getLevel( $level_id ) ) ) {
			return self::not_found();
		}
		$own = $entry ? ! empty( $entry['own'] ) : ! pmpro_hasMembershipLevel( $level_id, $user_id );
		if ( ! $own ) {
			// The website's own membership stays as it is.
			return array( 'own' => false );
		}
		// Paid Memberships Pro keeps its dates in the site's time.
		$since = is_string( $entry['since'] ?? null ) ? $entry['since'] : current_time( 'mysql' );
		$ok    = pmpro_changeMembershipLevel(
			array(
				'user_id'         => $user_id,
				'membership_id'   => $level_id,
				'code_id'         => 0,
				'initial_payment' => 0,
				'billing_amount'  => 0,
				'cycle_number'    => 0,
				'cycle_period'    => '',
				'billing_limit'   => 0,
				'trial_amount'    => 0,
				'trial_limit'     => 0,
				'startdate'       => $since,
				'enddate'         => null !== $expires ? get_date_from_gmt( gmdate( 'Y-m-d H:i:s', (int) $expires ) ) : '0000-00-00 00:00:00',
			),
			$user_id,
			'changed'
		);
		if ( false === $ok ) {
			return self::unavailable();
		}
		return array(
			'own'   => true,
			'since' => $since,
		);
	}

	/**
	 * A LearnDash group (end_expired() takes it back a day after `expires_at` without a renewal).
	 *
	 * @param int        $group_id Group.
	 * @param int        $user_id  User.
	 * @param array|null $entry    What the app gave before.
	 * @return array|WP_Error
	 */
	private static function grant_ld_group( $group_id, $user_id, $entry ) {
		if ( ! function_exists( 'ld_update_group_access' ) ) {
			return self::unavailable();
		}
		if ( Site_Plans::LD_GROUP !== get_post_type( $group_id ) ) {
			return self::not_found();
		}
		$own = $entry ? ! empty( $entry['own'] ) : ! in_array( $group_id, array_map( 'intval', function_exists( 'learndash_get_users_group_ids' ) ? (array) learndash_get_users_group_ids( $user_id, true ) : array() ), true );
		ld_update_group_access( $user_id, $group_id, false );
		return array( 'own' => $own );
	}

	/**
	 * A WooCommerce subscription of the plan's product, renewed by the store (manual renewal on
	 * the site, so no payment gateway charges it), ending at `expires_at`.
	 *
	 * @param int        $product_id Product.
	 * @param int        $user_id    User.
	 * @param int|null   $expires    When it ends.
	 * @param array|null $entry      What the app gave before.
	 * @param array      $request    The request.
	 * @return array|WP_Error
	 */
	private static function grant_wcs( $product_id, $user_id, $expires, $entry, array $request ) {
		if ( ! function_exists( 'wcs_create_subscription' ) || ! function_exists( 'wcs_get_subscription' ) || ! function_exists( 'wc_get_product' ) || ! class_exists( '\WC_Subscriptions_Product' ) ) {
			return self::unavailable();
		}
		$product = wc_get_product( $product_id );
		if ( ! $product || ! \WC_Subscriptions_Product::is_subscription( $product ) ) {
			return self::not_found();
		}
		$subscription = ! empty( $entry['subscription_id'] ) ? wcs_get_subscription( (int) $entry['subscription_id'] ) : null;
		if ( ! $subscription ) {
			$subscription = wcs_create_subscription(
				array(
					'customer_id'      => $user_id,
					'billing_period'   => \WC_Subscriptions_Product::get_period( $product ),
					'billing_interval' => \WC_Subscriptions_Product::get_interval( $product ),
					'start_date'       => gmdate( 'Y-m-d H:i:s' ),
					'created_via'      => 'yallapp',
				)
			);
			if ( is_wp_error( $subscription ) || ! $subscription ) {
				return self::unavailable();
			}
			$amount = null !== $request['amount'] ? (float) $request['amount'] : 0.0;
			$subscription->add_product(
				$product,
				1,
				array(
					'subtotal' => $amount,
					'total'    => $amount,
				)
			);
			$subscription->set_requires_manual_renewal( true );
			$subscription->set_payment_method_title( self::store_name( $request['platform'] ) );
			$subscription->calculate_totals( false );
			$subscription->save();
		}
		if ( null !== $expires ) {
			$subscription->update_dates( array( 'end' => gmdate( 'Y-m-d H:i:s', (int) $expires ) ) );
		}
		if ( ! $subscription->has_status( 'active' ) ) {
			$subscription->update_status( 'active', __( 'Bought in the app store.', 'yallapp' ) );
		}
		$subscription->save();
		return array(
			'own'             => true,
			'subscription_id' => (int) $subscription->get_id(),
		);
	}

	/**
	 * With WooCommerce, records the purchase as a completed order paid by the store: what the
	 * person paid, the store's transaction ID and "Google Play" or "App Store" as the payment
	 * method. Its line has no shop product, so nothing else is given for it. A failure here
	 * never takes back the access given.
	 *
	 * @param array    $request The request.
	 * @param \WP_User $user    The person.
	 * @return int|null The order.
	 */
	private function record_order( array $request, $user ) {
		if ( ! function_exists( 'wc_create_order' ) || ! class_exists( '\WC_Order_Item_Product' ) ) {
			return null;
		}
		try {
			$order = wc_create_order(
				array(
					'customer_id' => (int) $user->ID,
					'created_via' => 'yallapp',
				)
			);
			if ( is_wp_error( $order ) || ! $order ) {
				return null;
			}
			$amount = null !== $request['amount'] ? $request['amount'] : '0.00';
			$item   = new \WC_Order_Item_Product();
			$item->set_name( self::item_name( $request ) );
			$item->set_quantity( 1 );
			$item->set_subtotal( $amount );
			$item->set_total( $amount );
			$order->add_item( $item );
			if ( null !== $request['currency'] ) {
				$order->set_currency( $request['currency'] );
			}
			$order->set_billing_email( (string) $user->user_email );
			$order->set_billing_first_name( (string) $user->first_name );
			$order->set_billing_last_name( (string) $user->last_name );
			$order->set_payment_method( 'ios' === $request['platform'] ? 'yallapp_app_store' : 'yallapp_google_play' );
			$order->set_payment_method_title( self::store_name( $request['platform'] ) );
			$order->set_transaction_id( (string) $request['transaction_id'] );
			$order->update_meta_data( '_yallapp_store_grant', (string) $request['grant_id'] );
			$order->calculate_totals( false );
			$order->set_date_paid( time() );
			$order->set_status( 'completed', __( 'Paid in the app store.', 'yallapp' ) );
			$order->save();
			return (int) $order->get_id();
		} catch ( Throwable $e ) {
			return null;
		}
	}

	/**
	 * 100.4 Takes back the LearnDash groups bought in the app whose paid period ended more than a
	 * day ago without a renewal (Paid Memberships Pro and WooCommerce Subscriptions end theirs on
	 * their own), and forgets what ended long ago. Daily.
	 *
	 * @return void
	 */
	public function end_expired() {
		$now = time();
		foreach (
			get_users(
				array(
					'meta_key' => self::META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- Daily, people who bought in the app.
					'fields'   => 'ID',
					'number'   => 500,
				)
			) as $user_id
		) {
			$entries = self::entries( (int) $user_id );
			$changed = false;
			foreach ( $entries as $key => $entry ) {
				$expires = isset( $entry['expires'] ) ? (int) $entry['expires'] : 0;
				if ( $expires <= 0 || $expires > $now - self::GRACE ) {
					continue;
				}
				$source = Store_Billing::plan_source( (string) $key );
				if ( $source && 'ld_group' === $source['source'] && ! empty( $entry['own'] ) && function_exists( 'ld_update_group_access' ) ) {
					ld_update_group_access( (int) $user_id, $source['id'], true );
				}
				unset( $entries[ $key ] );
				$changed = true;
			}
			if ( $changed ) {
				self::save_entries( (int) $user_id, $entries );
			}
		}
	}

	/**
	 * What the app gave a user.
	 *
	 * @param int $user_id User.
	 * @return array
	 */
	private static function entries( $user_id ) {
		$entries = get_user_meta( $user_id, self::META, true );
		return is_array( $entries ) ? $entries : array();
	}

	/**
	 * Saves what the app gave a user (none: the meta goes).
	 *
	 * @param int   $user_id User.
	 * @param array $entries Entries.
	 * @return void
	 */
	private static function save_entries( $user_id, array $entries ) {
		if ( $entries ) {
			update_user_meta( $user_id, self::META, $entries );
		} else {
			delete_user_meta( $user_id, self::META );
		}
	}

	/**
	 * The order line's name: the course's or plan's title.
	 *
	 * @param array $request The request.
	 * @return string
	 */
	private static function item_name( array $request ) {
		$title = 'course' === $request['kind'] ? html_entity_decode( (string) get_the_title( (int) $request['course_id'] ), ENT_QUOTES, 'UTF-8' ) : Site_Plans::title( (string) $request['plan_id'] );
		return '' !== trim( $title ) ? $title : ( 'course' === $request['kind'] ? __( 'Course', 'yallapp' ) : __( 'Membership', 'yallapp' ) );
	}

	/**
	 * The store's name, as the payment method.
	 *
	 * @param string $platform android|ios.
	 * @return string
	 */
	public static function store_name( $platform ) {
		return 'ios' === $platform ? 'App Store' : 'Google Play';
	}

	/**
	 * A course or plan that isn't on the site.
	 *
	 * @return WP_Error
	 */
	private static function not_found() {
		return new WP_Error( 'not_found', __( 'This course or membership is not on the site.', 'yallapp' ), array( 'status' => 404 ) );
	}

	/**
	 * The plugin that gives the plan can't be used now.
	 *
	 * @return WP_Error
	 */
	private static function unavailable() {
		return new WP_Error( 'access_unavailable', __( 'The access could not be given right now.', 'yallapp' ), array( 'status' => 503 ) );
	}
}
