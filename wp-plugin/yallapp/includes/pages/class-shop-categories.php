<?php
/**
 * 157.7 The shop's categories in a template's lists of them, on a WordPress shop.
 *
 * @package Yallapp
 */

namespace Yallapp\Pages;

defined( 'ABSPATH' ) || exit;

/**
 * Leqaa's looks draw the shop's occasions and collections as Studio elements holding the
 * template's own words (the occasions' story rings, chips and ticker; the collections' bento,
 * arches and cards), each opening the whole shop. Served as saved, they stayed the template's
 * whatever categories the shop has. The same rules as the hosted pages
 * (platform/web/src/lib/studio/shop-categories.ts), on the page as it is served:
 *
 * - a list the owner left as the template made it follows the shop's WooCommerce categories
 *   (the top ones, in the shop's order): one entry per category, its name, its picture (else the
 *   template's), opening the shop filtered to it (`Action.category_id`), each entry in the look of
 *   the template's at its place, the bento keeping its number of tiles with no hole;
 * - a shop without categories keeps the template's entries;
 * - any element that opens the whole shop and is named like one of the shop's categories (its
 *   name in any case, or the template's word for it in any language) opens that category.
 *
 * Pure: the categories are given.
 */
class Shop_Categories {

	/**
	 * The words the templates write as the shop's categories (Leqaa's occasions and collections),
	 * in each language the app ships, as the platform's app words have them
	 * (`TEMPLATE_CATEGORY_WORDS`; platform/web/tests/unit/phase206-followups.test.ts keeps them the same).
	 */
	const WORDS = array(
		'lqLove'      => array( 'Love', 'حب', 'Aşk' ),
		'lqBirthday'  => array( 'Birthday', 'عيد ميلاد', 'Doğum günü' ),
		'lqSympathy'  => array( 'Sympathy', 'مواساة', 'Taziye' ),
		'lqNewBaby'   => array( 'New baby', 'مولود جديد', 'Yeni bebek' ),
		'lqCongrats'  => array( 'Congratulations', 'تهنئة', 'Tebrikler' ),
		'lqSignature' => array( 'Signature bouquets', 'الباقات المميّزة', 'İmza buketler' ),
		'lqRoses'     => array( 'Roses', 'الورود', 'Güller' ),
		'lqSeasonal'  => array( 'In season', 'زهور الموسم', 'Mevsimin çiçekleri' ),
		'lqPlants'    => array( 'Plants', 'النباتات', 'Bitkiler' ),
		'lqGiftSets'  => array( 'Gift sets', 'مجموعات الهدايا', 'Hediye setleri' ),
		'lqTulips'    => array( 'Tulips', 'التوليب', 'Laleler' ),
	);

	/**
	 * A ticker of the occasions' words, one per line (`TEMPLATE_CATEGORY_TICKERS`).
	 */
	const TICKERS = array(
		'lqTicker' => array( "Love\nBirthday\nSympathy\nNew baby\nCongratulations\nThank you", "حب\nعيد ميلاد\nمواساة\nمولود جديد\nتهنئة\nشكرًا", "Aşk\nDoğum günü\nTaziye\nYeni bebek\nTebrikler\nTeşekkürler" ),
	);

	/**
	 * The occasions' own icons on the templates' chips, and the flower a category gets instead.
	 */
	const OCCASION_ICONS = array( 'favorite', 'cake', 'spa', 'child_care', 'celebration' );
	const CATEGORY_ICON  = 'local_florist';

	/**
	 * At most this many entries in a list; at most this many texts in an element one category name links.
	 */
	const MAX          = 12;
	const LINKED_TEXTS = 4;

	/**
	 * The shop's categories: `id`, `name`, `image_url`.
	 *
	 * @var array[]
	 */
	private $list;

	/**
	 * Constructor.
	 *
	 * @param array[] $categories The shop's top categories (Block_Resolver::categories( 'products' )).
	 */
	public function __construct( array $categories ) {
		$this->list = array();
		foreach ( $categories as $category ) {
			$name = is_array( $category ) && is_scalar( $category['name'] ?? null ) ? trim( (string) $category['name'] ) : '';
			$id   = is_array( $category ) ? (int) ( $category['id'] ?? 0 ) : 0;
			if ( $id > 0 && '' !== $name ) {
				$this->list[] = array(
					'id'        => $id,
					'name'      => $name,
					'image_url' => is_string( $category['image_url'] ?? null ) && '' !== $category['image_url'] ? $category['image_url'] : null,
				);
			}
		}
	}

	/**
	 * A text as the words are compared: trimmed, one space, lower case.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	private static function norm( $text ) {
		$text = trim( (string) preg_replace( '/\s+/u', ' ', (string) $text ) );
		if ( class_exists( 'Normalizer' ) ) {
			$normal = \Normalizer::normalize( $text, \Normalizer::FORM_C );
			$text   = false === $normal ? $text : $normal;
		}
		return mb_strtolower( $text, 'UTF-8' );
	}

	/**
	 * The template's category word a text is, in any language; null for any other text.
	 *
	 * @param mixed $text Text.
	 * @return string|null
	 */
	public static function word_of( $text ) {
		if ( ! is_string( $text ) || '' === trim( $text ) ) {
			return null;
		}
		$text = self::norm( $text );
		foreach ( self::WORDS as $word => $languages ) {
			foreach ( $languages as $written ) {
				if ( self::norm( $written ) === $text ) {
					return $word;
				}
			}
		}
		return null;
	}

	/**
	 * Whether a text is the template's ticker, in any language.
	 *
	 * @param mixed $text Text.
	 * @return bool
	 */
	private static function is_ticker( $text ) {
		if ( ! is_string( $text ) ) {
			return false;
		}
		foreach ( self::TICKERS as $languages ) {
			foreach ( $languages as $written ) {
				if ( self::norm( $written ) === self::norm( $text ) ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * A tap that opens the whole shop, as the templates' entries do (or none).
	 *
	 * @param mixed $action Served action.
	 * @return bool
	 */
	private static function opens_shop( $action ) {
		return ! is_array( $action ) || ( 'screen' === ( $action['type'] ?? null ) && 'search' === ( $action['screen'] ?? null ) && empty( $action['category_id'] ) );
	}

	/**
	 * What opens a category: the shop, filtered to it.
	 *
	 * @param array $category Category.
	 * @return array
	 */
	public static function action_for( array $category ) {
		return array(
			'type'        => 'screen',
			'screen'      => 'search',
			'category_id' => (string) $category['id'],
		);
	}

	/**
	 * An element and everything in it.
	 *
	 * @param array $node Node.
	 * @return array[]
	 */
	private static function subtree( array $node ) {
		$all = array( $node );
		foreach ( is_array( $node['children'] ?? null ) ? $node['children'] : array() as $child ) {
			if ( is_array( $child ) ) {
				$all = array_merge( $all, self::subtree( $child ) );
			}
		}
		return $all;
	}

	/**
	 * One entry of a list of children: it opens the shop, nothing in it opens anything else, and
	 * one text in it is a category word.
	 *
	 * @param array $child Child.
	 * @return bool
	 */
	private static function child_entry( array $child ) {
		$words = 0;
		foreach ( self::subtree( $child ) as $node ) {
			if ( ! self::opens_shop( $node['action'] ?? null ) ) {
				return false;
			}
			if ( 'text' === ( $node['type'] ?? '' ) && null !== self::word_of( $node['text'] ?? null ) ) {
				++$words;
			}
		}
		return 1 === $words;
	}

	/**
	 * Which of the template's lists of the shop's categories an element is, as the template left
	 * it: stories, bento, ticker or children; null for any other.
	 *
	 * @param array $node Served node.
	 * @return string|null
	 */
	public static function list_kind( array $node ) {
		$type = $node['type'] ?? '';
		if ( 'stories' === $type || 'bento' === $type ) {
			$field   = 'stories' === $type ? 'slides' : 'entries';
			$heading = 'stories' === $type ? 'heading' : 'title';
			$entries = is_array( $node[ $field ] ?? null ) ? $node[ $field ] : array();
			if ( ! $entries ) {
				return null;
			}
			foreach ( $entries as $entry ) {
				if ( ! is_array( $entry ) || ! self::opens_shop( $entry['action'] ?? null ) || null === self::word_of( $entry[ $heading ] ?? null ) ) {
					return null;
				}
			}
			return $type;
		}
		if ( 'marquee' === $type ) {
			return self::is_ticker( $node['text'] ?? null ) ? 'ticker' : null;
		}
		if ( 'row' === $type || 'slider' === $type ) {
			$kids = is_array( $node['children'] ?? null ) ? array_values( $node['children'] ) : array();
			if ( count( $kids ) < 2 ) {
				return null;
			}
			foreach ( $kids as $kid ) {
				if ( ! is_array( $kid ) || ( $kid['type'] ?? '' ) !== ( $kids[0]['type'] ?? '' ) || ! self::child_entry( $kid ) ) {
					return null;
				}
			}
			return 'children';
		}
		return null;
	}

	/**
	 * The shop's category a text names: the one with that name, or, for a template word, the one
	 * named as the word is in any language.
	 *
	 * @param mixed $text Text.
	 * @return array|null
	 */
	public function namesake( $text ) {
		if ( ! is_string( $text ) || '' === trim( $text ) ) {
			return null;
		}
		foreach ( $this->list as $category ) {
			if ( self::norm( $category['name'] ) === self::norm( $text ) ) {
				return $category;
			}
		}
		$word = self::word_of( $text );
		if ( null === $word ) {
			return null;
		}
		$names = array_map( array( __CLASS__, 'norm' ), self::WORDS[ $word ] );
		foreach ( $this->list as $category ) {
			if ( in_array( self::norm( $category['name'] ), $names, true ) ) {
				return $category;
			}
		}
		return null;
	}

	/**
	 * The first photo in an element.
	 *
	 * @param array $node Node.
	 * @return string|null
	 */
	private static function photo_of( array $node ) {
		foreach ( self::subtree( $node ) as $n ) {
			if ( in_array( $n['type'] ?? '', array( 'image', 'photo_hero' ), true ) && ! empty( $n['image_url'] ) ) {
				return $n['image_url'];
			}
		}
		return null;
	}

	/**
	 * Two figures for a place in a list ("01"), as the edit's cards number theirs.
	 *
	 * @param int $i Index.
	 * @return string
	 */
	private static function place( $i ) {
		return str_pad( (string) ( $i + 1 ), 2, '0', STR_PAD_LEFT );
	}

	/**
	 * A template's child entry made one category's.
	 *
	 * @param array       $template The template's child at that place.
	 * @param int         $at       Its place.
	 * @param int         $i        The category's place.
	 * @param array       $category Category.
	 * @param string|null $fallback The template's photo for it.
	 * @return array
	 */
	private static function child_for( array $template, $at, $i, array $category, $fallback ) {
		$photo         = null !== $category['image_url'] ? $category['image_url'] : $fallback;
		$done          = false;
		$visit         = static function ( array $n ) use ( &$visit, &$done, $at, $i, $category, $photo ) {
			if ( $i !== $at && isset( $n['id'] ) ) {
				$n['id'] = substr( $n['id'] . '-' . $i, 0, 64 );
			}
			$type = $n['type'] ?? '';
			if ( 'text' === $type && null !== self::word_of( $n['text'] ?? null ) ) {
				$n['text'] = $category['name'];
			} elseif ( 'text' === $type && is_string( $n['text'] ?? null ) && trim( $n['text'] ) === self::place( $at ) && $i !== $at ) {
				$n['text'] = self::place( $i );
			} elseif ( 'icon' === $type && in_array( $n['icon'] ?? null, self::OCCASION_ICONS, true ) ) {
				$n['icon'] = self::CATEGORY_ICON;
			}
			if ( ! $done && null !== $photo && in_array( $type, array( 'image', 'photo_hero' ), true ) && ! empty( $n['image_url'] ) ) {
				$n['image_url'] = $photo;
				$done           = true;
			}
			if ( is_array( $n['children'] ?? null ) ) {
				$n['children'] = array_map( $visit, $n['children'] );
			}
			return $n;
		};
		$out           = $visit( $template );
		$out['name']   = mb_substr( $category['name'], 0, 80 );
		$out['action'] = self::action_for( $category );
		return $out;
	}

	/**
	 * A template's list of the shop's categories as the shop's make it; any other element as it is.
	 *
	 * @param array $node Served node.
	 * @return array
	 */
	public function with_list( array $node ) {
		$kind = self::list_kind( $node );
		if ( null === $kind || ! $this->list ) {
			return $node;
		}
		$list = array_slice( $this->list, 0, self::MAX );
		switch ( $kind ) {
			case 'stories':
				$slides = array_values( $node['slides'] );
				$made   = array();
				foreach ( $list as $i => $category ) {
					$story              = $slides[ min( $i, count( $slides ) - 1 ) ];
					$story['heading']   = mb_substr( $category['name'], 0, 40 );
					$story['image_url'] = null !== $category['image_url'] ? $category['image_url'] : ( $slides[ $i % count( $slides ) ]['image_url'] ?? null );
					$story['action']    = self::action_for( $category );
					unset( $story['subheading'] );
					$made[] = array_filter(
						$story,
						static function ( $value ) {
							return null !== $value;
						}
					);
				}
				$node['slides'] = $made;
				return $node;
			case 'bento':
				$entries = array_values( $node['entries'] );
				$made    = array();
				foreach ( array_slice( $list, 0, count( $entries ) ) as $i => $category ) {
					$entry          = $entries[ $i ];
					$entry['title'] = $category['name'];
					if ( null !== self::word_of( $entry['subtitle'] ?? null ) ) {
						unset( $entry['subtitle'] );
					}
					if ( null !== $category['image_url'] ) {
						$entry['image_url'] = $category['image_url'];
					}
					$entry['action'] = self::action_for( $category );
					$made[]          = $entry;
				}
				$node['entries'] = self::filled_sizes( $made, (int) ( $node['columns'] ?? 2 ) );
				return $node;
			case 'ticker':
				$node['text'] = implode( "\n", array_column( $list, 'name' ) );
				return $node;
			default:
				$kids = array_values( $node['children'] );
				$made = array();
				foreach ( $list as $i => $category ) {
					$at     = min( $i, count( $kids ) - 1 );
					$made[] = self::child_for( $kids[ $at ], $at, $i, $category, self::photo_of( $kids[ $i % count( $kids ) ] ) );
				}
				$node['children'] = $made;
				return $node;
		}
	}

	/**
	 * A bento's sizes with no hole in a grid of two columns: a single small tile at the foot spans both.
	 *
	 * @param array[] $entries Entries.
	 * @param int     $columns Columns.
	 * @return array[]
	 */
	private static function filled_sizes( array $entries, $columns ) {
		if ( 2 !== $columns || ! $entries ) {
			return $entries;
		}
		$trailing = 0;
		for ( $i = count( $entries ) - 1; $i >= 0 && 'small' === ( $entries[ $i ]['size'] ?? 'small' ); $i-- ) {
			++$trailing;
		}
		if ( 1 === $trailing % 2 ) {
			$entries[ count( $entries ) - 1 ]['size'] = 'wide';
		}
		return $entries;
	}

	/**
	 * The category an element that opens the shop is named like: a text's or a button's own words,
	 * or the one category name among its few texts.
	 *
	 * @param array $node Node.
	 * @return array|null
	 */
	private function linked( array $node ) {
		if ( ! isset( $node['action'] ) || ! self::opens_shop( $node['action'] ) ) {
			return null;
		}
		$type = $node['type'] ?? '';
		if ( 'text' === $type || 'button' === $type ) {
			return $this->namesake( $node['text'] ?? null );
		}
		$texts = array_filter(
			self::subtree( $node ),
			static function ( $n ) {
				return 'text' === ( $n['type'] ?? '' );
			}
		);
		if ( ! $texts || count( $texts ) > self::LINKED_TEXTS ) {
			return null;
		}
		$named = array();
		foreach ( $texts as $text ) {
			$category = $this->namesake( $text['text'] ?? null );
			if ( null !== $category ) {
				$named[] = $category;
			}
		}
		return 1 === count( $named ) ? $named[0] : null;
	}

	/**
	 * An element named like one of the shop's categories opens it; a category the shop no longer
	 * lists opens the shop.
	 *
	 * @param array $node Served node.
	 * @return array
	 */
	public function with_links( array $node ) {
		$known = array_map( 'strval', array_column( $this->list, 'id' ) );
		$kept  = static function ( array $entry ) use ( $known ) {
			$action = $entry['action'] ?? null;
			if ( is_array( $action ) && 'screen' === ( $action['type'] ?? null ) && ! empty( $action['category_id'] ) && ! in_array( (string) $action['category_id'], $known, true ) ) {
				unset( $entry['action']['category_id'] );
			}
			return $entry;
		};
		$node  = $kept( $node );
		foreach ( array(
			'slides'  => 'heading',
			'entries' => 'title',
		) as $field => $heading ) {
			if ( ! is_array( $node[ $field ] ?? null ) ) {
				continue;
			}
			foreach ( $node[ $field ] as $i => $entry ) {
				if ( ! is_array( $entry ) ) {
					continue;
				}
				if ( isset( $entry['action'] ) && self::opens_shop( $entry['action'] ) ) {
					$category = $this->namesake( $entry[ $heading ] ?? null );
					if ( null !== $category ) {
						$entry['action'] = self::action_for( $category );
					}
				} else {
					$entry = $kept( $entry );
				}
				$node[ $field ][ $i ] = $entry;
			}
		}
		$category = $this->list ? $this->linked( $node ) : null;
		if ( null !== $category ) {
			$node['action'] = self::action_for( $category );
		}
		return $node;
	}

	/**
	 * Whether a page has anything the shop's categories change.
	 *
	 * @param array $body Served body.
	 * @return bool
	 */
	public static function shown_in( array $body ) {
		$opens = static function ( $action ) {
			return is_array( $action ) && 'screen' === ( $action['type'] ?? null ) && 'search' === ( $action['screen'] ?? null );
		};
		foreach ( self::subtree( $body ) as $node ) {
			if ( null !== self::list_kind( $node ) || $opens( $node['action'] ?? null ) ) {
				return true;
			}
			foreach ( array( 'slides', 'entries' ) as $field ) {
				foreach ( is_array( $node[ $field ] ?? null ) ? $node[ $field ] : array() as $entry ) {
					if ( is_array( $entry ) && $opens( $entry['action'] ?? null ) ) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * A served page's body as the shop's categories make it: the template's lists first, then every
	 * element named like one of them opening it.
	 *
	 * @param array $body Served body.
	 * @return array
	 */
	public function apply( array $body ) {
		$lists = $this->map( $body, array( $this, 'with_list' ) );
		return $this->map( $lists, array( $this, 'with_links' ) );
	}

	/**
	 * Each element, its children (and a list's card) first, changed.
	 *
	 * @param array    $node   Node.
	 * @param callable $change Change.
	 * @return array
	 */
	private function map( array $node, callable $change ) {
		if ( is_array( $node['children'] ?? null ) ) {
			$node['children'] = array_map(
				function ( $child ) use ( $change ) {
					return is_array( $child ) ? $this->map( $child, $change ) : $child;
				},
				$node['children']
			);
		}
		if ( is_array( $node['card'] ?? null ) ) {
			$node['card'] = $this->map( $node['card'], $change );
		}
		return $change( $node );
	}
}
