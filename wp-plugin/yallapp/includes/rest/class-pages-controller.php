<?php
/**
 * Pages and bottom tabs.
 *
 * @package Yallapp
 */

namespace Yallapp\Rest;

defined( 'ABSPATH' ) || exit;

use WP_REST_Request;
use WP_REST_Server;
use Yallapp\Auth\Rate_Limiter;
use Yallapp\Pages\Form_Answers;

/**
 * GET /pages and GET /pages/{slug}: the layout published in the dashboard, or the default
 * pages, with the site's content filled in and texts in the language the app asks for.
 * 99.4 POST /forms/{slug}/{block_id}: a form's answers, by email to the business.
 */
class Pages_Controller extends Controller {

	/**
	 * 99.4 Form answers from one address: at most 5 a minute and 30 a day.
	 */
	const FORM_MINUTE_LIMIT = 5;
	const FORM_DAY_LIMIT    = 30;

	/**
	 * Registers routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		$this->route(
			'/pages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'navigation' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'platform' => self::platform_arg(),
					'app_type' => self::app_type_arg(),
				),
			)
		);
		$this->route(
			'/pages/(?P<slug>[^/]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'page' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'     => array(
						'type'     => 'string',
						'pattern'  => '^[a-z0-9-]{1,64}$',
						'required' => true,
					),
					'platform' => self::platform_arg(),
					'app_type' => self::app_type_arg(),
				),
			)
		);
		// 99.4 Public; a signed-in person's token adds their name and email to the answers.
		$this->route(
			'/forms/(?P<slug>[^/]+)/(?P<block_id>[^/]+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'send_form' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'slug'     => array(
						'type'     => 'string',
						'pattern'  => '^[a-z0-9-]{1,64}$',
						'required' => true,
					),
					'block_id' => array(
						'type'     => 'string',
						'pattern'  => '^[A-Za-z0-9_-]{1,40}$',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * The `app_type` argument: the type of the app asking. Any string is accepted, so an
	 * app type this plugin doesn't know yet is ignored rather than refused.
	 *
	 * @return array
	 */
	private static function app_type_arg() {
		return array(
			'type'              => 'string',
			'default'           => '',
			'sanitize_callback' => 'sanitize_key',
		);
	}

	/**
	 * GET /pages.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function navigation( WP_REST_Request $request ) {
		$pages = $this->plugin->pages();
		$pages->for_app_type( (string) $request['app_type'] );
		$language   = $pages->language( $request->get_header( 'accept_language' ) );
		$navigation = $pages->navigation( $language, (string) $request['platform'] );
		$etag       = '"' . $navigation['version'] . '"';
		$response   = self::matches( (string) $request->get_header( 'if_none_match' ), $navigation['version'] )
			? $this->ok( null, 304 )
			: $this->ok( $navigation );
		$response->header( 'ETag', $etag );
		$response->header( 'Vary', 'Accept-Language' );
		return $response;
	}

	/**
	 * GET /pages/{slug}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function page( WP_REST_Request $request ) {
		$pages = $this->plugin->pages();
		$pages->for_app_type( (string) $request['app_type'] );
		$language = $pages->language( $request->get_header( 'accept_language' ) );
		$page     = $pages->page( (string) $request['slug'], $language, (string) $request['platform'], get_current_user_id() );
		$response = $page ? $this->ok( $page ) : self::error( 'not_found', __( 'This page does not exist.', 'yallapp' ), 404 );
		$response->header( 'Vary', 'Accept-Language' );
		return $response;
	}

	/**
	 * 99.4 POST /forms/{slug}/{block_id}: checks the answers against the published form and
	 * emails them to the support email set in the plugin, else the site's admin email.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function send_form( WP_REST_Request $request ) {
		$pages   = $this->plugin->pages();
		$user_id = get_current_user_id();
		$form    = $pages->form( (string) $request['slug'], (string) $request['block_id'], $pages->language( $request->get_header( 'accept_language' ) ), $user_id );
		if ( ! $form ) {
			return self::error( 'not_found', __( 'This form does not exist.', 'yallapp' ), 404 );
		}
		if ( 'email' !== $form['send_to'] ) {
			return self::error( 'invalid_request', __( 'This form is sent as a chat message.', 'yallapp' ), 400 );
		}
		$body    = $request->get_json_params();
		$answers = is_array( $body ) && isset( $body['answers'] ) && is_array( $body['answers'] ) ? $body['answers'] : null;
		if ( null === $answers ) {
			return self::error( 'invalid_request', __( 'The answers could not be read.', 'yallapp' ), 400 );
		}
		$checked = Form_Answers::check( $form['fields'], $answers );
		if ( $checked['errors'] ) {
			return self::error( 'invalid_answers', __( 'Some answers need a change.', 'yallapp' ), 400, array( 'details' => array( 'fields' => $checked['errors'] ) ) );
		}
		// Counted once the answers are good, so fixing a mistake doesn't use up the limit.
		$ip   = Rate_Limiter::client_ip();
		$ip   = '' !== $ip ? $ip : 'unknown';
		$wait = Rate_Limiter::hit( 'form-minute|' . $ip, self::FORM_MINUTE_LIMIT, MINUTE_IN_SECONDS );
		if ( ! $wait ) {
			$wait = Rate_Limiter::hit( 'form-day|' . $ip, self::FORM_DAY_LIMIT, DAY_IN_SECONDS );
		}
		if ( $wait ) {
			return self::error( 'rate_limited', __( 'Too many answers were sent from here. Please try again later.', 'yallapp' ), 429, array( 'retry_after_seconds' => $wait ) );
		}
		$contact = ( new Gatekeeper( $this->plugin ) )->contact();
		$person  = null;
		$user    = $user_id ? get_userdata( $user_id ) : false;
		if ( $user ) {
			$person = array(
				'name'  => (string) $user->display_name,
				'email' => (string) $user->user_email,
			);
		}
		$message = Form_Answers::message( $form['fields'], $checked['answers'], $contact['name'], $form['title'], $person );
		$headers = null !== $message['reply_to'] ? array( 'Reply-To: ' . $message['reply_to'] ) : array();
		$to      = null !== $contact['email'] ? $contact['email'] : (string) get_option( 'admin_email' );
		if ( ! wp_mail( $to, $message['subject'], $message['body'], $headers ) ) {
			return self::error( 'send_failed', __( 'The answers could not be sent right now. Please try again later.', 'yallapp' ), 503 );
		}
		return $this->ok( null, 202 );
	}

	/**
	 * Whether If-None-Match names the version. Accepts the bare version, a quoted or weak
	 * entity tag, a list of them, or *.
	 *
	 * @param string $header  If-None-Match.
	 * @param string $version Current version.
	 * @return bool
	 */
	private static function matches( $header, $version ) {
		if ( trim( trim( $header ), '"' ) === $version ) {
			return true;
		}
		foreach ( explode( ',', $header ) as $tag ) {
			$tag = trim( $tag );
			if ( 0 === strpos( $tag, 'W/' ) ) {
				$tag = substr( $tag, 2 );
			}
			$tag = trim( $tag, '"' );
			if ( '' !== $tag && ( '*' === $tag || $tag === $version ) ) {
				return true;
			}
		}
		return false;
	}
}
