<?php
/**
 * Lesson HTML processing.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Content\Html_Processor;

class HtmlProcessorTest extends TestCase {

	public function test_empty_content() {
		$this->assertSame( array( 'html' => '', 'embeds' => array(), 'needs_webview' => false ), Html_Processor::process( "  \n", 'academy.test' ) );
	}

	public function test_removes_editor_bookmarks() {
		$html = '<p>Hello<span data-mce-type="bookmark" class="mce_SELRES_start">﻿</span> world</p>';
		$out  = Html_Processor::process( $html, 'academy.test' );
		$this->assertSame( '<p>Hello world</p>', $out['html'] );
		$this->assertFalse( $out['needs_webview'] );
	}

	public function test_iframes_become_placeholders_with_exact_sizes() {
		$html = '<p>Try it:</p><iframe src="https://alphaexam.site/embed/1" width="100%" height="900" frameborder="0"></iframe>'
			. '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315" allowfullscreen></iframe>';
		$out  = Html_Processor::process( $html, 'academy.test' );

		$this->assertStringNotContainsString( '<iframe', $out['html'] );
		$this->assertStringContainsString( '<div data-yallapp-embed="yallapp-embed-1"></div>', $out['html'] );
		$this->assertCount( 2, $out['embeds'] );

		$this->assertSame( 'other', $out['embeds'][0]['provider'] );
		$this->assertSame( '100%', $out['embeds'][0]['width'] );
		$this->assertSame( '900', $out['embeds'][0]['height'] );
		$this->assertNull( $out['embeds'][0]['aspect_ratio'] );
		$this->assertFalse( $out['embeds'][0]['allow_fullscreen'] );

		$this->assertSame( 'youtube', $out['embeds'][1]['provider'] );
		$this->assertEqualsWithDelta( 1.7778, $out['embeds'][1]['aspect_ratio'], 0.0001 );
		$this->assertTrue( $out['embeds'][1]['allow_fullscreen'] );
	}

	public function test_sizes_from_inline_style_and_protocol_relative_src() {
		$out = Html_Processor::process( '<iframe src="//player.vimeo.com/video/1" style="width: 640px; height:360px"></iframe>', 'academy.test' );
		$this->assertSame( 'https://player.vimeo.com/video/1', $out['embeds'][0]['src'] );
		$this->assertSame( 'vimeo', $out['embeds'][0]['provider'] );
		$this->assertSame( '640', $out['embeds'][0]['width'] );
		$this->assertSame( '360', $out['embeds'][0]['height'] );
	}

	public function test_drops_unsafe_or_empty_iframes() {
		$out = Html_Processor::process( '<iframe src="javascript:alert(1)"></iframe><iframe></iframe><p>ok</p>', 'academy.test' );
		$this->assertSame( array(), $out['embeds'] );
		$this->assertSame( '<p>ok</p>', $out['html'] );
	}

	public function test_scripts_and_handlers_need_web_view() {
		$this->assertTrue( Html_Processor::process( '<p>x</p><script>run()</script>', 'academy.test' )['needs_webview'] );
		$this->assertTrue( Html_Processor::process( '<button onclick="go()">Go</button>', 'academy.test' )['needs_webview'] );
		$this->assertTrue( Html_Processor::process( '<form><input></form>', 'academy.test' )['needs_webview'] );
		$this->assertFalse( Html_Processor::process( '<pre><code>print("hi")</code></pre>', 'academy.test' )['needs_webview'] );
	}

	public function test_provider_detection() {
		$this->assertSame( 'youtube', Html_Processor::provider( 'https://youtu.be/x', 'academy.test' ) );
		$this->assertSame( 'youtube', Html_Processor::provider( 'https://www.youtube-nocookie.com/embed/x', 'academy.test' ) );
		$this->assertSame( 'same_site', Html_Processor::provider( 'https://www.academy.test/tool', 'academy.test' ) );
		$this->assertSame( 'other', Html_Processor::provider( 'https://notyoutube.com/x', 'academy.test' ) );
	}

	public function test_keeps_utf8_text() {
		$out = Html_Processor::process( '<p>Ünite 1 — Merhaba</p>', 'academy.test' );
		$this->assertSame( '<p>Ünite 1 — Merhaba</p>', $out['html'] );
	}
}
