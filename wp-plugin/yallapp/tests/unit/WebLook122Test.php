<?php
/**
 * 122 How a web page shows in the app: the site's header and footer hidden, more parts by selectors.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\Block_Resolver;

class WebLook122Test extends TestCase {

	public function test_keeps_what_is_set_and_well_formed_selectors() {
		$this->assertSame(
			array(
				'hide_header'  => true,
				'links_inside' => true,
				'hide'         => '.newsletter, #cookie-banner',
			),
			Block_Resolver::web_look(
				array(
					'hide_header'  => true,
					'hide_footer'  => false,
					'links_inside' => true,
					'hide'         => ' .newsletter, #cookie-banner ',
					'script'       => 'x',
				)
			)
		);
	}

	public function test_leaves_out_selectors_that_end_a_rule_and_sends_nothing_unset() {
		$this->assertSame( array( 'hide_footer' => true ), Block_Resolver::web_look( array( 'hide_footer' => true, 'hide' => 'a{display:block}' ) ) );
		$this->assertNull( Block_Resolver::web_look( array( 'hide' => '</style><script>' ) ) );
		$this->assertNull( Block_Resolver::web_look( 'yes' ) );
	}
}
