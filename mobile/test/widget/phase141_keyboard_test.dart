import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/keyboard.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 141 The keyboard opens only when asked, and scrolling closes it: a screen,
/// a sheet or a dialog opening over a text field closes its keyboard, so it
/// doesn't open again by itself on the way back; another tab closes it; a
/// drag that scrolls closes it, the app moving a list or the scrolling inside
/// a text field doesn't.
void main() {
  Widget app(Widget home) => MaterialApp(
    navigatorObservers: [KeyboardRouteObserver()],
    builder: (context, child) => CloseKeyboardOnScroll(child: child!),
    home: home,
  );

  Future<void> focus(WidgetTester tester, Finder field) async {
    await tester.tap(field);
    await tester.pump();
    expect(textFieldFocused(), isTrue);
    expect(tester.testTextInput.isVisible, isTrue);
  }

  void expectClosed(WidgetTester tester, FocusNode field) {
    expect(field.hasFocus, isFalse);
    expect(textFieldFocused(), isFalse);
    expect(tester.testTextInput.isVisible, isFalse);
  }

  testWidgets(
    'a screen opened over a field closes its keyboard, closed on the way back',
    (tester) async {
      final field = FocusNode();
      addTearDown(field.dispose);
      await tester.pumpWidget(
        app(
          Builder(
            builder: (context) => Scaffold(
              body: Column(
                children: [
                  TextField(focusNode: field),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const Scaffold(body: Text('Product')),
                      ),
                    ),
                    child: const Text('Open'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      await focus(tester, find.byType(TextField));

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Product'), findsOneWidget);
      expectClosed(tester, field);

      Navigator.of(tester.element(find.text('Product'))).pop();
      await tester.pumpAndSettle();
      expect(find.text('Open'), findsOneWidget);
      expectClosed(tester, field);
    },
  );

  testWidgets('the screen that opens still focuses its own field', (
    tester,
  ) async {
    await tester.pumpWidget(
      app(
        Builder(
          builder: (context) => Scaffold(
            body: Column(
              children: [
                const TextField(key: Key('first')),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const Scaffold(
                        body: TextField(key: Key('search'), autofocus: true),
                      ),
                    ),
                  ),
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await focus(tester, find.byKey(const Key('first')));

    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();
    final search = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const Key('search')),
        matching: find.byType(EditableText),
      ),
    );
    expect(search.focusNode.hasFocus, isTrue);
    expect(tester.testTextInput.isVisible, isTrue);
  });

  testWidgets('a sheet opened over a field: its keyboard stays closed after', (
    tester,
  ) async {
    final field = FocusNode();
    addTearDown(field.dispose);
    await tester.pumpWidget(
      app(
        Builder(
          builder: (context) => Scaffold(
            body: Column(
              children: [
                TextField(focusNode: field),
                TextButton(
                  onPressed: () => showModalBottomSheet<void>(
                    context: context,
                    builder: (_) => const SizedBox(
                      height: 200,
                      child: Center(child: Text('Gift wrap')),
                    ),
                  ),
                  child: const Text('Options'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await focus(tester, find.byType(TextField));

    await tester.tap(find.text('Options'));
    await tester.pumpAndSettle();
    expect(find.text('Gift wrap'), findsOneWidget);
    expectClosed(tester, field);

    Navigator.of(tester.element(find.text('Gift wrap'))).pop();
    await tester.pumpAndSettle();
    expect(find.text('Gift wrap'), findsNothing);
    expectClosed(tester, field);
  });

  group('scrolling', () {
    Widget list(FocusNode field, {ScrollController? controller}) => app(
      Scaffold(
        body: ListView(
          controller: controller,
          children: [
            TextField(focusNode: field),
            for (var i = 0; i < 40; i++)
              SizedBox(height: 60, child: Text('Row $i')),
          ],
        ),
      ),
    );

    testWidgets('a drag that scrolls closes the keyboard', (tester) async {
      final field = FocusNode();
      addTearDown(field.dispose);
      await tester.pumpWidget(list(field));
      await focus(tester, find.byType(TextField));

      await tester.drag(find.text('Row 3'), const Offset(0, -300));
      await tester.pumpAndSettle();
      expectClosed(tester, field);
    });

    testWidgets("the app moving the list doesn't", (tester) async {
      final field = FocusNode();
      final controller = ScrollController();
      addTearDown(field.dispose);
      addTearDown(controller.dispose);
      await tester.pumpWidget(list(field, controller: controller));
      await focus(tester, find.byType(TextField));

      controller.jumpTo(120);
      await tester.pumpAndSettle();
      expect(field.hasFocus, isTrue);
      expect(tester.testTextInput.isVisible, isTrue);
    });

    testWidgets("scrolling inside a text field doesn't", (tester) async {
      final field = FocusNode();
      final text = TextEditingController(
        text: List.generate(30, (i) => 'Line $i').join('\n'),
      );
      addTearDown(field.dispose);
      addTearDown(text.dispose);
      await tester.pumpWidget(
        app(
          Scaffold(
            body: TextField(focusNode: field, controller: text, maxLines: 3),
          ),
        ),
      );
      await focus(tester, find.byType(TextField));

      await tester.drag(find.byType(TextField), const Offset(0, -40));
      await tester.pumpAndSettle();
      expect(field.hasFocus, isTrue);
      expect(tester.testTextInput.isVisible, isTrue);
    });
  });

  group('in a store app', () {
    Future<TestApp> open(WidgetTester tester) async {
      tester.view
        ..physicalSize = const Size(390, 844) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final app = TestApp(
        api: FakeApi(
          config: {...configJson(lms: null), 'store': storeConfigJson()},
        ),
        appType: AppType.store,
        signedIn: true,
      );
      await app.pump(tester);
      // 147 The search as a tab opens it (Leqaa's and Kech Flora's
      // Bouquets): its keyboard stays closed until the field is tapped.
      app.container.read(appRouterProvider).go('${Paths.shop}?focus=1');
      await TestApp.settle(tester, 20);
      expect(textFieldFocused(), isFalse);
      expect(tester.testTextInput.isVisible, isFalse);
      await tester.tap(find.byType(TextField).first);
      await TestApp.settle(tester, 20);
      expect(textFieldFocused(), isTrue);
      expect(tester.testTextInput.isVisible, isTrue);
      return app;
    }

    testWidgets('back from a product, the search keyboard stays closed', (
      tester,
    ) async {
      final app = await open(tester);
      final router = app.container.read(appRouterProvider);

      router.push(Paths.product(21));
      await TestApp.settle(tester, 20);
      expect(tester.testTextInput.isVisible, isFalse);

      router.pop();
      await TestApp.settle(tester, 20);
      expect(textFieldFocused(), isFalse);
      expect(tester.testTextInput.isVisible, isFalse);
    });

    testWidgets('another tab closes the keyboard', (tester) async {
      await open(tester);

      await tester.tap(
        find.descendant(
          of: find.byType(AppNavBar),
          matching: find.text('Home'),
        ),
      );
      await TestApp.settle(tester, 20);
      expect(textFieldFocused(), isFalse);
      expect(tester.testTextInput.isVisible, isFalse);
    });
  });
}
