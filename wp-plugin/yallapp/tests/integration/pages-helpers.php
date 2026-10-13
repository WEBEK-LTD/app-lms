<?php
/**
 * Helpers for the /pages checks, shared by the end-to-end test scripts. They rely on the
 * including script's call(), check() and wp_cli().
 *
 * @package Yallapp
 */

// phpcs:disable -- Standalone CLI test helpers, not loaded by WordPress.

if ( ! function_exists( 'wp_cli' ) ) {
	/**
	 * Runs WP-CLI against the dev site (WP_CLI env: the command prefix).
	 */
	function wp_cli( $args ) {
		$prefix = (string) getenv( 'WP_CLI' );
		if ( '' === $prefix ) {
			fwrite( STDERR, "Set WP_CLI to the wp command for the dev site.\n" );
			exit( 2 );
		}
		return shell_exec( $prefix . ' ' . $args . ' 2>/dev/null' );
	}
}

/**
 * A block of a page by ID, or null.
 */
function page_block( $page, $id ) {
	foreach ( (array) ( $page['blocks'] ?? array() ) as $block ) {
		if ( ( $block['id'] ?? null ) === $id ) {
			return $block;
		}
	}
	return null;
}

/**
 * Block IDs of a page, in order.
 */
function page_block_ids( $page ) {
	return array_map(
		function ( $block ) {
			return $block['id'];
		},
		(array) ( $page['blocks'] ?? array() )
	);
}

/**
 * Item IDs of a block, in order.
 */
function block_item_ids( $block ) {
	return array_map(
		function ( $item ) {
			return $item['id'];
		},
		(array) ( $block['items'] ?? array() )
	);
}

/**
 * A value of a response header, or ''. call() lower-cases the headers, values included.
 */
function header_value( $response, $name ) {
	return preg_match( '/^' . preg_quote( strtolower( $name ), '/' ) . ':\s*(.*)$/m', (string) ( $response['headers'] ?? '' ), $m ) ? trim( $m[1] ) : '';
}

/**
 * Checks the shapes every /pages and /pages/{slug} answer must have.
 */
function check_navigation_shape( $name, $navigation ) {
	$ok = is_array( $navigation ) && is_string( $navigation['version'] ?? null ) && count( $navigation['tabs'] ?? array() ) >= 2 && count( $navigation['tabs'] ) <= 5 && ! empty( $navigation['pages'] );
	foreach ( (array) ( $navigation['tabs'] ?? array() ) as $tab ) {
		$ok = $ok && is_string( $tab['id'] ?? null ) && is_string( $tab['label'] ?? null ) && preg_match( '/^[a-z0-9_]+$/', (string) ( $tab['icon'] ?? '' ) ) && is_string( $tab['target']['type'] ?? null );
	}
	foreach ( (array) ( $navigation['pages'] ?? array() ) as $page ) {
		$ok = $ok && preg_match( '/^[a-z0-9-]{1,64}$/', (string) ( $page['slug'] ?? '' ) ) && is_string( $page['title'] ?? null ) && preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', (string) ( $page['updated_at'] ?? '' ) );
	}
	check( $name, $ok, $navigation );
}

/**
 * Checks that every item of every items block has the Item shape.
 */
function check_item_shapes( $name, $page ) {
	$ok    = true;
	$found = 0;
	foreach ( (array) ( $page['blocks'] ?? array() ) as $block ) {
		if ( 'items' !== ( $block['type'] ?? '' ) ) {
			continue;
		}
		$ok = $ok && in_array( $block['layout'] ?? '', array( 'carousel', 'grid', 'list' ), true ) && $block['items'] && count( $block['items'] ) <= 30;
		foreach ( $block['items'] as $item ) {
			++$found;
			$ok = $ok && $item['source'] === $block['source'] && is_string( $item['id'] ) && is_string( $item['title'] ) && '' !== $item['title']
				&& array_key_exists( 'subtitle', $item ) && array_key_exists( 'image_url', $item ) && array_key_exists( 'price_label', $item ) && array_key_exists( 'badge', $item )
				&& is_string( $item['action']['type'] ?? null );
		}
	}
	check( $name, $ok && $found > 0, $page );
}

/**
 * Stores a layout through the layout client with a fake platform, reporting its checks.
 */
function store_layout( array $layout ) {
	$file = tempnam( sys_get_temp_dir(), 'yallapp-layout' );
	file_put_contents( $file, json_encode( $layout ) );
	$out = (string) wp_cli( 'eval-file ' . escapeshellarg( __DIR__ . '/layout-client-check.php' ) . ' ' . escapeshellarg( $file ) );
	unlink( $file );
	$result = json_decode( trim( $out ), true );
	if ( ! is_array( $result ) || empty( $result['checks'] ) ) {
		check( 'layout client checks ran', false, $out );
		return;
	}
	foreach ( $result['checks'] as $entry ) {
		check( $entry[0], $entry[1], $entry[2] );
	}
}

/**
 * Removes the stored layout, so the app gets the default pages again.
 */
function forget_layout() {
	wp_cli( 'option delete yallapp_layout' );
}
