<?php
/**
 * 222.3 (164.7) A WordPress app's Studio list of products is never an empty section, as the hosted
 * pages do (platform/web/tests/unit/phase164-empty-lists.test.ts).
 *
 * @package Yallapp
 */

use PHPUnit\Framework\TestCase;
use Yallapp\Pages\List_Headings;

class ListHeadings222Test extends TestCase {

	/**
	 * Leqaa's picks page as stored: a title row ("Picked for you" and "Shop all") named as its list
	 * of featured products, what was seen lately, and a column of a title and a list.
	 *
	 * @return array
	 */
	private static function page() {
		return array(
			'id'       => 'root',
			'type'     => 'column',
			'children' => array(
				array(
					'id'       => 'picked-title',
					'type'     => 'row',
					'name'     => 'Picked for you',
					'children' => array(
						array( 'id' => 'picked-words', 'type' => 'text', 'text' => 'Picked for you' ),
						array( 'id' => 'picked-all', 'type' => 'button', 'text' => 'Shop all' ),
					),
				),
				array(
					'id'     => 'picked',
					'type'   => 'items',
					'name'   => 'Picked for you',
					'source' => 'products',
					'query'  => array( 'featured' => true ),
				),
				array(
					'id'       => 'loved',
					'type'     => 'column',
					'children' => array(
						array( 'id' => 'loved-title', 'type' => 'text', 'text' => 'Loved most' ),
						array( 'id' => 'loved-list', 'type' => 'items', 'source' => 'products' ),
					),
				),
				array( 'id' => 'note', 'type' => 'text', 'text' => 'Free delivery today' ),
				array( 'id' => 'banner', 'type' => 'image', 'image_url' => 'https://shop.example/b.jpg' ),
			),
		);
	}

	public function test_each_lists_title_is_found() {
		$this->assertSame(
			array(
				'picked-title' => 'picked',
				'loved-title'  => 'loved-list',
			),
			List_Headings::of( self::page() )
		);
	}

	public function test_words_before_a_list_named_otherwise_are_not_its_title() {
		$page                            = self::page();
		$page['children'][0]['name']     = 'Our promise';
		$page['children'][3]             = array( 'id' => 'note', 'type' => 'image' );
		$this->assertSame( array( 'loved-title' => 'loved-list' ), List_Headings::of( $page ) );
		// Something more than words is never a title.
		$page                            = self::page();
		$page['children'][0]['children'][] = array( 'id' => 'pic', 'type' => 'image' );
		$this->assertArrayNotHasKey( 'picked-title', List_Headings::of( $page ) );
	}

	public function test_a_kept_list_keeps_its_title_marked_for_the_app() {
		$served = List_Headings::apply( self::page(), List_Headings::of( self::page() ) );
		$this->assertSame( 'picked', $served['children'][0]['heads'] );
		$this->assertSame( 'loved-list', $served['children'][2]['children'][0]['heads'] );
		$this->assertArrayNotHasKey( 'heads', $served['children'][3] );
	}

	public function test_a_list_left_out_takes_its_title_and_an_emptied_column_with_it() {
		$headings = List_Headings::of( self::page() );
		$served   = self::page();
		// The plugin left out both lists (nothing to show).
		unset( $served['children'][1] );
		$served['children'][2]['children'] = array( $served['children'][2]['children'][0] );
		$served['children']                = array_values( $served['children'] );
		$served                            = List_Headings::apply( $served, $headings );
		$this->assertSame( array( 'note', 'banner' ), array_column( $served['children'], 'id' ) );
	}

	public function test_the_pages_own_element_stays_when_everything_goes() {
		$page = array(
			'id'       => 'root',
			'type'     => 'column',
			'children' => array(
				array( 'id' => 't', 'type' => 'text', 'name' => 'Sale' ),
				array( 'id' => 'l', 'type' => 'items', 'name' => 'Sale' ),
			),
		);
		$headings = List_Headings::of( $page );
		$this->assertSame( array( 't' => 'l' ), $headings );
		$served = List_Headings::apply(
			array(
				'id'       => 'root',
				'type'     => 'column',
				'children' => array( $page['children'][0] ),
			),
			$headings
		);
		$this->assertSame( array(), $served['children'] );
		$this->assertSame( 'root', $served['id'] );
	}

	public function test_a_page_without_lists_is_served_as_it_is() {
		$page = array(
			'id'       => 'root',
			'type'     => 'column',
			'children' => array( array( 'id' => 'a', 'type' => 'text' ) ),
		);
		$this->assertSame( $page, List_Headings::apply( $page, List_Headings::of( $page ) ) );
	}

	public function test_an_empty_products_list_falls_back_to_the_best_sellers_then_the_newest() {
		$query = array(
			'ids'         => array(),
			'category_id' => 0,
			'featured'    => true,
			'on_sale'     => false,
			'sort'        => 'newest',
			'limit'       => 6,
		);
		$tries = List_Headings::product_fallbacks( $query );
		$this->assertSame( array( 'popular', 'newest' ), array_column( $tries, 'sort' ) );
		foreach ( $tries as $try ) {
			$this->assertFalse( $try['featured'] );
			$this->assertSame( 0, $try['category_id'] );
			$this->assertSame( array(), $try['ids'] );
			$this->assertSame( 6, $try['limit'] );
		}
		// A category or hand-picked products: the same.
		$this->assertCount( 2, List_Headings::product_fallbacks( array_merge( $query, array( 'featured' => false, 'category_id' => 12 ) ) ) );
		$this->assertCount( 2, List_Headings::product_fallbacks( array_merge( $query, array( 'featured' => false, 'ids' => array( 4, 5 ) ) ) ) );
		// Every product already: only the order not tried.
		$every = array_merge( $query, array( 'featured' => false ) );
		$this->assertSame( array( 'popular' ), array_column( List_Headings::product_fallbacks( $every ), 'sort' ) );
		$this->assertSame( array( 'newest' ), array_column( List_Headings::product_fallbacks( array_merge( $every, array( 'sort' => 'popular' ) ) ), 'sort' ) );
		// Products on sale: none, the list goes while nothing is on sale.
		$this->assertSame( array(), List_Headings::product_fallbacks( array_merge( $query, array( 'on_sale' => true ) ) ) );
	}
}
