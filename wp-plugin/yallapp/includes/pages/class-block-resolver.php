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

	const SOURCES = array( 'courses', 'products', 'services', 'posts', 'listings', 'articles' );
	/**
	 * 120.4 The screens opened from the tabs a Studio page can be drawn around, on a site's app.
	 */
	const INNER_SCREENS = array( 'edit_profile', 'devices', 'change_password', 'chat_conversation', 'course', 'bundle', 'lesson', 'quiz', 'assignment', 'live', 'question', 'learning_paths', 'learning_path', 'leaderboard', 'course_notes', 'lesson_discussion', 'teacher_profile', 'teach_apply', 'certificates', 'quiz_results', 'live_classes', 'achievements', 'downloads' );
	const SCREENS       = array( 'courses', 'my_courses', 'search', 'favorites', 'messages', 'account', 'settings', 'notifications', 'cart', 'orders', 'services', 'appointments', 'articles', 'bookmarks' );
	const SORTS         = array( 'newest', 'popular', 'price_asc', 'price_desc' );
	const SLUG          = '/^[a-z0-9-]{1,64}$/';
	const ICON          = '/^[a-z0-9_]{1,64}$/';
	const MAX_ITEMS     = 30;
	const PRICE_POOL    = 100;

	/**
	 * 82.5 BlockLook's fields and their values, the default first (99.3 align, text_size,
	 * corners and image_fit).
	 */
	const LOOK = array(
		'background' => array( 'none', 'tint', 'primary', 'secondary', 'surface' ),
		'spacing'    => array( 'medium', 'none', 'small', 'large' ),
		'align'      => array( 'start', 'center', 'end' ),
		'text_size'  => array( 'medium', 'small', 'large' ),
		'corners'    => array( 'app', 'sharp', 'round' ),
		'image_fit'  => array( 'cover', 'contain' ),
	);

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
	 * 99.3 The language the page is served in, for blocks shown in some languages only.
	 *
	 * @var string
	 */
	private $language = '';

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
	 * @param string $language 99.3 The language the page is served in.
	 * @return void
	 */
	public function context( $platform, $user_id, $language = '' ) {
		$this->platform = $platform;
		$this->user_id  = (int) $user_id;
		$this->language = (string) $language;
	}

	/**
	 * Blocks for one request.
	 *
	 * @param array[] $blocks   LayoutBlocks, already in the request's language.
	 * @param string  $platform android or ios.
	 * @param int     $user_id  Current user, or 0.
	 * @param string  $language 99.3 The language the page is served in.
	 * @return array[] Blocks.
	 */
	public function resolve( array $blocks, $platform, $user_id, $language = '' ) {
		$this->context( $platform, $user_id, $language );
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
		// 99.3 The owner's dates, platforms and languages; `show` itself never reaches the app.
		if ( ! self::shows( $raw['show'] ?? null, $this->platform, $this->language, time() ) ) {
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
		return self::visible_to( $visibility, $this->user_id );
	}

	/**
	 * Whether a user sees a block with this visibility (99.4 also for a form's answers). Pure.
	 *
	 * @param mixed $visibility everyone, signed_in or signed_out.
	 * @param int   $user_id    The user, or 0.
	 * @return bool
	 */
	public static function visible_to( $visibility, $user_id ) {
		if ( 'signed_in' === $visibility ) {
			return $user_id > 0;
		}
		if ( 'signed_out' === $visibility ) {
			return 0 === (int) $user_id;
		}
		return 'everyone' === $visibility;
	}

	/**
	 * 99.3 Whether a block's `show` rules let it on the page: within `from` and `until` (a
	 * date that can't be read sets no limit), on one of `platforms` and in one of `languages`
	 * (by the language's main code, `ar` for `ar-EG`). Missing or null rules let it on. Pure.
	 *
	 * @param mixed  $show     LayoutBlock.show.
	 * @param string $platform android or ios.
	 * @param string $language The language the page is served in.
	 * @param int    $now      The time.
	 * @return bool
	 */
	public static function shows( $show, $platform, $language, $now ) {
		if ( ! is_array( $show ) ) {
			return true;
		}
		$from  = isset( $show['from'] ) && is_string( $show['from'] ) ? strtotime( $show['from'] ) : false;
		$until = isset( $show['until'] ) && is_string( $show['until'] ) ? strtotime( $show['until'] ) : false;
		if ( ( false !== $from && $now < $from ) || ( false !== $until && $now > $until ) ) {
			return false;
		}
		if ( isset( $show['platforms'] ) && is_array( $show['platforms'] ) && ! in_array( (string) $platform, $show['platforms'], true ) ) {
			return false;
		}
		if ( isset( $show['languages'] ) && is_array( $show['languages'] ) ) {
			$code = self::language_code( $language );
			return '' !== $code && in_array( $code, array_map( array( __CLASS__, 'language_code' ), $show['languages'] ), true );
		}
		return true;
	}

	/**
	 * 99.3 A language's main code in lower case (`ar` for `ar-EG`), or ''.
	 *
	 * @param mixed $value Language tag.
	 * @return string
	 */
	private static function language_code( $value ) {
		return is_string( $value ) ? strtolower( trim( (string) strtok( $value, '-_' ) ) ) : '';
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
	 * @param array  $query  Query: ids, category_id, featured, on_sale (112.4), sort, limit.
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
			// 112.4 Products on sale only.
			'on_sale'     => ! empty( $query['on_sale'] ),
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
			// 128.8 Its rating, for a card's `rating` element.
			if ( isset( $course['rating'] ) && is_numeric( $course['rating'] ) && $course['rating'] > 0 ) {
				$item['rating'] = round( (float) $course['rating'], 1 );
			}
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
			$args['on_sale']  = ! empty( $query['on_sale'] );
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
			$category = array(
				'id'    => (int) $term['id'],
				'name'  => (string) $term['name'],
				'count' => (int) $term['count'],
			);
			// 112.4 A product category's picture, for categories shown as pictures.
			if ( array_key_exists( 'image_url', $term ) ) {
				$category['image_url'] = is_string( $term['image_url'] ) ? $term['image_url'] : null;
			}
			$categories[] = $category;
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
			$open_in = self::choice( $raw['open_in'] ?? null, array( 'in_app', 'browser' ), 'in_app' );
			$action  = array(
				'type'    => 'url',
				'url'     => $url,
				'open_in' => $open_in,
			);
			// 122 How the page shows in the app: its site's header and footer hidden, its links kept in.
			$web = 'in_app' === $open_in ? self::web_look( $raw['web'] ?? null ) : null;
			if ( $web ) {
				$action['web'] = $web;
			}
			return $action;
		}
		return null;
	}

	/**
	 * 122 `Action.web`: what is set, the selectors checked; null for the page as it is.
	 *
	 * @param mixed $raw The layout's.
	 * @return array|null
	 */
	public static function web_look( $raw ) {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$out = array();
		foreach ( array( 'hide_header', 'hide_footer', 'links_inside' ) as $key ) {
			if ( true === ( $raw[ $key ] ?? null ) ) {
				$out[ $key ] = true;
			}
		}
		$hide = isset( $raw['hide'] ) && is_string( $raw['hide'] ) ? trim( $raw['hide'] ) : '';
		if ( '' !== $hide && preg_match( '/^[A-Za-z0-9\s.#_\-:,>+~*\[\]="\'()^$|]{1,300}$/', $hide ) ) {
			$out['hide'] = $hide;
		}
		return $out ? $out : null;
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
	 * 103R Elements served of one Studio page so far, against `STUDIO_MAX_NODES`.
	 *
	 * @var int
	 */
	private $studio_nodes = 0;

	/**
	 * 103R At most this many elements in a Studio page, and this deep.
	 */
	const STUDIO_MAX_NODES = 600;
	const STUDIO_MAX_DEPTH = 12;

	/**
	 * 103R The element types of a Studio page, and those that hold others; 128.10 the covers
	 * (a photo hero, a map header) and the live elements (an order on its way, the school day,
	 * a shipment or ride, a greeting), which the app draws from the person's own data and
	 * leaves out when it has none.
	 */
	const STUDIO_TYPES  = array( 'row', 'column', 'stack', 'grid', 'slider', 'spacer', 'accordion', 'tabs', 'text', 'image', 'button', 'icon', 'items', 'categories', 'video', 'form', 'map', 'ratings', 'search', 'divider', 'countdown', 'bullets', 'coupon', 'learning', 'live_status', 'school', 'photo_hero', 'map_header', 'tracking', 'greeting' );
	const STUDIO_LAYOUT = array( 'row', 'column', 'stack', 'grid', 'slider', 'accordion', 'tabs', 'photo_hero', 'map_header' );

	/**
	 * 103R A Studio page (`StudioPage`) for one request: its header and its tree of elements
	 * in the request's language, with known fields only; lists and categories filled from the
	 * site (an element whose source the site can't serve is left out), and taps the app may
	 * follow. Null when its body can't be served.
	 *
	 * @param mixed  $raw      The stored page's `studio`.
	 * @param string $platform android or ios.
	 * @param int    $user_id  Current user, or 0.
	 * @param string $language The language the page is served in.
	 * @return array|null
	 */
	public function studio( $raw, $platform, $user_id, $language = '' ) {
		if ( ! is_array( $raw ) || ! is_array( $raw['body'] ?? null ) ) {
			return null;
		}
		$this->context( $platform, $user_id, $language );
		$this->studio_nodes = 0;
		$body               = $this->studio_node( $raw['body'], 0, $language );
		if ( null === $body ) {
			return null;
		}
		$page = array(
			'header' => is_array( $raw['header'] ?? null ) ? $this->studio_header( Translator::apply( $raw['header'], $language ) ) : null,
			'body'   => $body,
		);
		foreach ( array( 'background', 'dark_background' ) as $field ) {
			$page[ $field ] = self::hex( $raw[ $field ] ?? null );
		}
		$page['show_tabs'] = ! isset( $raw['show_tabs'] ) || false !== $raw['show_tabs'];
		// 120 The app's own screen drawn under the page's elements; 120.4 also one opened from the tabs.
		if ( in_array( $raw['screen'] ?? null, self::SCREENS, true ) || in_array( $raw['screen'] ?? null, self::INNER_SCREENS, true ) ) {
			$page['screen'] = $raw['screen'];
		}
		return $page;
	}

	/**
	 * 103R A StudioHeader, or null.
	 *
	 * @param array $raw Header, in the request's language.
	 * @return array|null
	 */
	private function studio_header( array $raw ) {
		$type = $raw['type'] ?? null;
		// 123 `greeting`: today's date over a greeting with the person's first name.
		if ( ! in_array( $type, array( 'logo_center', 'title_search', 'logo_actions', 'transparent', 'title', 'greeting' ), true ) ) {
			return null;
		}
		$buttons = array();
		foreach ( isset( $raw['buttons'] ) && is_array( $raw['buttons'] ) ? $raw['buttons'] : array() as $button ) {
			if ( in_array( $button, array( 'menu', 'search', 'cart', 'notifications', 'chat', 'account' ), true ) && ! in_array( $button, $buttons, true ) && count( $buttons ) < 4 ) {
				$buttons[] = $button;
			}
		}
		$title  = self::text( $raw['title'] ?? null );
		$header = array(
			'type'     => $type,
			'title'    => null === $title ? null : mb_substr( $title, 0, 80 ),
			'logo_url' => self::url( $raw['logo_url'] ?? null ),
			'buttons'  => $buttons,
		);
		foreach ( array( 'background', 'color', 'dark_background', 'dark_color' ) as $field ) {
			$header[ $field ] = self::hex( $raw[ $field ] ?? null );
		}
		return $header;
	}

	/**
	 * 103R One StudioNode with what it holds, or null when it is left out: a type this
	 * plugin doesn't know, a list or categories the site can't serve, a picture or video
	 * without a web address, or past the page's limits.
	 *
	 * @param array  $raw      Element as stored.
	 * @param int    $depth    How deep it is (the page's own element is 0).
	 * @param string $language The language the page is served in.
	 * @return array|null
	 */
	private function studio_node( array $raw, $depth, $language ) {
		if ( $depth > self::STUDIO_MAX_DEPTH || ++$this->studio_nodes > self::STUDIO_MAX_NODES ) {
			return null;
		}
		$raw  = Translator::apply( $raw, $language );
		$type = (string) ( $raw['type'] ?? '' );
		$id   = is_string( $raw['id'] ?? null ) && preg_match( '/^[A-Za-z0-9_-]{1,64}$/', $raw['id'] ) ? $raw['id'] : null;
		// 107.2 A hidden element is kept in the editor only (never the page's own).
		if ( null === $id || ! in_array( $type, self::STUDIO_TYPES, true ) || ( $depth > 0 && true === ( $raw['hidden'] ?? false ) ) ) {
			return null;
		}
		$node = array(
			'id'   => $id,
			'type' => $type,
		);
		foreach ( array( 'width', 'height' ) as $field ) {
			$size = self::studio_size( $raw[ $field ] ?? null );
			if ( null !== $size ) {
				$node[ $field ] = $size;
			}
		}
		$numbers = array(
			'min_height'   => array( 0, 4000 ),
			'aspect_ratio' => array( 0.1, 10 ),
			'gap'          => array( 0, 200 ),
			'radius'       => array( 0, 500 ),
			'border_width' => array( 0, 20 ),
			'opacity'      => array( 0, 1 ),
			'icon_size'    => array( 8, 200 ),
			'per_view'     => array( 1, 4 ),
			'rating'       => array( 0, 5 ),
			'rotation'     => array( -180, 180 ),
		);
		foreach ( $numbers as $field => $range ) {
			if ( isset( $raw[ $field ] ) && is_numeric( $raw[ $field ] ) ) {
				$node[ $field ] = round( max( $range[0], min( $range[1], (float) $raw[ $field ] ) ), 2 );
			}
		}
		$integers = array(
			'columns'     => array( 1, 6 ),
			'interval_ms' => array( 1500, 20000 ),
			'max_lines'   => array( 1, 50 ),
		);
		foreach ( $integers as $field => $range ) {
			if ( isset( $raw[ $field ] ) && is_numeric( $raw[ $field ] ) ) {
				$node[ $field ] = max( $range[0], min( $range[1], (int) $raw[ $field ] ) );
			}
		}
		$choices = array(
			'align'         => array( 'start', 'center', 'end', 'between', 'around' ),
			'cross'         => array( 'start', 'center', 'end', 'stretch' ),
			'self_align'    => array( 'start', 'center', 'end', 'stretch' ),
			'pin'           => array( 'none', 'top', 'bottom' ),
			'shadow'        => array( 'none', 'light', 'medium', 'strong' ),
			'text_align'    => array( 'start', 'center', 'end' ),
			'fit'           => array( 'cover', 'contain' ),
			'icon_position' => array( 'start', 'end' ),
			'layout'        => array( 'list', 'grid', 'carousel' ),
			'bind'          => array( 'title', 'subtitle', 'image', 'price', 'badge', 'rating' ),
			'visibility'    => array( 'everyone', 'signed_in', 'signed_out' ),
			// 112.4 How a slider shows where it is, and how categories look.
			'indicator'     => array( 'dots', 'progress', 'count' ),
			'style'         => array( 'chips', 'tiles', 'pictures', 'circles' ),
		);
		foreach ( $choices as $field => $values ) {
			if ( isset( $raw[ $field ] ) && in_array( $raw[ $field ], $values, true ) ) {
				$node[ $field ] = $raw[ $field ];
			}
		}
		foreach ( array( 'background', 'color', 'dark_background', 'dark_color', 'border_color', 'dark_border_color' ) as $field ) {
			$color = self::hex( $raw[ $field ] ?? null );
			if ( null !== $color ) {
				$node[ $field ] = $color;
			}
		}
		foreach ( array( 'padding', 'margin' ) as $field ) {
			$sides = self::studio_sides( $raw[ $field ] ?? null );
			if ( null !== $sides ) {
				$node[ $field ] = $sides;
			}
		}
		foreach ( array( 'autoplay', 'dots' ) as $field ) {
			if ( isset( $raw[ $field ] ) && is_bool( $raw[ $field ] ) ) {
				$node[ $field ] = $raw[ $field ];
			}
		}
		// 107.2 A row that scrolls sideways, each corner on its own, a colour over the picture.
		if ( 'row' === $type && true === ( $raw['scroll'] ?? false ) ) {
			$node['scroll'] = true;
		}
		if ( is_array( $raw['corners'] ?? null ) ) {
			$corners = array();
			foreach ( array( 'top_start', 'top_end', 'bottom_end', 'bottom_start' ) as $corner ) {
				if ( isset( $raw['corners'][ $corner ] ) && is_numeric( $raw['corners'][ $corner ] ) ) {
					$corners[ $corner ] = round( max( 0, min( 500, (float) $raw['corners'][ $corner ] ) ), 1 );
				}
			}
			if ( $corners ) {
				$node['corners'] = $corners;
			}
		}
		if ( isset( $raw['overlay']['color'], $raw['overlay']['opacity'] ) && null !== self::hex( $raw['overlay']['color'] ) && is_numeric( $raw['overlay']['opacity'] ) ) {
			$node['overlay'] = array(
				'color'   => self::hex( $raw['overlay']['color'] ),
				'opacity' => round( max( 0, min( 1, (float) $raw['overlay']['opacity'] ) ), 2 ),
			);
		}
		// 128.10 A shade over its picture, darker at its ends, so words on it read.
		$scrim = self::studio_scrim( $raw['scrim'] ?? null );
		if ( null !== $scrim ) {
			$node['scrim'] = $scrim;
		}
		// 112.4 Where a child of a stack sits, in percent.
		if ( isset( $raw['place']['x'], $raw['place']['y'] ) && is_numeric( $raw['place']['x'] ) && is_numeric( $raw['place']['y'] ) ) {
			$node['place'] = array(
				'x' => round( max( 0, min( 100, (float) $raw['place']['x'] ) ), 1 ),
				'y' => round( max( 0, min( 100, (float) $raw['place']['y'] ) ), 1 ),
			);
		}
		if ( isset( $raw['gradient']['from'], $raw['gradient']['to'] ) && null !== self::hex( $raw['gradient']['from'] ) && null !== self::hex( $raw['gradient']['to'] ) ) {
			$node['gradient'] = array(
				'from'  => self::hex( $raw['gradient']['from'] ),
				'to'    => self::hex( $raw['gradient']['to'] ),
				'angle' => isset( $raw['gradient']['angle'] ) && is_numeric( $raw['gradient']['angle'] ) ? max( 0, min( 360, (float) $raw['gradient']['angle'] ) ) : 180,
			);
		}
		$font = self::studio_font( $raw['font'] ?? null );
		if ( null !== $font ) {
			$node['font'] = $font;
		}
		$motion = self::studio_motion( $raw['motion'] ?? null );
		if ( null !== $motion ) {
			$node['motion'] = $motion;
		}
		if ( isset( $raw['text'] ) && is_scalar( $raw['text'] ) ) {
			$text         = sanitize_textarea_field( (string) $raw['text'] );
			$node['text'] = '' === $text ? null : mb_substr( $text, 0, 2000 );
		}
		// 107.3 A question's or a tab's name.
		if ( isset( $raw['title'] ) && is_scalar( $raw['title'] ) && '' !== trim( (string) $raw['title'] ) ) {
			$node['title'] = mb_substr( sanitize_text_field( (string) $raw['title'] ), 0, 120 );
		}
		if ( isset( $raw['icon'] ) && is_string( $raw['icon'] ) && preg_match( '/^[a-z0-9_]{1,64}$/', $raw['icon'] ) ) {
			$node['icon'] = $raw['icon'];
		}
		foreach ( array( 'image_url', 'video_url', 'image_background_url' ) as $field ) {
			$url = self::url( $raw[ $field ] ?? null );
			if ( null !== $url ) {
				$node[ $field ] = $url;
			}
		}
		if ( isset( $raw['platforms'] ) && is_array( $raw['platforms'] ) ) {
			$node['platforms'] = array_values( array_intersect( array( 'android', 'ios' ), $raw['platforms'] ) );
		}
		switch ( $type ) {
			case 'image':
				// A picture bound to a list's entry gets its address from the entry.
				if ( ! isset( $node['image_url'] ) && ! isset( $node['bind'] ) ) {
					return null;
				}
				break;
			case 'video':
				if ( ! isset( $node['video_url'] ) ) {
					return null;
				}
				break;
			case 'countdown':
				// 107.3 Counts down to `ends_at`, in UTC.
				$ends = is_string( $raw['ends_at'] ?? null ) ? strtotime( $raw['ends_at'] ) : false;
				if ( false === $ends ) {
					return null;
				}
				$node['ends_at'] = gmdate( 'Y-m-d\\TH:i:s\\Z', $ends );
				break;
			case 'bullets':
				if ( empty( $node['text'] ) ) {
					return null;
				}
				break;
			case 'learning':
				// 123 One of the student's cards, drawn by the app from their own learning.
				$section = $raw['learning']['section'] ?? null;
				if ( ! in_array( $section, array( 'continue', 'streak', 'live', 'week' ), true ) ) {
					return null;
				}
				$node['learning'] = array( 'section' => $section );
				// 128.8 On a photo, as the approved academy home draws them.
				if ( 'photo' === ( $raw['learning']['style'] ?? null ) ) {
					$node['learning']['style'] = 'photo';
				}
				break;
			case 'live_status':
				// 128.10 The person's order on its way (food delivery and marketplaces: the app shows nothing without one).
				$source = $raw['live_status']['source'] ?? null;
				if ( ! in_array( $source, array( 'food_order', 'market_order' ), true ) ) {
					return null;
				}
				$node['live_status'] = array( 'source' => $source );
				break;
			case 'school':
				// 128.10 A part of the family's school day (a school's own: the app shows the greeting alone without one).
				$section = $raw['school']['section'] ?? null;
				if ( ! in_array( $section, array( 'greeting', 'children', 'today' ), true ) ) {
					return null;
				}
				$node['school'] = array( 'section' => $section );
				break;
			case 'tracking':
				// 128.10 The person's shipment or ride on its way, or the taxis near them (nothing without one).
				$kind = $raw['tracking']['kind'] ?? null;
				if ( ! in_array( $kind, array( 'shipment', 'ride', 'nearby_taxis' ), true ) ) {
					return null;
				}
				$node['tracking'] = array( 'kind' => $kind );
				$style            = $raw['tracking']['style'] ?? null;
				if ( in_array( $style, array( 'driver', 'line' ), true ) ) {
					$node['tracking']['style'] = $style;
				}
				break;
			case 'photo_hero':
			case 'map_header':
				// 128.10 A cover: its last element hangs this far over its foot; a map its markers.
				if ( isset( $raw['overlap'] ) && is_numeric( $raw['overlap'] ) && (float) $raw['overlap'] > 0 ) {
					$node['overlap'] = (int) round( min( 400, (float) $raw['overlap'] ) );
				}
				if ( 'map_header' === $type ) {
					$drawing = self::studio_map_drawing( $raw['map_drawing'] ?? null );
					if ( null !== $drawing ) {
						$node['map_drawing'] = $drawing;
					}
				}
				break;
			case 'coupon':
				// 112.4 A code people copy: letters, numbers, - and _.
				$code = is_string( $raw['code'] ?? null ) ? trim( $raw['code'] ) : '';
				if ( ! preg_match( '/^[\p{L}\p{N}_-]{1,40}$/u', $code ) ) {
					return null;
				}
				$node['code'] = $code;
				break;
			case 'items':
				// 112.4 What this person opened lately is kept on the phone: sent without entries.
				if ( true === ( $raw['recent'] ?? false ) ) {
					if ( 'products' !== ( $raw['source'] ?? null ) || ! $this->serves( 'products' ) ) {
						return null;
					}
					$node['source'] = 'products';
					$node['recent'] = true;
					$node['items']  = array();
					$node['layout'] = $node['layout'] ?? 'carousel';
					if ( is_array( $raw['card'] ?? null ) ) {
						$card = $this->studio_node( $raw['card'], $depth + 1, $language );
						if ( null !== $card ) {
							$node['card'] = $card;
						}
					}
					return $node;
				}
				$list = $this->items_block( $raw );
				if ( ! $list ) {
					return null;
				}
				$node['source'] = $list['source'];
				$node['items']  = $list['items'];
				$node['layout'] = $node['layout'] ?? 'grid';
				if ( is_array( $raw['card'] ?? null ) ) {
					$card = $this->studio_node( $raw['card'], $depth + 1, $language );
					if ( null !== $card ) {
						$node['card'] = $card;
					}
				}
				return $node;
			case 'categories':
				$list = $this->categories_block( $raw );
				if ( ! $list ) {
					return null;
				}
				$node['source']     = $list['source'];
				$node['categories'] = $list['categories'];
				return $node;
			case 'search':
				if ( isset( $raw['source'] ) ) {
					if ( ! $this->serves( $raw['source'] ) ) {
						return null;
					}
					$node['source'] = $raw['source'];
				}
				break;
			case 'form':
				$form = is_array( $raw['form'] ?? null ) ? Rich_Blocks::fields( 'form', Translator::apply( $raw['form'], $language ), array( $this, 'action' ), time() ) : null;
				if ( null === $form ) {
					return null;
				}
				$node['form'] = $form;
				return $node;
			case 'map':
				$map = $raw['map'] ?? null;
				if ( ! is_array( $map ) || ! isset( $map['lat'], $map['lng'] ) || ! is_numeric( $map['lat'] ) || ! is_numeric( $map['lng'] ) || abs( (float) $map['lat'] ) > 90 || abs( (float) $map['lng'] ) > 180 ) {
					return null;
				}
				$node['map'] = array(
					'lat'   => (float) $map['lat'],
					'lng'   => (float) $map['lng'],
					'zoom'  => isset( $map['zoom'] ) && is_numeric( $map['zoom'] ) ? max( 1, min( 19, (float) $map['zoom'] ) ) : 15,
					'label' => self::text( $map['label'] ?? null ),
				);
				break;
		}
		if ( in_array( $type, self::STUDIO_LAYOUT, true ) ) {
			$children = array();
			foreach ( array_slice( isset( $raw['children'] ) && is_array( $raw['children'] ) ? $raw['children'] : array(), 0, 60 ) as $child ) {
				$served = is_array( $child ) ? $this->studio_node( $child, $depth + 1, $language ) : null;
				if ( null !== $served ) {
					$children[] = $served;
				}
			}
			$node['children'] = $children;
		}
		return $this->with_action( $node, 'action', $raw['action'] ?? null );
	}

	/**
	 * 103R A StudioSize: `fill`, `hug` or logical pixels; null otherwise.
	 *
	 * @param mixed $value Value.
	 * @return string|float|null
	 */
	private static function studio_size( $value ) {
		if ( 'fill' === $value || 'hug' === $value ) {
			return $value;
		}
		return is_numeric( $value ) && ! is_string( $value ) ? max( 0, min( 4000, round( (float) $value, 1 ) ) ) : null;
	}

	/**
	 * 103R StudioSides: each side in logical pixels, 0 to 400.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function studio_sides( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$sides = array();
		foreach ( array( 'top', 'end', 'bottom', 'start' ) as $side ) {
			if ( isset( $value[ $side ] ) && is_numeric( $value[ $side ] ) ) {
				$sides[ $side ] = max( 0, min( 400, round( (float) $value[ $side ], 1 ) ) );
			}
		}
		return $sides ? $sides : null;
	}

	/**
	 * 103R A StudioFont with known parts only.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function studio_font( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$font = array();
		if ( isset( $value['family'] ) && is_string( $value['family'] ) && preg_match( '/^[A-Za-z0-9 ]{1,60}$/', $value['family'] ) ) {
			$font['family'] = $value['family'];
		}
		if ( in_array( $value['weight'] ?? null, array( 300, 400, 500, 600, 700, 800, 900 ), true ) ) {
			$font['weight'] = $value['weight'];
		}
		$numbers = array(
			'size'           => array( 8, 120 ),
			'line_height'    => array( 0.8, 3 ),
			'letter_spacing' => array( -5, 20 ),
		);
		foreach ( $numbers as $field => $range ) {
			if ( isset( $value[ $field ] ) && is_numeric( $value[ $field ] ) ) {
				$font[ $field ] = round( max( $range[0], min( $range[1], (float) $value[ $field ] ) ), 2 );
			}
		}
		foreach ( array( 'italic', 'underline', 'strike', 'uppercase' ) as $field ) {
			if ( ! empty( $value[ $field ] ) ) {
				$font[ $field ] = true;
			}
		}
		return $font ? $font : null;
	}

	/**
	 * 128.10 A StudioScrim: its colour at `from` and `to` (0 to 1) at the ends of its direction,
	 * `middle` at `at` percent of the way, at `angle`; null when it isn't one or shades nothing.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function studio_scrim( $value ) {
		if ( ! is_array( $value ) || null === self::hex( $value['color'] ?? null ) ) {
			return null;
		}
		$share  = function ( $x ) {
			return is_int( $x ) || is_float( $x ) ? ( $x >= 0 && $x <= 1 ? round( (float) $x, 2 ) : false ) : null;
		};
		$from   = $share( $value['from'] ?? null );
		$to     = $share( $value['to'] ?? null );
		$middle = $share( $value['middle'] ?? null );
		if ( null === $from || null === $to || false === $from || false === $to || false === $middle ) {
			return null;
		}
		if ( 0.0 === $from && 0.0 === $to && ( null === $middle || 0.0 === $middle ) ) {
			return null;
		}
		$scrim = array(
			'color' => self::hex( $value['color'] ),
			'from'  => $from,
			'to'    => $to,
		);
		if ( null !== $middle ) {
			$scrim['middle'] = $middle;
			if ( isset( $value['at'] ) && is_numeric( $value['at'] ) && (float) $value['at'] >= 1 && (float) $value['at'] <= 99 && 50.0 !== (float) $value['at'] ) {
				$scrim['at'] = round( (float) $value['at'], 2 );
			}
		}
		if ( isset( $value['angle'] ) && is_numeric( $value['angle'] ) && (float) $value['angle'] >= 0 && (float) $value['angle'] <= 360 && 180.0 !== (float) $value['angle'] ) {
			$scrim['angle'] = round( (float) $value['angle'], 2 );
		}
		return $scrim;
	}

	/**
	 * 128.10 A StudioMapDrawing with known parts only: up to 12 markers at their places in
	 * percent, their icon, colour and tile, the person's dot, and the live taxis.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function studio_map_drawing( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$drawing = array();
		$markers = array();
		foreach ( array_slice( isset( $value['markers'] ) && is_array( $value['markers'] ) ? $value['markers'] : array(), 0, 12 ) as $marker ) {
			if ( isset( $marker['x'], $marker['y'] ) && is_numeric( $marker['x'] ) && is_numeric( $marker['y'] ) ) {
				$markers[] = array(
					'x' => round( max( 0, min( 100, (float) $marker['x'] ) ), 1 ),
					'y' => round( max( 0, min( 100, (float) $marker['y'] ) ), 1 ),
				);
			}
		}
		if ( $markers ) {
			$drawing['markers'] = $markers;
		}
		if ( isset( $value['icon'] ) && is_string( $value['icon'] ) && preg_match( '/^[a-z0-9_]{1,40}$/', $value['icon'] ) ) {
			$drawing['icon'] = $value['icon'];
		}
		foreach ( array( 'accent', 'chip' ) as $field ) {
			$color = self::hex( $value[ $field ] ?? null );
			if ( null !== $color ) {
				$drawing[ $field ] = $color;
			}
		}
		foreach ( array( 'me', 'live' ) as $field ) {
			if ( true === ( $value[ $field ] ?? false ) ) {
				$drawing[ $field ] = true;
			}
		}
		// 129.21–129.24 Its premium look, its markers' look, the person's dot, labelled pins, words and a route.
		$drawing += self::studio_map_looks( $value );
		return $drawing ? $drawing : null;
	}

	/**
	 * 129.21–129.24 A map's premium look with known parts only (`StudioMapDrawing`): its style
	 * and markers' look, the word on roof signs, where the person's dot is, up to 6 labelled
	 * pins, up to 8 words and a route of 2 to 6 points.
	 *
	 * @param array $value Value.
	 * @return array
	 */
	private static function studio_map_looks( array $value ) {
		$looks = array();
		if ( in_array( $value['style'] ?? null, array( 'natural', 'horizon', 'two_ink', 'lens' ), true ) ) {
			$looks['style'] = $value['style'];
		}
		if ( in_array( $value['marker'] ?? null, array( 'tile', 'car', 'sign', 'token' ), true ) ) {
			$looks['marker'] = $value['marker'];
		}
		$sign = self::map_words( $value['sign'] ?? null, 8 );
		if ( null !== $sign ) {
			$looks['sign'] = $sign;
		}
		$me = self::map_spot( $value['me_at'] ?? null );
		if ( null !== $me ) {
			$looks['me_at'] = $me;
		}
		$places = array();
		foreach ( array_slice( isset( $value['places'] ) && is_array( $value['places'] ) ? $value['places'] : array(), 0, 6 ) as $pin ) {
			$spot  = self::map_spot( $pin );
			$label = is_array( $pin ) ? self::map_words( $pin['label'] ?? null, 40 ) : null;
			if ( null !== $spot && null !== $label ) {
				$spot['label'] = $label;
				if ( isset( $pin['icon'] ) && is_string( $pin['icon'] ) && preg_match( '/^[a-z0-9_]{1,40}$/', $pin['icon'] ) ) {
					$spot['icon'] = $pin['icon'];
				}
				$places[] = $spot;
			}
		}
		if ( $places ) {
			$looks['places'] = $places;
		}
		$labels = array();
		foreach ( array_slice( isset( $value['labels'] ) && is_array( $value['labels'] ) ? $value['labels'] : array(), 0, 8 ) as $label ) {
			$spot = self::map_spot( $label );
			$text = is_array( $label ) ? self::map_words( $label['text'] ?? null, 40 ) : null;
			if ( null !== $spot && null !== $text ) {
				$spot['text'] = $text;
				$labels[]     = $spot;
			}
		}
		if ( $labels ) {
			$looks['labels'] = $labels;
		}
		$route = isset( $value['route'] ) && is_array( $value['route'] ) ? $value['route'] : null;
		if ( null !== $route ) {
			$points = array();
			foreach ( array_slice( isset( $route['points'] ) && is_array( $route['points'] ) ? $route['points'] : array(), 0, 6 ) as $point ) {
				$spot = self::map_spot( $point );
				if ( null !== $spot ) {
					$points[] = $spot;
				}
			}
			if ( count( $points ) >= 2 ) {
				$line = array( 'points' => $points );
				if ( isset( $route['at'] ) && is_numeric( $route['at'] ) && (float) $route['at'] > 0 ) {
					$line['at'] = round( min( 100, (float) $route['at'] ), 1 );
				}
				foreach ( array( 'from_label', 'to_label', 'eta' ) as $field ) {
					$words = self::map_words( $route[ $field ] ?? null, 40 );
					if ( null !== $words ) {
						$line[ $field ] = $words;
					}
				}
				if ( isset( $route['icon'] ) && is_string( $route['icon'] ) && preg_match( '/^[a-z0-9_]{1,40}$/', $route['icon'] ) ) {
					$line['icon'] = $route['icon'];
				}
				foreach ( array( 'color', 'dark_color' ) as $field ) {
					$color = self::hex( $route[ $field ] ?? null );
					if ( null !== $color ) {
						$line[ $field ] = $color;
					}
				}
				if ( true === ( $route['moving'] ?? false ) ) {
					$line['moving'] = true;
				}
				if ( in_array( $route['live'] ?? null, array( 'ride', 'shipment' ), true ) ) {
					$line['live'] = $route['live'];
				}
				$looks['route'] = $line;
			}
		}
		return $looks;
	}

	/**
	 * 129.21 A spot on the map in percent from the start and the top, or null.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function map_spot( $value ) {
		if ( ! is_array( $value ) || ! isset( $value['x'], $value['y'] ) || ! is_numeric( $value['x'] ) || ! is_numeric( $value['y'] ) ) {
			return null;
		}
		return array(
			'x' => round( max( 0, min( 100, (float) $value['x'] ) ), 1 ),
			'y' => round( max( 0, min( 100, (float) $value['y'] ) ), 1 ),
		);
	}

	/**
	 * 129.21 Words on the map, at most `$max` characters, or null when empty.
	 *
	 * @param mixed $value Value.
	 * @param int   $max   Most characters.
	 * @return string|null
	 */
	private static function map_words( $value, $max ) {
		if ( ! is_string( $value ) ) {
			return null;
		}
		$words = trim( sanitize_text_field( $value ) );
		return '' === $words ? null : mb_substr( $words, 0, $max );
	}

	/**
	 * 103R A StudioMotion with known parts only.
	 *
	 * @param mixed $value Value.
	 * @return array|null
	 */
	private static function studio_motion( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$motion = array(
			'enter'       => self::choice( $value['enter'] ?? null, array( 'none', 'fade', 'slide_up', 'slide_down', 'slide_start', 'slide_end', 'zoom' ), 'none' ),
			'duration_ms' => isset( $value['duration_ms'] ) && is_numeric( $value['duration_ms'] ) ? max( 100, min( 3000, (int) $value['duration_ms'] ) ) : 400,
			'delay_ms'    => isset( $value['delay_ms'] ) && is_numeric( $value['delay_ms'] ) ? max( 0, min( 5000, (int) $value['delay_ms'] ) ) : 0,
			'press'       => self::choice( $value['press'] ?? null, array( 'none', 'shrink', 'bounce' ), 'none' ),
			'loop'        => self::choice( $value['loop'] ?? null, array( 'none', 'pulse', 'float', 'shake' ), 'none' ),
		);
		return 'none' === $motion['enter'] && 'none' === $motion['press'] && 'none' === $motion['loop'] ? null : $motion;
	}

	/**
	 * 103R A #RRGGBB colour in capitals, or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	private static function hex( $value ) {
		return is_string( $value ) && preg_match( '/^#[0-9A-Fa-f]{6}$/', $value ) ? strtoupper( $value ) : null;
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
	 * 82.5 A block's look (background and spacing; 99.3 alignment, text size, corners and
	 * picture fit), or null when every field is its default.
	 *
	 * @param mixed $value BlockLook.
	 * @return array|null
	 */
	public static function look( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$look    = array();
		$changed = false;
		foreach ( self::LOOK as $field => $allowed ) {
			$look[ $field ] = self::choice( $value[ $field ] ?? null, $allowed, $allowed[0] );
			$changed        = $changed || $allowed[0] !== $look[ $field ];
		}
		return $changed ? $look : null;
	}

	/**
	 * 82.5 The owner's own icon: an https URL, or null.
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	public static function icon_url( $value ) {
		return self::https_url( $value );
	}

	/**
	 * 99.3 An https URL, or null (a page's header picture).
	 *
	 * @param mixed $value Value.
	 * @return string|null
	 */
	public static function https_url( $value ) {
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
