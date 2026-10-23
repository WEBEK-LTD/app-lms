<?php
/**
 * Page blocks with the site's own content filled in.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

use WP_Post;
use WP_Query;
use Yallapp\Content\Html_Processor;
use Yallapp\Plugin;
use Yallapp\Store\Catalog;

/**
 * Turns LayoutBlocks (docs/api/platform.yaml) into the app's Blocks (docs/api/openapi.yaml):
 * runs list queries against the LMS, WooCommerce and posts, fills categories and the
 * course in progress, cleans every field, and drops blocks the site can't serve or the
 * current user shouldn't see.
 */
class Block_Resolver {

	const SOURCES    = array( 'courses', 'products', 'services', 'posts', 'listings', 'articles' );
	const SCREENS    = array( 'courses', 'my_courses', 'search', 'favorites', 'messages', 'account', 'settings', 'notifications', 'cart', 'orders', 'services', 'appointments', 'articles', 'bookmarks' );
	const SORTS      = array( 'newest', 'popular', 'price_asc', 'price_desc' );
	const SLUG       = '/^[a-z0-9-]{1,64}$/';
	const ICON       = '/^[a-z0-9_]{1,64}$/';
	const MAX_ITEMS  = 30;
	const PRICE_POOL = 100;

	/**
	 * Plugin.
	 *
	 * @var Plugin
	 */
	private $plugin;

	/**
	 * The app's platform: android or ios.
	 *
	 * @var string
	 */
	private $platform = 'android';

	/**
	 * Current user, or 0.
	 *
	 * @var int
	 */
	private $user_id = 0;

	/**
	 * Constructor.
	 *
	 * @param Plugin $plugin Plugin.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Sets who the blocks and actions are for.
	 *
	 * @param string $platform android or ios.
	 * @param int    $user_id  Current user, or 0.
	 * @return void
	 */
	public function context( $platform, $user_id ) {
		$this->platform = $platform;
		$this->user_id  = (int) $user_id;
	}

	/**
	 * Blocks for one request.
	 *
	 * @param array[] $blocks   LayoutBlocks, already in the request's language.
	 * @param string  $platform android or ios.
	 * @param int     $user_id  Current user, or 0.
	 * @return array[] Blocks.
	 */
	public function resolve( array $blocks, $platform, $user_id ) {
		$this->context( $platform, $user_id );
		$out = array();
		foreach ( $blocks as $block ) {
			$resolved = is_array( $block ) ? $this->block( $block ) : null;
			if ( $resolved ) {
				$out[] = $resolved;
			}
		}
		return $out;
	}

	/**
	 * One block, or null when it is dropped.
	 *
	 * @param array $raw LayoutBlock.
	 * @return array|null
	 */
	private function block( array $raw ) {
		$id   = self::text( $raw['id'] ?? '' );
		$type = (string) ( $raw['type'] ?? '' );
		if ( null === $id || ! $this->visible( $raw['visibility'] ?? 'everyone' ) ) {
			return null;
		}
		$base = array(
			'id'    => substr( $id, 0, 64 ),
			'type'  => $type,
			'title' => self::text( $raw['title'] ?? null ),
		);
		$look = self::look( $raw['look'] ?? null );
		if ( null !== $look ) {
			$base['look'] = $look;
		}
		switch ( $type ) {
			case 'banner':
				$fields = $this->banner( $raw );
				break;
			case 'text':
				$fields = self::html_block( $raw );
				break;
			case 'image':
				$fields = $this->image( $raw );
				break;
			case 'video':
				$fields = self::video( $raw );
				break;
			case 'button':
				$fields = $this->button( $raw );
				break;
			case 'items':
				$fields = $this->items_block( $raw );
				break;
			case 'categories':
				$fields = $this->categories_block( $raw );
				break;
			case 'search':
				$fields = $this->search( $raw );
				break;
			case 'continue_learning':
				$fields = $this->continue_learning();
				break;
			case 'embed':
				$fields = self::embed( $raw );
				break;
			case 'spacer':
				$fields = array( 'size' => self::choice( $raw['size'] ?? null, array( 'small', 'medium', 'large' ), 'medium' ) );
				break;
			default:
				// 33 Slider, quick links, testimonials, ... (content the owner wrote); a block type
				// this plugin doesn't know yet can't be checked, so it isn't sent.
				$fields = Rich_Blocks::handles( $type ) ? Rich_Blocks::fields( $type, $raw, array( $this, 'action' ), time() ) : null;
		}
		return null === $fields ? null : array_merge( $base, $fields );
	}

	/**
	 * Whether the current user sees a block.
	 *
	 * @param mixed $visibility everyone, signed_in or signed_out.
	 * @return bool
	 */
	private function visible( $visibility ) {
		if ( 'signed_in' === $visibility ) {
			return $this->user_id > 0;
		}
		if ( 'signed_out' === $visibility ) {
			return 0 === $this->user_id;
		}
		return 'everyone' === $visibility;
	}

	/**
	 * Banner fields.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function banner( array $raw ) {
		$image = self::url( $raw['image_url'] ?? null );
		if ( null === $image ) {
			return null;
		}
		$fields = array(
			'image_url'  => $image,
			'heading'    => self::text( $raw['heading'] ?? null ),
			'subheading' => self::text( $raw['subheading'] ?? null ),
		);
		return $this->with_action( $fields, 'action', $raw['action'] ?? null );
	}

	/**
	 * Text fields: HTML cleaned like lesson HTML.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function html_block( array $raw ) {
		$html = self::html( $raw['html'] ?? '' );
		return '' === $html ? null : array( 'html' => $html );
	}

	/**
	 * Image fields.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function image( array $raw ) {
		$image = self::url( $raw['image_url'] ?? null );
		if ( null === $image ) {
			return null;
		}
		$ratio  = isset( $raw['aspect_ratio'] ) && is_numeric( $raw['aspect_ratio'] ) && (float) $raw['aspect_ratio'] > 0 ? round( (float) $raw['aspect_ratio'], 4 ) : null;
		$fields = array(
			'image_url'    => $image,
			'aspect_ratio' => $ratio,
		);
		return $this->with_action( $fields, 'action', $raw['action'] ?? null );
	}

	/**
	 * Video fields.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function video( array $raw ) {
		$url = self::url( $raw['url'] ?? null );
		if ( null === $url ) {
			return null;
		}
		return array(
			'url'        => $url,
			'poster_url' => self::url( $raw['poster_url'] ?? null ),
		);
	}

	/**
	 * Button fields. A button without a usable action is dropped.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function button( array $raw ) {
		$label  = self::text( $raw['label'] ?? null );
		$action = $this->action( $raw['action'] ?? null );
		if ( null === $label || null === $action ) {
			return null;
		}
		return array(
			'label'  => $label,
			'icon'   => isset( $raw['icon'] ) && is_string( $raw['icon'] ) && preg_match( self::ICON, $raw['icon'] ) ? $raw['icon'] : null,
			'style'  => self::choice( $raw['style'] ?? null, array( 'filled', 'outlined', 'text' ), 'filled' ),
			'action' => $action,
		);
	}

	/**
	 * Items fields: the query's results as Item cards. Dropped when the source can't be
	 * served or nothing matches.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function items_block( array $raw ) {
		$source = $raw['source'] ?? null;
		if ( ! $this->serves( $source ) ) {
			return null;
		}
		$items = $this->items( $source, isset( $raw['query'] ) && is_array( $raw['query'] ) ? $raw['query'] : array() );
		if ( ! $items ) {
			return null;
		}
		$fields = array(
			'source' => $source,
			'layout' => self::choice( $raw['layout'] ?? null, array( 'carousel', 'grid', 'list' ), 'carousel' ),
			'items'  => $items,
		);
		return $this->with_action( $fields, 'see_all', $raw['see_all'] ?? null );
	}

	/**
	 * Categories fields from the source. Dropped when there are none.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function categories_block( array $raw ) {
		$source = $raw['source'] ?? null;
		if ( ! $this->serves( $source ) ) {
			return null;
		}
		$categories = $this->categories( $source );
		if ( ! $categories ) {
			return null;
		}
		return array(
			'source'     => $source,
			'style'      => self::choice( $raw['style'] ?? null, array( 'chips', 'tiles' ), 'chips' ),
			'categories' => $categories,
		);
	}

	/**
	 * Search fields.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private function search( array $raw ) {
		$source = $raw['source'] ?? null;
		if ( ! $this->serves( $source ) ) {
			return null;
		}
		$placeholder = self::text( $raw['placeholder'] ?? null );
		return array(
			'source'      => $source,
			'placeholder' => null !== $placeholder ? $placeholder : __( 'Search', 'yallapp' ),
		);
	}

	/**
	 * Continue learning: the signed-in student's course in progress, else dropped.
	 *
	 * @return array|null
	 */
	private function continue_learning() {
		$lms = $this->plugin->lms();
		if ( ! $lms || ! $this->user_id ) {
			return null;
		}
		$mine = $lms->my_courses( $this->user_id, 'in_progress', 1, 1 );
		return empty( $mine['items'] ) ? null : array( 'course' => $mine['items'][0] );
	}

	/**
	 * Embed fields.
	 *
	 * @param array $raw Block.
	 * @return array|null
	 */
	private static function embed( array $raw ) {
		$url = self::url( $raw['url'] ?? null );
		if ( null === $url ) {
			return null;
		}
		$height = isset( $raw['height'] ) && is_numeric( $raw['height'] ) && (int) $raw['height'] > 0 ? (int) $raw['height'] : null;
		return array(
			'url'    => $url,
			'height' => $height,
		);
	}

	/**
	 * Whether the site can serve a list source.
	 *
	 * @param mixed $source ItemSource.
	 * @return bool
	 */
	public function serves( $source ) {
		if ( 'courses' === $source ) {
			return null !== $this->plugin->lms();
		}
		if ( 'products' === $source ) {
			return Catalog::available();
		}
		if ( 'services' === $source ) {
			return null !== $this->plugin->bookings();
		}
		// Listings live on the hosted API only. Articles are the site's posts, opened in the app.
		return 'posts' === $source || 'articles' === $source;
	}

	/**
	 * Runs an items query.
	 *
	 * @param string $source Source the site serves.
	 * @param array  $query  Query: ids, category_id, featured, sort, limit.
	 * @return array[] Item shapes.
	 */
	public function items( $source, array $query ) {
		$ids = array();
		foreach ( isset( $query['ids'] ) && is_array( $query['ids'] ) ? $query['ids'] : array() as $id ) {
			if ( is_scalar( $id ) && absint( $id ) ) {
				$ids[] = absint( $id );
			}
		}
		$query = array(
			'ids'         => array_slice( array_values( array_unique( $ids ) ), 0, self::MAX_ITEMS ),
			'category_id' => isset( $query['category_id'] ) && is_scalar( $query['category_id'] ) ? absint( $query['category_id'] ) : 0,
			'featured'    => ! empty( $query['featured'] ),
			'sort'        => self::choice( $query['sort'] ?? null, self::SORTS, 'newest' ),
			'limit'       => isset( $query['limit'] ) && is_numeric( $query['limit'] ) ? max( 1, min( self::MAX_ITEMS, (int) $query['limit'] ) ) : 10,
		);
		if ( 'courses' === $source ) {
			$items = $this->courses( $query );
		} elseif ( 'products' === $source ) {
			$items = $this->products( $query );
		} elseif ( 'services' === $source ) {
			$items = $this->services( $query );
		} elseif ( 'articles' === $source ) {
			$items = $this->articles( $query );
		} else {
			$items = $this->posts( $query );
		}
		return array_slice( $items, 0, $query['limit'] );
	}

	/**
	 * Courses from the LMS.
	 *
	 * @param array $query Normalized query.
	 * @return array[]
	 */
	private function courses( array $query ) {
		$lms  = $this->plugin->lms();
		$args = array(
			'page'     => 1,
			'per_page' => $query['limit'],
			'orderby'  => 'popular' === $query['sort'] ? 'popular' : 'newest',
		);
		if ( $query['ids'] ) {
			$args['ids']      = $query['ids'];
			$args['per_page'] = count( $query['ids'] );
		} else {
			if ( $query['featured'] ) {
				$featured = array_values( array_filter( array_map( 'absint', (array) $this->plugin->settings()->get( 'featured_course_ids' ) ) ) );
				if ( ! $featured ) {
					return array();
				}
				$args['ids']      = $featured;
				$args['per_page'] = count( $featured );
			}
			if ( $query['category_id'] ) {
				$args['category'] = $query['category_id'];
			}
			// The LMS adapters don't sort by price, so a larger first page is sorted here.
			if ( 'price_asc' === $query['sort'] || 'price_desc' === $query['sort'] ) {
				$args['per_page'] = max( $args['per_page'], self::PRICE_POOL );
			}
		}
		$courses = $lms->courses( $args, $this->user_id )['items'];
		if ( ! $query['ids'] && ( 'price_asc' === $query['sort'] || 'price_desc' === $query['sort'] ) ) {
			usort(
				$courses,
				static function ( $a, $b ) use ( $query ) {
					$diff = self::course_price( $a ) <=> self::course_price( $b );
					return 'price_desc' === $query['sort'] ? -$diff : $diff;
				}
			);
		}
		$wishlist = ! empty( $lms->features()['wishlist'] );
		$items    = array();
		foreach ( $courses as $course ) {
			$price = $course['price'] ?? array();
			$item  = array(
				'source'      => 'courses',
				'id'          => (string) $course['id'],
				'title'       => (string) $course['title'],
				'subtitle'    => ! empty( $course['instructor']['name'] ) ? (string) $course['instructor']['name'] : null,
				'image_url'   => $course['image_url'] ?? null,
				'price_label' => ! empty( $price['is_free'] ) ? __( 'Free', 'yallapp' ) : ( $price['formatted'] ?? null ),
				'badge'       => null,
			);
			if ( $wishlist ) {
				$item['favorited'] = ! empty( $course['wishlisted'] );
			}
			$item['action'] = array(
				'type'      => 'course',
				'course_id' => (int) $course['id'],
			);
			$items[]        = $item;
		}
		return $items;
	}

	/**
	 * A course's price for sorting: the sale price when there is one, 0 when free.
	 *
	 * @param array $course CourseSummary.
	 * @return float
	 */
	private static function course_price( array $course ) {
		$price = $course['price'] ?? array();
		if ( ! empty( $price['is_free'] ) ) {
			return 0.0;
		}
		return (float) ( $price['sale_amount'] ?? $price['amount'] ?? 0 );
	}

	/**
	 * Products from WooCommerce.
	 *
	 * @param array $query Normalized query.
	 * @return array[]
	 */
	private function products( array $query ) {
		$args = array(
			'page'     => 1,
			'per_page' => $query['limit'],
			'orderby'  => $query['sort'],
		);
		if ( $query['ids'] ) {
			$args['ids']      = $query['ids'];
			$args['per_page'] = count( $query['ids'] );
		} else {
			$args['featured'] = $query['featured'];
			$args['category'] = $query['category_id'];
		}
		$items = array();
		foreach ( ( new Catalog() )->products( $args )['items'] as $product ) {
			$badge = null;
			if ( 'out_of_stock' === $product['stock_status'] ) {
				$badge = __( 'Out of stock', 'yallapp' );
			} elseif ( ! empty( $product['price']['on_sale'] ) ) {
				$badge = __( 'Sale', 'yallapp' );
			}
			$items[] = array(
				'source'      => 'products',
				'id'          => (string) $product['id'],
				'title'       => (string) $product['name'],
				'subtitle'    => null,
				'image_url'   => $product['image_url'],
				'price_label' => $product['price']['formatted'],
				'badge'       => $badge,
				'action'      => array(
					'type' => 'item',
					'item' => array(
						'source' => 'products',
						'id'     => (string) $product['id'],
					),
				),
			);
		}
		return $items;
	}

	/**
	 * Services from the booking plugin. Booking plugins have no featured services or
	 * popularity, so those keep the plugin's own order; prices are sorted here.
	 *
	 * @param array $query Normalized query.
	 * @return array[]
	 */
	private function services( array $query ) {
		$all      = $query['ids'] || 'price_asc' === $query['sort'] || 'price_desc' === $query['sort'];
		$services = $this->plugin->bookings()->services(
			array(
				'page'     => 1,
				'per_page' => $all ? self::PRICE_POOL : $query['limit'],
				'search'   => '',
				'category' => $query['ids'] ? 0 : $query['category_id'],
			)
		)['items'];
		if ( $query['ids'] ) {
			$by_id = array();
			foreach ( $services as $service ) {
				$by_id[ (int) $service['id'] ] = $service;
			}
			$services = array();
			foreach ( $query['ids'] as $id ) {
				if ( isset( $by_id[ $id ] ) ) {
					$services[] = $by_id[ $id ];
				}
			}
		} elseif ( $all ) {
			usort(
				$services,
				static function ( $a, $b ) use ( $query ) {
					$diff = (float) $a['price']['amount'] <=> (float) $b['price']['amount'];
					return 'price_desc' === $query['sort'] ? -$diff : $diff;
				}
			);
		}
		$items = array();
		foreach ( $services as $service ) {
			$items[] = array(
				'source'      => 'services',
				'id'          => (string) $service['id'],
				'title'       => (string) $service['name'],
				'subtitle'    => self::duration( (int) $service['duration_minutes'] ),
				'image_url'   => $service['image_url'] ?? null,
				'price_label' => ! empty( $service['price']['free'] ) ? __( 'Free', 'yallapp' ) : (string) $service['price']['formatted'],
				'badge'       => null,
				'action'      => array(
					'type' => 'item',
					'item' => array(
						'source' => 'services',
						'id'     => (string) $service['id'],
					),
				),
			);
		}
		return $items;
	}

	/**
	 * A duration as the app shows it, e.g. "45 min" or "1 h 30 min".
	 *
	 * @param int $minutes Minutes.
	 * @return string
	 */
	public static function duration( $minutes ) {
		$hours = intdiv( max( 0, $minutes ), 60 );
		$rest  = max( 0, $minutes ) % 60;
		if ( ! $hours ) {
			/* translators: %d: minutes. */
			return sprintf( __( '%d min', 'yallapp' ), $rest );
		}
		/* translators: %d: hours. */
		$text = sprintf( __( '%d h', 'yallapp' ), $hours );
		/* translators: 1: hours and minutes so far, 2: minutes. */
		return $rest ? sprintf( __( '%1$s %2$d min', 'yallapp' ), $text, $rest ) : $text;
	}

	/**
	 * Articles (News & blog apps): the site's posts as cards that open in the app. Featured
	 * means sticky.
	 *
	 * @param array $query Normalized query.
	 * @return array[]
	 */
	private function articles( array $query ) {
		$result = $this->plugin->articles()->articles(
			array(
				'per_page' => $query['ids'] ? count( $query['ids'] ) : $query['limit'],
				'ids'      => $query['ids'],
				'featured' => $query['featured'],
				'category' => $query['category_id'],
				'orderby'  => 'popular' === $query['sort'] ? 'popular' : 'newest',
			)
		);
		$items  = array();
		foreach ( $result['items'] as $article ) {
			$items[] = array(
				'source'      => 'articles',
				'id'          => $article['id'],
				'title'       => $article['title'],
				'subtitle'    => ! empty( $article['categories'] ) ? $article['categories'][0]['name'] : $article['author'],
				'image_url'   => $article['image_url'],
				'price_label' => null,
				'badge'       => null,
				'action'      => array(
					'type' => 'item',
					'item' => array(
						'source' => 'articles',
						'id'     => $article['id'],
					),
				),
			);
		}
		return $items;
	}

	/**
	 * WordPress posts. Featured means sticky; posts open on the website.
	 *
	 * @param array $query Normalized query.
	 * @return array[]
	 */
	private function posts( array $query ) {
		$args = array(
			'post_type'           => 'post',
			'post_status'         => 'publish',
			'has_password'        => false,
			'ignore_sticky_posts' => true,
			'no_found_rows'       => true,
			'posts_per_page'      => $query['limit'],
		);
		if ( $query['ids'] ) {
			$args['post__in']       = $query['ids'];
			$args['orderby']        = 'post__in';
			$args['posts_per_page'] = count( $query['ids'] );
		} else {
			if ( $query['featured'] ) {
				$sticky = array_values( array_filter( array_map( 'absint', (array) get_option( 'sticky_posts', array() ) ) ) );
				if ( ! $sticky ) {
					return array();
				}
				$args['post__in'] = $sticky;
			}
			if ( $query['category_id'] ) {
				$args['cat'] = $query['category_id'];
			}
			$args['orderby'] = 'popular' === $query['sort'] ? array(
				'comment_count' => 'DESC',
				'date'          => 'DESC',
			) : array( 'date' => 'DESC' );
		}
		$items = array();
		foreach ( ( new WP_Query( $args ) )->posts as $post ) {
			if ( ! $post instanceof WP_Post ) {
				continue;
			}
			$image   = get_the_post_thumbnail_url( $post, 'medium_large' );
			$items[] = array(
				'source'      => 'posts',
				'id'          => (string) $post->ID,
				'title'       => html_entity_decode( wp_strip_all_tags( get_the_title( $post ) ), ENT_QUOTES, 'UTF-8' ),
				'subtitle'    => (string) get_the_date( '', $post ),
				'image_url'   => $image ? $image : null,
				'price_label' => null,
				'badge'       => null,
				'action'      => array(
					'type'    => 'url',
					'url'     => (string) get_permalink( $post ),
					'open_in' => 'in_app',
				),
			);
		}
		return $items;
	}

	/**
	 * Categories of a source, as Category shapes.
	 *
	 * @param string $source Source the site serves.
	 * @return array[]
	 */
	public function categories( $source ) {
		if ( 'courses' === $source ) {
			$terms = $this->plugin->lms()->categories();
		} elseif ( 'services' === $source ) {
			$terms = $this->plugin->bookings()->categories();
		} elseif ( 'articles' === $source ) {
			// Counted like the app's lists: published posts only.
			$terms = $this->plugin->articles()->categories();
		} elseif ( 'products' === $source ) {
			$terms = array_filter(
				( new Catalog() )->categories(),
				static function ( $category ) {
					return null === $category['parent_id'];
				}
			);
		} else {
			$terms = array();
			$found = get_terms(
				array(
					'taxonomy'   => 'category',
					'hide_empty' => true,
					// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A few IDs.
					'exclude'    => array( (int) get_option( 'default_category' ) ),
				)
			);
			foreach ( is_array( $found ) ? $found : array() as $term ) {
				$terms[] = array(
					'id'    => (int) $term->term_id,
					'name'  => html_entity_decode( (string) $term->name, ENT_QUOTES, 'UTF-8' ),
					'count' => (int) $term->count,
				);
			}
		}
		$categories = array();
		foreach ( $terms as $term ) {
			$categories[] = array(
				'id'    => (int) $term['id'],
				'name'  => (string) $term['name'],
				'count' => (int) $term['count'],
			);
		}
		return $categories;
	}

	/**
	 * An Action the app can follow on this site, or null.
	 *
	 * @param mixed $raw Action from the layout.
	 * @return array|null
	 */
	public function action( $raw ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$type = $raw['type'] ?? null;
		if ( 'page' === $type ) {
			$slug = $raw['page_slug'] ?? '';
			return is_string( $slug ) && preg_match( self::SLUG, $slug ) ? array(
				'type'      => 'page',
				'page_slug' => $slug,
			) : null;
		}
		if ( 'screen' === $type ) {
			return in_array( $raw['screen'] ?? null, self::SCREENS, true ) ? array(
				'type'   => 'screen',
				'screen' => $raw['screen'],
			) : null;
		}
		if ( 'course' === $type ) {
			$course = isset( $raw['course_id'] ) && is_numeric( $raw['course_id'] ) ? absint( $raw['course_id'] ) : 0;
			return $course && $this->plugin->lms() ? array(
				'type'      => 'course',
				'course_id' => $course,
			) : null;
		}
		if ( 'item' === $type ) {
			$item = isset( $raw['item'] ) && is_array( $raw['item'] ) ? $raw['item'] : array();
			$id   = isset( $item['id'] ) && is_scalar( $item['id'] ) ? sanitize_text_field( (string) $item['id'] ) : '';
			return '' !== $id && $this->serves( $item['source'] ?? null ) ? array(
				'type' => 'item',
				'item' => array(
					'source' => $item['source'],
					'id'     => $id,
				),
			) : null;
		}
		if ( 'url' === $type ) {
			$url = self::url( $raw['url'] ?? null );
			if ( null === $url || ( 'ios' === $this->platform && $this->is_purchase_url( $url ) ) ) {
				return null;
			}
			return array(
				'type'    => 'url',
				'url'     => $url,
				'open_in' => self::choice( $raw['open_in'] ?? null, array( 'in_app', 'browser' ), 'in_app' ),
			);
		}
		return null;
	}

	/**
	 * Adds an optional action field when it is usable.
	 *
	 * @param array  $fields Fields so far.
	 * @param string $key    Field name.
	 * @param mixed  $raw    Action from the layout.
	 * @return array
	 */
	private function with_action( array $fields, $key, $raw ) {
		$action = $this->action( $raw );
		if ( $action ) {
			$fields[ $key ] = $action;
		}
		return $fields;
	}

	/**
	 * Whether a link opens the site's cart or checkout. iOS apps never link to purchases.
	 *
	 * @param string $url URL.
	 * @return bool
	 */
	private function is_purchase_url( $url ) {
		if ( false !== strpos( $url, 'add-to-cart=' ) ) {
			return true;
		}
		if ( ! Catalog::available() || ! function_exists( 'wc_get_checkout_url' ) ) {
			return false;
		}
		$path = untrailingslashit( (string) wp_parse_url( $url, PHP_URL_PATH ) );
		foreach ( array( wc_get_checkout_url(), wc_get_cart_url() ) as $page ) {
			$page_path = untrailingslashit( (string) wp_parse_url( $page, PHP_URL_PATH ) );
			if ( '' !== $page_path && 0 === strpos( $path, $page_path ) && wp_parse_url( $url, PHP_URL_HOST ) === wp_parse_url( $page, PHP_URL_HOST ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Lesson-style clean HTML: tags allowed in posts, then the lesson clean-up.
	 *
	 * @param mixed $html HTML from the layout.
	 * @return string
	 */
	public static function html( $html ) {
		if ( ! is_string( $html ) || '' === trim( $html ) ) {
			return '';
		}
		$processed = Html_Processor::process( wp_kses_post( $html ), (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		return '' === trim( wp_strip_all_tags( $processed['html'] ) ) && false === stripos( $processed['html'], '<img' ) ? '' : $processed['html'];
	}

	/**
	 * A single-line text, or null when empty.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	public static function text( $value ) {
		if ( ! is_scalar( $value ) ) {
			return null;
		}
		$text = sanitize_text_field( (string) $value );
		return '' === $text ? null : $text;
	}

	/**
	 * An http or https URL, or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	public static function url( $value ) {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}
		$url = esc_url_raw( trim( $value ), array( 'http', 'https' ) );
		return '' === $url ? null : $url;
	}

	/**
	 * 82.5 A block's look (background and spacing), or null for none and the usual spacing.
	 *
	 * @param mixed $value BlockLook.
	 * @return array|null
	 */
	public static function look( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$look = array(
			'background' => self::choice( $value['background'] ?? null, array( 'none', 'tint', 'primary', 'secondary', 'surface' ), 'none' ),
			'spacing'    => self::choice( $value['spacing'] ?? null, array( 'none', 'small', 'medium', 'large' ), 'medium' ),
		);
		return 'none' === $look['background'] && 'medium' === $look['spacing'] ? null : $look;
	}

	/**
	 * 82.5 The owner's own icon: an https URL, or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	public static function icon_url( $value ) {
		$url = self::url( $value );
		return null !== $url && 0 === strpos( $url, 'https://' ) ? $url : null;
	}

	/**
	 * One of the allowed values, or the default.
	 *
	 * @param mixed    $value    Value.
	 * @param string[] $allowed  Allowed values.
	 * @param string   $fallback Default.
	 * @return string
	 */
	private static function choice( $value, array $allowed, $fallback ) {
		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}
}
