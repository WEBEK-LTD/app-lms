<?php
/**
 * News & blog apps: which posts are articles, their excerpts, Config.news, the new-post
 * notification and the default pages.
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\License\License_Client;
use Yallapp\News\Articles;
use Yallapp\Pages\Default_Layout;
use Yallapp\Push\Push_Service;
use Yallapp\Rest\News_Controller;

class NewsTest extends TestCase {

	public function test_only_published_public_posts_newest_first() {
		$query = Articles::query_args( array() );
		$this->assertSame( 'post', $query['post_type'] );
		$this->assertSame( 'publish', $query['post_status'] );
		$this->assertFalse( $query['has_password'] );
		$this->assertTrue( $query['ignore_sticky_posts'] );
		$this->assertSame( 20, $query['posts_per_page'] );
		$this->assertSame( 1, $query['paged'] );
		$this->assertSame(
			array(
				'date' => 'DESC',
				'ID'   => 'DESC',
			),
			$query['orderby']
		);
		$this->assertSame( 50, Articles::query_args( array( 'per_page' => 500 ) )['posts_per_page'] );
	}

	public function test_filters_search_and_order() {
		$query = Articles::query_args(
			array(
				'category' => '7',
				'search'   => ' ferry ',
				'orderby'  => 'popular',
				'page'     => 3,
			)
		);
		$this->assertSame( 7, $query['cat'] );
		$this->assertSame( 'ferry', $query['s'] );
		$this->assertSame( 3, $query['paged'] );
		$this->assertSame( 'DESC', $query['orderby']['comment_count'] );
	}

	public function test_hand_picked_ids_keep_their_order_and_top_stories_are_sticky_posts() {
		$query = Articles::query_args( array( 'ids' => array( '12', 4, 'x', 12, 0, -3 ) ) );
		$this->assertSame( array( 12, 4 ), $query['post__in'] );
		$this->assertSame( 'post__in', $query['orderby'] );
		$this->assertSame( 'publish', $query['post_status'] );
		$this->assertCount( 30, Articles::query_args( array( 'ids' => range( 1, 40 ) ) )['post__in'] );

		$this->assertNull( Articles::query_args( array( 'featured' => true ) ) );
		$featured = Articles::query_args(
			array(
				'featured' => true,
				'sticky'   => array( 5, '9' ),
			)
		);
		$this->assertSame( array( 5, 9 ), $featured['post__in'] );
	}

	public function test_excerpts_are_short_plain_text() {
		$this->assertSame( 'The summary.', Articles::excerpt_of( 'The summary.', '<p>Body</p>' ) );
		$this->assertSame(
			'Boats & ferries every 40 minutes.',
			Articles::excerpt_of( '', '<!-- wp:paragraph --><p>Boats &amp; ferries [gallery ids="1,2"] every <b>40</b> minutes.</p><!-- /wp:paragraph -->' )
		);
		$this->assertNull( Articles::excerpt_of( '', '<p> </p>' ) );
		$long = Articles::excerpt_of( '', str_repeat( 'word ', 100 ), 30 );
		$this->assertSame( 'word word word word word word…', $long );
	}

	public function test_config_news() {
		$this->assertSame(
			array(
				'show_author'        => true,
				'show_dates'         => false,
				'breaking_news_push' => true,
			),
			News_Controller::config_of( 1, 0, 'yes' )
		);
	}

	public function test_the_new_post_notification_fits_a_phone() {
		$this->assertSame(
			array(
				'title' => 'Night ferries return',
				'body'  => 'Every 40 minutes.',
			),
			Push_Service::post_notification( 'Night ferries return', 'Every 40 minutes.' )
		);
		$long = Push_Service::post_notification( str_repeat( 'T', 80 ), '' );
		$this->assertSame( 65, mb_strlen( $long['title'] ) );
		$this->assertSame( 80, mb_strlen( $long['body'] ) );
		$this->assertSame( 240, mb_strlen( Push_Service::post_notification( 'Title', str_repeat( 'b', 300 ) )['body'] ) );
	}

	public function test_news_apps_get_their_pages_before_any_are_published() {
		$this->assertSame(
			array(
				'app_type' => 'news',
				'vertical' => null,
			),
			License_Client::app_of( array( 'app_type' => 'news' ) )
		);
		$blocks = Default_Layout::news_blocks();
		$this->assertSame( array( 'search', 'top-stories', 'categories', 'latest' ), array_column( $blocks, 'id' ) );
		foreach ( $blocks as $block ) {
			$this->assertSame( 'articles', $block['source'] );
		}
		$this->assertSame(
			array(
				'sort'     => 'newest',
				'limit'    => 5,
				'featured' => true,
			),
			$blocks[1]['query']
		);
		$this->assertSame( 'list', $blocks[3]['layout'] );
		$this->assertSame(
			array(
				'type'   => 'screen',
				'screen' => 'articles',
			),
			$blocks[3]['see_all']
		);
	}
}
