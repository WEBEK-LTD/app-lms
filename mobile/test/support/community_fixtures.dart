/// 235 A small community for the Community app type's tests and its demo's
/// screenshots (Lamma, a home bakers' community): the answers of the
/// tenant's Community API (`/community/v1/...`), by method and path.
Map<String, dynamic> communityMember(String id, String name) => {
  'id': id,
  'display_name': name,
  'username': name.split(' ').first.toLowerCase(),
};

dynamic communityAnswer(
  String method,
  String path,
  Map<String, dynamic>? query,
  Object? body,
) => switch ((method, path)) {
  ('POST', '/community/v1/auth/app') => {
    'access_token': 'community-token',
    'refresh_token': 'r',
  },
  ('GET', '/community/v1/feed') => {
    'items': [
      {
        'kind': 'post',
        'id': 'p1',
        'post': {
          'id': 'p1',
          'author': communityMember('m1', 'Selin Kaya'),
          'body': 'Our new spring menu is out',
          'comment_count': 3,
        },
      },
      {
        'kind': 'question',
        'id': 'q1',
        'question': {
          'id': 'q1',
          'author': communityMember('m2', 'Omar Haddad'),
          'title': 'Do you deliver on Sundays?',
          'excerpt': 'Asking for a party',
          'answer_count': 1,
        },
      },
      {
        'kind': 'post',
        'id': 'p2',
        'post': {
          'id': 'p2',
          'author': communityMember('m3', 'Mariam Saleh'),
          'body': 'Tip: rest the dough overnight in the fridge and the crust comes out crisp every time.',
          'comment_count': 12,
        },
      },
    ],
    'next_cursor': null,
  },
  ('GET', '/community/v1/qa/questions') => {
    'items': [
      {
        'id': 'q1',
        'author': communityMember('m2', 'Omar Haddad'),
        'title': 'Do you deliver on Sundays?',
        'answer_count': 1,
      },
      {
        'id': 'q2',
        'author': communityMember('m4', 'Leyla Aksoy'),
        'title': 'Which flour works best for simit?',
        'answer_count': 4,
      },
    ],
  },
  ('GET', '/community/v1/qa/questions/q1') => {
    'id': 'q1',
    'author': communityMember('m2', 'Omar Haddad'),
    'title': 'Do you deliver on Sundays?',
    'body': 'Asking for a party',
    'answers': [
      {
        'id': 'a1',
        'author': communityMember('m1', 'Selin Kaya'),
        'body': 'Yes, until 8 pm.',
        'accepted': true,
      },
    ],
  },
  ('GET', '/community/v1/groups') => {
    'items': [
      {
        'id': 'g1',
        'name': 'Home bakers',
        'description': 'Recipes and tips',
        'member_count': 12,
        'visibility': 'public',
        'standing': {'role': null, 'requested': false},
      },
      {
        'id': 'g2',
        'name': 'Sourdough club',
        'description': 'Starters, feeding and the long rise',
        'member_count': 48,
        'visibility': 'private',
        'standing': {'role': 'member', 'requested': false},
      },
    ],
  },
  ('GET', '/community/v1/me') => communityMember('me', 'Deniz'),
  ('GET', '/community/v1/messages/conversations') => {
    'items': [
      {
        'id': 'c1',
        'kind': 'direct',
        'title': null,
        'members': [communityMember('m1', 'Selin')],
        'last_message': {'body': 'See you there'},
        'unread': 1,
      },
    ],
  },
  _ => const <String, dynamic>{},
};
