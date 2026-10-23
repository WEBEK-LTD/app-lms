<?php
/**
 * Campaigns sent from the Yallapp dashboard.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use Yallapp\License\Campaign_Request;

/**
 * 85.4 `POST /campaigns/send` (docs/api/openapi.yaml, sendCampaign): Yallapp sends a campaign the
 * owner wrote on the dashboard; the site keeps its people's push tokens, so it puts it in
 * everyone's inbox and pushes it, then reports the numbers.
 */
class Campaigns_Controller extends Controller {

	/**
	 * Registers the route.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/campaigns/send',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'send' ),
				// The signature is the permission: checked in the callback so errors keep the contract's shape.
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * POST /campaigns/send.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function send( WP_REST_Request $request ) {
		$key      = (string) $this->plugin->settings()->get( 'license_key' );
		$campaign = Campaign_Request::verify( $key, $request->get_body(), time() );
		if ( null === $campaign ) {
			return self::error( 'invalid_signature', __( 'This request is not signed for this site.', 'yallapp' ), 401 );
		}
		$sent = $this->plugin->push()->campaign( $campaign );
		if ( $sent['batches'] > 0 && ! $sent['again'] ) {
			// Sent now, not at the next visit to the site.
			spawn_cron();
		}
		return new WP_REST_Response(
			array(
				'notification_id' => $sent['notification_id'],
				'people'          => $sent['people'],
				'batches'         => $sent['batches'],
			),
			$sent['again'] ? 200 : 202
		);
	}
}
