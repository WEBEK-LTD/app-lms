<?php
/**
 * Prints the source of a plugin's functions and methods whose "Class::method"
 * (or plain function name) matches a regex. Used to
 * read the parts of plugins this machine can't download (CI can) without
 * printing whole files.
 *
 * Usage: php describe-methods.php <plugin-dir> <regex> [--list]
 *        --list prints only where each match starts.
 *
 * @package Yallapp
 */

// phpcs:disable WordPress.WP.AlternativeFunctions, WordPress.Security.EscapeOutput -- A command-line tool.

if ( $argc < 3 ) {
	fwrite( STDERR, "usage: describe-methods.php <plugin-dir> <regex>\n" );
	exit( 2 );
}
$dir     = rtrim( $argv[1], '/' );
$pattern = '#' . str_replace( '#', '\#', $argv[2] ) . '#';
$list    = isset( $argv[3] ) && '--list' === $argv[3];

$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );
$paths = array();
foreach ( $files as $file ) {
	$path = $file->getPathname();
	if ( substr( $path, -4 ) === '.php' && false === strpos( $path, '/vendor/' ) && false === strpos( $path, '/node_modules/' ) ) {
		$paths[] = $path;
	}
}
sort( $paths );

foreach ( $paths as $path ) {
	$code = file_get_contents( $path );
	if ( false === $code ) {
		continue;
	}
	$lines  = explode( "\n", $code );
	$tokens = @token_get_all( $code ); // phpcs:ignore WordPress.PHP.NoSilencedErrors -- Plugins written for newer PHP.
	$count  = count( $tokens );
	$class  = '';
	$depth  = 0;
	$class_depth = -1;
	for ( $i = 0; $i < $count; $i++ ) {
		$token = $tokens[ $i ];
		if ( is_string( $token ) ) {
			if ( '{' === $token ) {
				++$depth;
			} elseif ( '}' === $token ) {
				--$depth;
				if ( $depth === $class_depth ) {
					$class       = '';
					$class_depth = -1;
				}
			}
			continue;
		}
		if ( in_array( $token[0], array( T_CURLY_OPEN, T_DOLLAR_OPEN_CURLY_BRACES ), true ) ) {
			++$depth;
			continue;
		}
		if ( in_array( $token[0], array( T_CLASS, T_INTERFACE, T_TRAIT ), true ) ) {
			// Skip "Foo::class" and anonymous classes.
			$prev = $i - 1;
			while ( $prev >= 0 && is_array( $tokens[ $prev ] ) && T_WHITESPACE === $tokens[ $prev ][0] ) {
				--$prev;
			}
			if ( $prev >= 0 && is_array( $tokens[ $prev ] ) && T_DOUBLE_COLON === $tokens[ $prev ][0] ) {
				continue;
			}
			for ( $j = $i + 1; $j < $count; $j++ ) {
				if ( is_array( $tokens[ $j ] ) && T_STRING === $tokens[ $j ][0] ) {
					$class       = $tokens[ $j ][1];
					$class_depth = $depth;
					break;
				}
				if ( '{' === $tokens[ $j ] || '(' === $tokens[ $j ] ) {
					break;
				}
			}
			continue;
		}
		if ( T_FUNCTION !== $token[0] ) {
			continue;
		}
		$name = '';
		for ( $j = $i + 1; $j < $count; $j++ ) {
			if ( is_array( $tokens[ $j ] ) && T_STRING === $tokens[ $j ][0] ) {
				$name = $tokens[ $j ][1];
				break;
			}
			if ( '(' === $tokens[ $j ] || ( is_string( $tokens[ $j ] ) && '&' !== $tokens[ $j ] ) ) {
				break;
			}
		}
		if ( '' === $name ) {
			continue;
		}
		$full = '' !== $class ? $class . '::' . $name : $name;
		if ( ! preg_match( $pattern, $full ) ) {
			continue;
		}
		if ( $list ) {
			echo $full . ' (' . substr( $path, strlen( $dir ) + 1 ) . ':' . $token[2] . ")\n";
			continue;
		}
		// The body runs from the first "{" (or ";" for abstract methods) to its match.
		$start = $token[2];
		$end   = $start;
		$level = 0;
		for ( $j = $i + 1; $j < $count; $j++ ) {
			$t = $tokens[ $j ];
			if ( is_array( $t ) ) {
				$end = $t[2] + substr_count( $t[1], "\n" );
				if ( in_array( $t[0], array( T_CURLY_OPEN, T_DOLLAR_OPEN_CURLY_BRACES ), true ) ) {
					++$level;
				}
				continue;
			}
			if ( '{' === $t ) {
				++$level;
			} elseif ( '}' === $t ) {
				--$level;
				if ( 0 === $level ) {
					break;
				}
			} elseif ( ';' === $t && 0 === $level ) {
				break;
			}
		}
		// Include the doc comment above it.
		$from = $start;
		while ( $from > 1 && preg_match( '#^\s*(\*|/\*\*|\*/|//|(public|protected|private|static|final|abstract)\b)#', $lines[ $from - 2 ] ) ) {
			--$from;
		}
		echo '== method ' . $full . ' (' . substr( $path, strlen( $dir ) + 1 ) . ':' . $start . ")\n";
		for ( $n = $from; $n <= $end && $n <= count( $lines ); $n++ ) {
			echo $n . "\t" . $lines[ $n - 1 ] . "\n";
		}
	}
}
