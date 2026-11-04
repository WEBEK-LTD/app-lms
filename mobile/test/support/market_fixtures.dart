/// 115 Marketplace pages for the tests and the screenshots.
library;

/// The marketplace home as a Studio template would make it.
Map<String, dynamic> homePage() {
  Map<String, dynamic> market(
    String id,
    Map<String, dynamic> market, {
    String? title,
    String? text,
    double top = 26,
  }) => {
    'id': id,
    'type': 'market',
    'market': market,
    'title': ?title,
    'text': ?text,
    'margin': {'top': top, 'end': 0, 'bottom': 0, 'start': 0},
  };
  return {
    'background': '#F6F3EE',
    'dark_background': '#0F0E1A',
    'body': {
      'id': 'body',
      'type': 'column',
      'children': [
        market(
          'hero',
          {'section': 'address'},
          title: 'Hungry? Order in minutes.',
          top: 0,
        ),
        market('kinds', {'section': 'kinds'}, top: 14),
        market('offers', {'section': 'offers'}, title: 'Today’s offers'),
        market(
          'fast',
          {
            'section': 'vendors',
            'style': 'spotlight',
            'kind': 'restaurant',
            'sort': 'fastest',
            'limit': 6,
          },
          title: 'Fastest near you',
          text: 'Hot food at your door in under 30 min',
        ),
        market('cuisines', {'section': 'cuisines'}, title: 'What’s your mood?'),
        market(
          'club',
          {'section': 'club'},
          title: 'Free delivery on every order',
          text: 'Join the club for free delivery and members’ offers.',
        ),
        market(
          'shops',
          {
            'section': 'vendors',
            'style': 'tiles',
            'kind': 'grocery',
            'limit': 6,
          },
          title: 'Supermarkets & shops',
          text: 'Groceries in about 20 minutes',
        ),
        market('again', {'section': 'reorder'}, title: 'Order again'),
        market('all', {
          'section': 'vendors',
          'style': 'list',
          'kind': 'restaurant',
        }, title: 'All restaurants'),
      ],
    },
  };
}
