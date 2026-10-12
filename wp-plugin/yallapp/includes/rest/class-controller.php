<?php
/**
 * Shared REST controller helpers.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use Yallapp\Lms\Lms_Adapter;
use Yallapp\Plugin;

/**
 * Base for the plugin's REST controllers: responses in the contract's shapes,
 * permission checks and common arguments.
 */
abstract class Controller {

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	protected $plugin;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Registers the controller's routes.
	 *
	 * @return void
	 */
	abstract public function register_routes();

	/**
	 * Registers one route in the plugin namespace.
	 *
	 * @param string $route  Route.
	 * @param array  $config Route config (or a list of them).
	 * @return void
	 */
	protected function route( $route, array $config ) {
		register_rest_route( Plugin::REST_NAMESPACE, $route, $config );
	}

	/**
	 * Successful response.
	 *
	 * @param mixed $data   Body.
	 * @param int   $status Status code.
	 * @return WP_REST_Response
	 */
	protected function ok( $data, $status = 200 ) {
		return new WP_REST_Response( $data, $status );
	}

	/**
	 * Empty 204 response.
	 *
	 * @return WP_REST_Response
	 */
	protected function no_content() {
		return new WP_REST_Response( null, 204 );
	}

	/**
	 * Error response in the contract's Error shape.
	 *
	 * @param string $code    Error code.
	 * @param string $message Message safe to show.
	 * @param int    $status  Status code.
	 * @param array  $extra   retry_after_seconds, details.
	 * @return WP_REST_Response
	 */
	public static function error( $code, $message, $status, array $extra = array() ) {
		return new WP_REST_Response(
			array_merge(
				array(
					'code'    => $code,
					'message' => $message,
				),
				$extra
			),
			$status
		);
	}

	/**
	 * Converts a WP_Error into the Error shape.
	 *
	 * @param WP_Error $error Error.
	 * @return WP_REST_Response
	 */
	public static function from_wp_error( WP_Error $error ) {
		$data  = (array) $error->get_error_data();
		$extra = array();
		if ( isset( $data['retry_after_seconds'] ) ) {
			$extra['retry_after_seconds'] = (int) $data['retry_after_seconds'];
		}
		return self::error( (string) $error->get_error_code(), $error->get_error_message(), (int) ( $data['status'] ?? 400 ), $extra );
	}

	/**
	 * Returns data, or the error shape when it is a WP_Error.
	 *
	 * @param mixed $result Result.
	 * @param int   $status Status on success.
	 * @return WP_REST_Response
	 */
	protected function result( $result, $status = 200 ) {
		return is_wp_error( $result ) ? self::from_wp_error( $result ) : $this->ok( $result, $status );
	}

	/**
	 * Permission callback: signed in.
	 *
	 * @return true|WP_Error
	 */
	public function require_user() {
		if ( get_current_user_id() ) {
			return true;
		}
		return new WP_Error( 'unauthorized', __( 'Please sign in.', 'yallapp' ), array( 'status' => 401 ) );
	}

	/**
	 * The LMS adapter, or an error response when the site has none.
	 *
	 * @return Lms_Adapter|WP_REST_Response
	 */
	protected function lms() {
		$lms = $this->plugin->lms();
		if ( ! $lms ) {
			return self::error( 'lms_unavailable', __( 'Courses are not available right now.', 'yallapp' ), 503 );
		}
		return $lms;
	}

	/**
	 * Device row ID of the request's token.
	 *
	 * @return int
	 */
	protected function device_row_id() {
		return $this->plugin->request_auth()->device_row_id();
	}

	/**
	 * Arguments for paginated lists.
	 *
	 * @return array
	 */
	protected static function page_args() {
		return array(
			'page'     => array(
				'type'    => 'integer',
				'minimum' => 1,
				'default' => 1,
			),
			'per_page' => array(
				'type'    => 'integer',
				'minimum' => 1,
				'maximum' => 50,
				'default' => 20,
			),
		);
	}

	/**
	 * The platform argument.
	 *
	 * @param bool $required Whether it is required.
	 * @return array
	 */
	protected static function platform_arg( $required = true ) {
		return array(
			'type'     => 'string',
			'enum'     => array( 'android', 'ios' ),
			'required' => $required,
		);
	}

	/**
	 * Page metadata.
	 *
	 * @param WP_REST_Request $request Request.
	 * @param int             $total   Total items.
	 * @return array
	 */
	protected static function page_meta( WP_REST_Request $request, $total ) {
		$per_page = (int) $request['per_page'];
		return array(
			'page'        => (int) $request['page'],
			'per_page'    => $per_page,
			'total'       => (int) $total,
			'total_pages' => $per_page > 0 ? (int) ceil( $total / $per_page ) : 0,
		);
	}
}
