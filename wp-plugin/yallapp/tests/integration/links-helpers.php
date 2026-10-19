<?php
/**
 * 48 Helpers for the checks of the site's own pages that open the app (store and news suites;
 * the Tutor LMS suite has its own in api-test.php).
 *
 * @package Yallapp
 */

/**
 * The association file's components, with the app's iOS ID set for the call.
 *
 * @param string $root The site's address.
 * @return array[]
 */
function links_components( $root ) {
	$r = call( 'GET', $root . '/.well-known/apple-app-site-association' );
	return $r['json']['applinks']['details'][0]['components'] ?? array();
}

/**
 * Whether iOS opens the app for a path: the first component that matches decides.
 *
 * @param array[] $components Components.
 * @param string  $path       Path.
 * @return bool
 */
function links_opens_app( array $components, $path ) {
	foreach ( $components as $c ) {
		if ( isset( $c['/'] ) && ! isset( $c['?'] ) && 1 === preg_match( '#^' . str_replace( array( '\*', '\?' ), array( '.*', '.' ), preg_quote( $c['/'], '#' ) ) . '$#', $path ) ) {
			return empty( $c['exclude'] );
		}
	}
	return false;
}

/**
 * `GET /links/resolve` for an address.
 *
 * @param string $url Address.
 * @return array
 */
function links_resolve( $url ) {
	return call( 'GET', '/links/resolve?url=' . rawurlencode( $url ) );
}

/**
 * Sets the app's iOS ID in the license status (what the platform sends) and returns what was
 * there before, to restore with links_restore().
 *
 * @param array $extra More fields of the license status.
 * @return string
 */
function links_enable( array $extra = array() ) {
	$saved = wp_eval( 'echo wp_json_encode( get_option( "yallapp_license", null ) );' );
	wp_eval( 'update_option( "yallapp_license", array_merge( (array) get_option( "yallapp_license", array() ), ' . var_export( $extra, true ) . ', array( "app_links" => array( "android" => null, "ios" => array( "app_ids" => array( "A1B2C3D4E5.com.ada.academy" ) ) ) ) ), false );' );
	return $saved;
}

/**
 * Restores the license status.
 *
 * @param string $saved What links_enable() returned.
 * @return void
 */
function links_restore( $saved ) {
	wp_eval( '$v = json_decode( ' . var_export( $saved, true ) . ', true ); if ( null === $v ) { delete_option( "yallapp_license" ); } else { update_option( "yallapp_license", $v, false ); }' );
}
