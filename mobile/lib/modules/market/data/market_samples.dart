import 'market_models.dart';

/// 115 Sample marketplace data: what the screens show until the platform
/// serves the marketplace, and what the screenshots and widget tests use.
/// Pictures are the designs' drawn pictures (platform/web/public/design-pictures).
abstract final class MarketSamples {
  static const pictureHost = 'https://yallapp.test/design-pictures/';

  static String picture(String name) => '$pictureHost$name';

  static final vendors = <MarketVendor>[
    MarketVendor(
      id: 'ember-bun',
      kind: MarketVendorKind.restaurant,
      name: 'Ember & Bun',
      coverUrl: picture('art-dish-burger.png'),
      logoUrl: '',
      tags: const ['Burgers', 'Grills'],
      rating: 4.8,
      ratings: 2400,
      etaMin: 20,
      etaMax: 30,
      freeDelivery: true,
      minOrder: 'EGP 150.00',
      promo: '20% off your first order',
      club: true,
      clubBenefit: 'Free with Club',
      distanceKm: 1.2,
    ),
    MarketVendor(
      id: 'layers',
      kind: MarketVendorKind.restaurant,
      name: 'Layers Bakehouse',
      coverUrl: picture('art-dish-cheesecake.png'),
      logoUrl: '',
      tags: const ['Desserts', 'Cakes'],
      rating: 4.9,
      ratings: 3100,
      etaMin: 15,
      etaMax: 25,
      deliveryFee: 'EGP 15.00',
      minOrder: 'EGP 100.00',
      promo: 'Free slice over EGP 400',
      club: true,
      clubBenefit: 'Free with Club',
      distanceKm: 0.8,
    ),
    MarketVendor(
      id: 'wrap-lab',
      kind: MarketVendorKind.restaurant,
      name: 'Wrap Lab',
      coverUrl: picture('art-dish-wrap.png'),
      logoUrl: '',
      tags: const ['Wraps', 'Healthy'],
      rating: 4.6,
      ratings: 980,
      etaMin: 20,
      etaMax: 35,
      deliveryFee: 'EGP 15.00',
      minOrder: 'EGP 100.00',
      distanceKm: 2.1,
    ),
    MarketVendor(
      id: 'sunny-side',
      kind: MarketVendorKind.restaurant,
      name: 'Sunny Side',
      coverUrl: picture('art-dish-breakfast.png'),
      logoUrl: '',
      tags: const ['Breakfast', 'Eggs'],
      rating: 4.7,
      ratings: 1200,
      etaMin: 25,
      etaMax: 35,
      freeDelivery: true,
      minOrder: 'EGP 120.00',
      deliveredBy: MarketDeliveredBy.vendor,
      promo: 'Coffee on us before 11:00',
      distanceKm: 2.6,
    ),
    MarketVendor(
      id: 'golden-tray',
      kind: MarketVendorKind.restaurant,
      name: 'Golden Tray',
      coverUrl: picture('art-dish-baklava.png'),
      logoUrl: '',
      tags: const ['Sweets', 'Oriental'],
      rating: 4.8,
      ratings: 1700,
      etaMin: 30,
      etaMax: 45,
      deliveryFee: 'EGP 20.00',
      minOrder: 'EGP 150.00',
      distanceKm: 3.4,
    ),
    MarketVendor(
      id: 'bowl-spoon',
      kind: MarketVendorKind.restaurant,
      name: 'Bowl & Spoon',
      coverUrl: picture('art-dish-soup.png'),
      logoUrl: '',
      tags: const ['Soups', 'Home food'],
      rating: 4.5,
      ratings: 640,
      etaMin: 35,
      etaMax: 50,
      deliveryFee: 'EGP 10.00',
      minOrder: 'EGP 80.00',
      state: MarketVendorState.busy,
      distanceKm: 3.9,
    ),
    MarketVendor(
      id: 'bean-street',
      kind: MarketVendorKind.restaurant,
      name: 'Bean Street',
      coverUrl: picture('art-drink-latte.png'),
      logoUrl: '',
      tags: const ['Coffee', 'Drinks'],
      rating: 4.7,
      ratings: 2050,
      etaMin: 10,
      etaMax: 20,
      freeDelivery: true,
      minOrder: 'EGP 60.00',
      club: true,
      clubBenefit: 'Free with Club',
      distanceKm: 0.5,
    ),
    MarketVendor(
      id: 'fresh-basket',
      kind: MarketVendorKind.grocery,
      name: 'Fresh Basket',
      coverUrl: picture('art-item-fruit.png'),
      logoUrl: '',
      tags: const ['Supermarket', 'Fruit & veg'],
      rating: 4.8,
      ratings: 5200,
      etaMin: 15,
      etaMax: 25,
      freeDelivery: true,
      minOrder: 'EGP 200.00',
      promo: 'Up to 30% off fruit',
      club: true,
      clubBenefit: 'Free with Club',
      distanceKm: 1.0,
    ),
    MarketVendor(
      id: 'daily-bread',
      kind: MarketVendorKind.grocery,
      name: 'Daily Bread',
      coverUrl: picture('art-item-bread.png'),
      logoUrl: '',
      tags: const ['Bakery'],
      rating: 4.7,
      ratings: 860,
      etaMin: 15,
      etaMax: 20,
      deliveryFee: 'EGP 10.00',
      minOrder: 'EGP 50.00',
      deliveredBy: MarketDeliveredBy.vendor,
      distanceKm: 0.7,
    ),
    MarketVendor(
      id: 'green-corner',
      kind: MarketVendorKind.grocery,
      name: 'Green Corner',
      coverUrl: picture('art-item-veg.png'),
      logoUrl: '',
      tags: const ['Greengrocer'],
      rating: 4.6,
      ratings: 430,
      etaMin: 20,
      etaMax: 30,
      deliveryFee: 'EGP 10.00',
      minOrder: 'EGP 100.00',
      distanceKm: 1.8,
    ),
    MarketVendor(
      id: 'roastery',
      kind: MarketVendorKind.grocery,
      name: 'The Roastery',
      coverUrl: picture('art-product-coffee.png'),
      logoUrl: '',
      tags: const ['Coffee & tea'],
      rating: 4.9,
      ratings: 710,
      etaMin: 25,
      etaMax: 40,
      freeDelivery: true,
      minOrder: 'EGP 150.00',
      state: MarketVendorState.closed,
      opensAt: '09:00',
      distanceKm: 4.2,
    ),
  ];

  static final home = MarketHome(
    address: 'Home · 9 Road 233, Maadi',
    located: true,
    kinds: [
      MarketKindTile(
        id: 'food',
        title: 'Food',
        subtitle: '120+ restaurants',
        imageUrl: picture('art-dish-burger.png'),
        kind: MarketVendorKind.restaurant,
      ),
      MarketKindTile(
        id: 'market',
        title: 'Market',
        subtitle: 'Groceries in 20 min',
        imageUrl: picture('art-item-fruit.png'),
        badge: 'New',
        kind: MarketVendorKind.grocery,
      ),
      MarketKindTile(
        id: 'sweets',
        title: 'Sweets',
        imageUrl: picture('art-dish-baklava.png'),
      ),
      MarketKindTile(
        id: 'coffee',
        title: 'Coffee',
        imageUrl: picture('art-drink-latte.png'),
      ),
      MarketKindTile(
        id: 'bakery',
        title: 'Bakery',
        imageUrl: picture('art-item-bread.png'),
      ),
    ],
    offers: [
      MarketOffer(
        id: 'lunch',
        title: 'Up to 40% off',
        text: 'Lunch from 30 restaurants near you, until 4 pm.',
        imageUrl: picture('art-dish-wrap.png'),
        from: '#FF8A3D',
        to: '#E4472B',
        code: 'LUNCH40',
      ),
      MarketOffer(
        id: 'weekend',
        title: 'Free delivery',
        text: 'Every order this weekend, from every shop.',
        imageUrl: picture('art-banner-delivery.png'),
        from: '#2C6CDB',
        to: '#143B8F',
      ),
      MarketOffer(
        id: 'market',
        title: 'Fresh market week',
        text: 'Fruit and vegetables at their best prices.',
        imageUrl: picture('art-item-veg.png'),
        from: '#2E9B62',
        to: '#156B43',
        vendorId: 'fresh-basket',
      ),
    ],
    cuisines: [
      MarketCuisine(
        id: 'burgers',
        name: 'Burgers',
        imageUrl: picture('art-dish-burger.png'),
      ),
      MarketCuisine(
        id: 'breakfast',
        name: 'Breakfast',
        imageUrl: picture('art-dish-breakfast.png'),
      ),
      MarketCuisine(
        id: 'wraps',
        name: 'Wraps',
        imageUrl: picture('art-dish-wrap.png'),
      ),
      MarketCuisine(
        id: 'desserts',
        name: 'Desserts',
        imageUrl: picture('art-dish-cheesecake.png'),
      ),
      MarketCuisine(
        id: 'soups',
        name: 'Soups',
        imageUrl: picture('art-dish-soup.png'),
      ),
      MarketCuisine(
        id: 'coffee',
        name: 'Coffee',
        imageUrl: picture('art-drink-coffee.png'),
      ),
      MarketCuisine(
        id: 'bakery',
        name: 'Bakery',
        imageUrl: picture('art-dish-simit.png'),
      ),
    ],
    vendors: vendors,
    reorders: const [
      MarketReorder(
        vendorId: 'ember-bun',
        summary: '2× Smoked double, fries',
        total: 'EGP 640.00',
        when: 'Last Friday',
      ),
      MarketReorder(
        vendorId: 'fresh-basket',
        summary: 'Weekly basket · 14 items',
        total: 'EGP 1,185.00',
        when: '3 days ago',
      ),
    ],
  );

  /// 115 What the search finds among the samples: places by their name,
  /// dishes and products by theirs, each with the place that sells it.
  static MarketSearchResults search(String query) {
    final q = query.trim().toLowerCase();
    bool has(String name) => q.isNotEmpty && name.toLowerCase().contains(q);
    return MarketSearchResults(
      places: [
        for (final v in vendors)
          if (has(v.name)) v,
      ],
      items: [
        for (final v in vendors)
          for (final shelf in page(v.id).shelves)
            for (final item in shelf.items)
              if (has(item.name)) MarketFound(vendor: v, item: item),
      ].take(30).toList(),
    );
  }

  /// A vendor's page: a menu for a restaurant, aisles for a shop.
  static MarketVendorPage page(String id) {
    final vendor = home.vendor(id) ?? vendors.first;
    if (vendor.sellsGoods) {
      return MarketVendorPage(
        vendor: vendor,
        currency: 'EGP',
        address: 'Road 9, Maadi',
        hours: '08:00–01:00',
        shelves: _aisles,
      );
    }
    return MarketVendorPage(
      vendor: vendor,
      currency: 'EGP',
      about: 'Smash burgers on brioche, grilled to order.',
      address: 'Road 9, Maadi',
      hours: '12:00–02:00',
      shelves: _menu,
    );
  }

  static final _menu = <MarketShelf>[
    MarketShelf(
      id: 'popular',
      name: 'Popular',
      items: [
        MarketItem(
          id: 'smoked-double',
          name: 'Smoked double',
          description: 'Two smashed patties, smoked cheddar, pickles.',
          imageUrl: picture('art-dish-burger.png'),
          price: 'EGP 265.00',
          priceValue: 265.0,
          oldPrice: 'EGP 320.00',
          hasChoices: true,
          popular: true,
          badge: 'Best seller',
        ),
        MarketItem(
          id: 'chicken-wrap',
          name: 'Crispy chicken wrap',
          description: 'Garlic sauce, slaw, a squeeze of lemon.',
          imageUrl: picture('art-dish-wrap.png'),
          price: 'EGP 175.00',
          priceValue: 175.0,
          hasChoices: true,
          popular: true,
        ),
      ],
    ),
    MarketShelf(
      id: 'burgers',
      name: 'Burgers',
      items: [
        MarketItem(
          id: 'classic',
          name: 'The classic',
          description: 'One patty, lettuce, tomato, house sauce.',
          imageUrl: picture('art-dish-burger.png'),
          price: 'EGP 195.00',
          priceValue: 195.0,
          hasChoices: true,
        ),
        MarketItem(
          id: 'mushroom',
          name: 'Mushroom & Swiss',
          description: 'Sautéed mushrooms, Swiss cheese, truffle mayo.',
          imageUrl: picture('art-dish-burger.png'),
          price: 'EGP 235.00',
          priceValue: 235.0,
          hasChoices: true,
          inStock: false,
        ),
      ],
    ),
    MarketShelf(
      id: 'sides',
      name: 'Sides & drinks',
      items: [
        MarketItem(
          id: 'soup',
          name: 'Lentil soup',
          imageUrl: picture('art-dish-soup.png'),
          price: 'EGP 85.00',
          priceValue: 85.0,
        ),
        MarketItem(
          id: 'latte',
          name: 'Iced latte',
          imageUrl: picture('art-drink-latte.png'),
          price: 'EGP 90.00',
          priceValue: 90.0,
        ),
      ],
    ),
  ];

  static final _aisles = <MarketShelf>[
    MarketShelf(
      id: 'fruit',
      name: 'Fruit & vegetables',
      imageUrl: picture('art-item-fruit.png'),
      items: [
        MarketItem(
          id: 'apples',
          name: 'Red apples',
          imageUrl: picture('art-item-fruit.png'),
          price: 'EGP 65.00',
          priceValue: 65.0,
          oldPrice: 'EGP 80.00',
          unit: MarketUnit.kg,
          step: 0.5,
          badge: '−19%',
        ),
        MarketItem(
          id: 'veg-box',
          name: 'Vegetable box',
          imageUrl: picture('art-item-veg.png'),
          price: 'EGP 95.00',
          priceValue: 95.0,
        ),
      ],
    ),
    MarketShelf(
      id: 'bakery',
      name: 'Bakery',
      imageUrl: picture('art-item-bread.png'),
      items: [
        MarketItem(
          id: 'baguette',
          name: 'Baguette',
          imageUrl: picture('art-item-bread.png'),
          price: 'EGP 25.00',
          priceValue: 25.0,
        ),
        MarketItem(
          id: 'simit',
          name: 'Sesame ring',
          imageUrl: picture('art-dish-simit.png'),
          price: 'EGP 15.00',
          priceValue: 15.0,
        ),
      ],
    ),
    MarketShelf(
      id: 'coffee',
      name: 'Coffee & tea',
      imageUrl: picture('art-product-coffee.png'),
      items: [
        MarketItem(
          id: 'beans',
          name: 'Espresso beans',
          imageUrl: picture('art-product-coffee.png'),
          price: 'EGP 420.00',
          priceValue: 420.0,
          unit: MarketUnit.kg,
          step: 0.25,
        ),
        MarketItem(
          id: 'tea',
          name: 'Black tea',
          imageUrl: picture('art-product-tea.png'),
          price: 'EGP 75.00',
          priceValue: 75.0,
        ),
      ],
    ),
  ];
}
