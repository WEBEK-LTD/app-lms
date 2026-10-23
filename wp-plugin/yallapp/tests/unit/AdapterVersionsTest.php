<?php
/**
 * 83.4 Every adapter has a version, the plugin lists those of the adapters a site uses, and
 * docs/CONNECTORS.md lists the same versions.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Plugin;

class AdapterVersionsTest extends TestCase {

	/**
	 * Every adapter class by its ID.
	 *
	 * @return array<string, string>
	 */
	private static function adapters() {
		return Plugin::LMS_ADAPTERS + Plugin::BOOKING_ADAPTERS + array( 'woocommerce' => \Yallapp\Store\Catalog::class );
	}

	public function test_every_adapter_has_a_version() {
		foreach ( self::adapters() as $id => $class ) {
			$this->assertMatchesRegularExpression( '/^\d+\.\d+\.\d+$/', (string) Plugin::adapter_version( $class ), $id );
		}
		// An adapter added through a filter without a version has none.
		$this->assertNull( Plugin::adapter_version( new stdClass() ) );
	}

	public function test_the_docs_list_each_adapter_with_its_version() {
		$docs = dirname( __DIR__, 4 ) . '/docs/CONNECTORS.md';
		if ( ! is_readable( $docs ) ) {
			$this->markTestSkipped( 'docs/CONNECTORS.md is outside this checkout.' );
		}
		$text = (string) file_get_contents( $docs ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		foreach ( self::adapters() as $id => $class ) {
			$this->assertMatchesRegularExpression( '/^\| `' . preg_quote( $id, '/' ) . '` \| [^|]+ \| ' . preg_quote( Plugin::adapter_version( $class ), '/' ) . ' \|/m', $text, $id );
		}
	}
}
