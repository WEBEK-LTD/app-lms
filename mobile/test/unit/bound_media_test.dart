import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/providers.dart';

/// Roadmap 62: Media library videos bound to the student.
void main() {
  TokenManager tokens(StoredTokens? stored) => TokenManager(
    store: MemoryTokenStore(stored),
    refresh: (_) async => throw UnimplementedError(),
  );

  final signedIn = StoredTokens(
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  );

  test('a bound link opens with the access token, others with nothing', () async {
    const bound =
        'https://yallapp.com.tr/media/v/a/b.mp4?expires=1&t=3280399047913500&sig=x';
    const plain = 'https://yallapp.com.tr/media/v/a/b.mp4?expires=1&sig=x';
    expect(await boundMediaHeaders(tokens(signedIn), bound), {
      'Authorization': 'Bearer access-1',
    });
    expect(await boundMediaHeaders(tokens(signedIn), plain), isEmpty);
    expect(await boundMediaHeaders(tokens(null), bound), isEmpty);
    expect(boundMediaHeader, 'X-Yallapp-Bound-Media');
  });
}
