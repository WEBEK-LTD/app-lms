<?php
/**
 * Sends Yallapp what the site sells that the app may sell through the stores.
 *
 * @package Yallapp
 */

namespace Yallapp\Billing;

defined( 'ABSPATH' ) || exit;

use Yallapp\Plugin;

/**
 * 100.4 `POST /billing/catalog` (docs/api/platform.yaml, sendBillingCatalog): the site's paid
 * courses and its membership plans that renew every month or year, so Yallapp keeps a store
 * product for each. Sent after each license check, and within a minute of a course, a Paid
 * Memberships Pro level, a LearnDash group or a product being saved (one send for many saves),
 * only while the license has the `store_billing` feature.
 */
class Catalog_Sync {

	/**
	 * The one-off event that sends the catalog.
	 */
	const HOOK = 'yallapp_billing_catalog';

	/**
	 * Seconds between a save and the send.
	 */
	const DELAY = 45;

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
		add_action( self::HOOK, array( $this, 'send' ) );
		// After each license check (and on activation), once the new status is saved.
		add_action( 'yallapp_license_checked', array( $this, 'soon' ) );
		add_action( 'yallapp_license_activated', array( $this, 'soon' ) );
		add_action( 'save_post', array( $this, 'post_saved' ), 20, 2 );
		add_action( 'pmpro_save_membership_level', array( $this, 'soon' ) );
		add_action( 'pmpro_delete_membership_level', array( $this, 'soon' ) );
	}

	/**
	 * A course, LearnDash group or product saved: the catalog goes within a minute.
	 *
	 * @param int      $post_id Post.
	 * @param \WP_Post $post    Post.
	 * @return void
	 */
	public function post_saved( $post_id, $post ) {
		if ( ! is_object( $post ) || wp_is_post_revision( $post_id ) || 'auto-draft' === $post->post_status ) {
			return;
		}
		$lms   = $this->plugin->lms();
		$types = array( Site_Plans::LD_GROUP, 'product' );
		if ( $lms ) {
			$types[] = $lms->post_types()['course'];
		}
		if ( in_array( $post->post_type, $types, true ) ) {
			$this->soon();
		}
	}

	/**
	 * Sends the catalog within a minute, once for any number of changes meanwhile.
	 *
	 * @return void
	 */
	public function soon() {
		if ( ! $this->enabled() || wp_next_scheduled( self::HOOK ) ) {
			return;
		}
		wp_schedule_single_event( time() + self::DELAY, self::HOOK );
	}

	/**
	 * Whether the active license's plan has the feature, as the platform said (also on a
	 * development site, where every feature is otherwise on: nothing is sent for nothing).
	 *
	 * @return bool
	 */
	private function enabled() {
		$license = $this->plugin->license();
		return $license->has_key() && $license->is_active() && in_array( Store_Billing::FEATURE, (array) $license->status()['features'], true );
	}

	/**
	 * Sends the catalog now. Runs in cron.
	 *
	 * @return void
	 */
	public function send() {
		if ( ! $this->enabled() ) {
			return;
		}
		$catalog = $this->build();
		if ( null !== $catalog ) {
			$this->plugin->license()->send_billing_catalog( $catalog );
		}
	}

	/**
	 * The catalog: the paid published courses (at their price now, a sale's price when there is
	 * one) and the plans; null when the site's currency isn't known.
	 *
	 * @return array{currency: string, courses: array[], plans: array[]}|null
	 */
	public function build() {
		$lms         = $this->plugin->lms();
		$course_type = $lms ? (string) $lms->post_types()['course'] : '';
		$courses     = array();
		$currency    = '';
		if ( $lms ) {
			// At most 20 pages of 50: the 1,000 courses Yallapp takes.
			for ( $page = 1; $page <= 20; $page++ ) {
				$result = $lms->courses(
					array(
						'page'     => $page,
						'per_page' => 50,
						'search'   => '',
						'category' => 0,
						'price'    => 'paid',
						'orderby'  => 'newest',
					),
					0
				);
				foreach ( (array) ( $result['items'] ?? array() ) as $item ) {
					$price = $item['price'] ?? array();
					if ( ! empty( $price['is_free'] ) ) {
						continue;
					}
					if ( '' === $currency && ! empty( $price['currency'] ) ) {
						$currency = (string) $price['currency'];
					}
					$courses[] = array(
						'id'    => (int) $item['id'],
						'title' => (string) $item['title'],
						'price' => null !== ( $price['sale_amount'] ?? null ) ? $price['sale_amount'] : ( $price['amount'] ?? null ),
					);
				}
				if ( count( (array) ( $result['items'] ?? array() ) ) < 50 ) {
					break;
				}
			}
		}
		return Store_Billing::catalog( '' !== $currency ? $currency : self::site_currency(), $courses, Site_Plans::all( $course_type ) );
	}

	/**
	 * The site's currency without a priced course: WooCommerce's, else Paid Memberships Pro's.
	 *
	 * @return string
	 */
	private static function site_currency() {
		if ( function_exists( 'get_woocommerce_currency' ) ) {
			return (string) get_woocommerce_currency();
		}
		global $pmpro_currency;
		return is_string( $pmpro_currency ) ? $pmpro_currency : (string) get_option( 'pmpro_currency', '' );
	}
}
