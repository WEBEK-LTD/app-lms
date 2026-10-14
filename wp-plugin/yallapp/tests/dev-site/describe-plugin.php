<?php
/**
 * Prints what a plugin stored in the dev site: its tables with their columns and its
 * options. Used to write and check adapters for plugins this machine can't download.
 * Run with: wp eval-file describe-plugin.php <table-and-option-prefix>
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.WP.AlternativeFunctions.json_encode_json_encode -- Dev tool.

global $wpdb;
$prefix = isset( $args[0] ) ? (string) $args[0] : '';
if ( '' === $prefix ) {
	echo "Usage: wp eval-file describe-plugin.php <prefix>\n";
	return;
}

$tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix . $prefix ) . '%' ) );
echo '== ' . count( $tables ) . " tables\n";
foreach ( $tables as $table ) {
	$columns = $wpdb->get_results( "DESCRIBE `$table`", ARRAY_A );
	$parts   = array();
	foreach ( (array) $columns as $column ) {
		$parts[] = $column['Field'] . ' ' . $column['Type'] . ( null !== $column['Default'] ? '=' . $column['Default'] : '' );
	}
	$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `$table`" );
	echo "$table ($count rows): " . implode( ', ', $parts ) . "\n";
	// Settings tables hold the plugin's options: print them too.
	if ( preg_match( '/settings$/', $table ) ) {
		foreach ( (array) $wpdb->get_results( "SELECT * FROM `$table` LIMIT 200", ARRAY_A ) as $row ) {
			echo '    ' . substr( json_encode( $row ), 0, 300 ) . "\n";
		}
	}
}

$options = $wpdb->get_results( $wpdb->prepare( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_name", $wpdb->esc_like( $prefix ) . '%' ), ARRAY_A );
echo '== ' . count( $options ) . " options\n";
foreach ( $options as $option ) {
	echo $option['option_name'] . ' = ' . substr( (string) $option['option_value'], 0, 6000 ) . "\n";
}
