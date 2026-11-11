import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/file_viewer.dart';
import '../data/bus_library_providers.dart';
import '../data/school_providers.dart' show schoolConfigProvider;
import '../widgets/school_widgets.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 113.11 The school's library in the app: its books searched and by
/// category, a book with its copies on the shelf, its e-book read in the
/// app's own viewer and a reservation (a parent's for a child), and the
/// books borrowed, reserved and returned by whoever the person follows.

/// The library's entry, in the School and Classroom tabs (113.3's Staff tab
/// can take it too); nothing when the school has no books.
class LibraryTile extends ConsumerWidget {
  const LibraryTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(schoolConfigProvider);
    if (config == null || !config.library) return const SizedBox.shrink();
    return SettingsTile(
      key: const ValueKey('school-library'),
      icon: AppIcons.library,
      title: context.l10n.libraryTitle,
      onTap: () => context.push(Paths.schoolPart('library')),
    );
  }
}

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  final _search = TextEditingController();
  String _query = '';
  String _category = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final q = (query: _query, category: _category);
    final async = ref.watch(libraryBooksProvider(q));
    final categories = async.value?.categories ?? const <String>[];
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(l10n.libraryTitle),
          actions: [
            IconButton(
              key: const ValueKey('library-borrowed'),
              tooltip: l10n.libraryBorrowed,
              icon: const AppIcon(AppIcons.bookmark),
              onPressed: () => context.push(Paths.schoolPart('library-loans')),
            ),
          ],
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: TextField(
                key: const ValueKey('library-search'),
                controller: _search,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l10n.librarySearchHint,
                  prefixIcon: const AppIcon(AppIcons.search),
                ),
                onSubmitted: (text) => setState(() => _query = text.trim()),
              ),
            ),
            if (categories.isNotEmpty)
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    for (final c in ['', ...categories])
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 8),
                        child: ChoiceChip(
                          key: ValueKey('library-category-$c'),
                          label: Text(c.isEmpty ? l10n.libraryAll : c),
                          selected: _category == c,
                          onSelected: (_) => setState(() => _category = c),
                        ),
                      ),
                  ],
                ),
              ),
            Expanded(
              child: switch (async) {
                AsyncValue(value: final page?) when page.items.isEmpty =>
                  MessageView(
                    icon: AppIcons.library,
                    title: l10n.libraryNoBooks,
                    message: l10n.libraryNoBooksMessage,
                  ),
                AsyncValue(value: final page?) => RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(libraryBooksProvider(q)),
                  child: ListView.separated(
                    key: const ValueKey('library-books'),
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    itemCount: page.items.length,
                    separatorBuilder: (_, _) =>
                        Divider(height: 1, color: p.divider),
                    itemBuilder: (context, i) => _BookTile(book: page.items[i]),
                  ),
                ),
                AsyncValue(error: final e?) => ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(libraryBooksProvider(q)),
                ),
                _ => const LoadingView(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.url, this.width = 48});

  final String? url;
  final double width;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final height = width * 1.4;
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: url != null
          ? AppNetworkImage(url: url, width: width, height: height)
          : Container(
              width: width,
              height: height,
              color: p.placeholderFor(4),
              alignment: Alignment.center,
              child: AppIcon(AppIcons.ebook, size: width / 2, color: p.text),
            ),
    );
  }
}

class _BookTile extends StatelessWidget {
  const _BookTile({required this.book});

  final LibraryBook book;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return InkWell(
      key: ValueKey('library-book-${book.id}'),
      onTap: () => context.push(Paths.libraryBook(book.id)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            _Cover(url: book.coverUrl),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    book.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  Text(
                    book.author,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    book.available > 0
                        ? l10n.libraryAvailable(book.available)
                        : l10n.libraryAllOut,
                    style: TextStyle(
                      fontSize: 13,
                      color: book.available > 0 ? p.success : p.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (book.ebook) SchoolPill(label: l10n.libraryEbook),
          ],
        ),
      ),
    );
  }
}

class LibraryBookScreen extends ConsumerStatefulWidget {
  const LibraryBookScreen({super.key, required this.bookId});

  final int bookId;

  @override
  ConsumerState<LibraryBookScreen> createState() => _LibraryBookScreenState();
}

class _LibraryBookScreenState extends ConsumerState<LibraryBookScreen> {
  bool _busy = false;

  Future<void> _reserve(LibraryBookDetail detail) async {
    final l10n = context.l10n;
    final held = detail.holds.map((h) => h.person?.id).toSet();
    final free = detail.borrowers.where((b) => !held.contains(b.id)).toList();
    if (free.isEmpty) return;
    var person = free.length == 1 ? free.first : null;
    if (person == null) {
      person = await showModalBottomSheet<LibraryPerson>(
        context: context,
        builder: (context) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: Text(
                  l10n.libraryReserveFor,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              for (final b in free)
                ListTile(
                  key: ValueKey('reserve-for-${b.id}'),
                  title: Text(b.name),
                  onTap: () => Navigator.of(context).pop(b),
                ),
            ],
          ),
        ),
      );
      if (person == null || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      final hold = await ref
          .read(yallappApiProvider)
          .holdLibraryBook(
            detail.book.id,
            personId: detail.borrowers.length > 1 ? person.id : null,
          );
      if (!mounted) return;
      showMessage(
        context,
        hold.status == LibraryHoldStatus.ready && hold.expiresAt != null
            ? l10n.libraryReservedReady(shortDate(hold.expiresAt!))
            : l10n.libraryReservedWaiting,
      );
      ref.invalidate(libraryBookProvider(widget.bookId));
      ref.invalidate(libraryLoansProvider(null));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel(LibraryHold hold) async {
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).cancelLibraryHold(hold.id);
      ref.invalidate(libraryBookProvider(widget.bookId));
      ref.invalidate(libraryLoansProvider(null));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _read(SchoolFile file) => openInViewer(
    context,
    name: file.name,
    mimeType: 'application/pdf',
    load: () => ref.read(attachmentFetcherProvider)(file.url),
  );

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(libraryBookProvider(widget.bookId));
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(async.value?.book.title ?? l10n.libraryTitle),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final detail?) => ListView(
            key: const ValueKey('library-book'),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Cover(url: detail.book.coverUrl, width: 84),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          detail.book.title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        Text(
                          detail.book.author,
                          style: TextStyle(
                            fontSize: 14,
                            color: p.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          [
                            if (detail.book.shelf != null)
                              l10n.libraryShelf(detail.book.shelf!),
                            ?detail.book.category,
                            ?detail.book.language,
                          ].join(' · '),
                          style: TextStyle(fontSize: 13, color: p.text),
                        ),
                        if (detail.book.isbn != null)
                          Text(
                            'ISBN ${detail.book.isbn}',
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textSecondary,
                            ),
                          ),
                        const SizedBox(height: 6),
                        Text(
                          l10n.libraryCopies(
                            detail.book.available,
                            detail.book.copies,
                          ),
                          key: const ValueKey('library-copies'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: detail.book.available > 0
                                ? p.success
                                : p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (detail.file != null) ...[
                FilledButton.icon(
                  key: const ValueKey('library-read'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  icon: const AppIcon(AppIcons.ebook, size: 20),
                  label: Text(l10n.libraryRead),
                  onPressed: () => _read(detail.file!),
                ),
                const SizedBox(height: 10),
              ],
              if (detail.borrowers.any(
                (b) => !detail.holds.any((h) => h.person?.id == b.id),
              ))
                OutlinedButton(
                  key: const ValueKey('library-reserve'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  onPressed: _busy || detail.book.copies == 0
                      ? null
                      : () => _reserve(detail),
                  child: Text(l10n.libraryReserve),
                ),
              for (final hold in detail.holds)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: AppCard(
                    key: ValueKey('library-hold-${hold.id}'),
                    padding: const EdgeInsets.fromLTRB(14, 10, 6, 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _holdLine(context, hold),
                          style: TextStyle(fontSize: 14, color: p.text),
                        ),
                        Align(
                          alignment: AlignmentDirectional.centerEnd,
                          child: TextButton(
                            onPressed: _busy ? null : () => _cancel(hold),
                            child: Text(l10n.libraryCancelHold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (detail.description != null) ...[
                const SizedBox(height: 20),
                SectionHeader(title: l10n.libraryAbout, size: 16),
                const SizedBox(height: 4),
                Text(
                  detail.description!,
                  style: TextStyle(fontSize: 14, height: 1.5, color: p.text),
                ),
              ],
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(libraryBookProvider(widget.bookId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

String _holdLine(BuildContext context, LibraryHold hold) {
  final l10n = context.l10n;
  final name = hold.person?.name ?? '';
  return hold.status == LibraryHoldStatus.ready && hold.expiresAt != null
      ? l10n.libraryHoldReady(name, shortDate(hold.expiresAt!))
      : l10n.libraryHoldWaiting(name);
}

/// The books out, reserved and returned of everyone the person follows (a
/// parent's children by name).
class LibraryLoansScreen extends ConsumerWidget {
  const LibraryLoansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(libraryLoansProvider(null));
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(leading: appBarBack(context), title: Text(l10n.libraryBorrowed)),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final loans?)
              when loans.current.isEmpty &&
                  loans.holds.isEmpty &&
                  loans.history.isEmpty =>
            MessageView(
              icon: AppIcons.library,
              title: l10n.libraryNoLoans,
              message: l10n.libraryNoLoansMessage,
            ),
          AsyncValue(value: final loans?) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(libraryLoansProvider(null)),
            child: ListView(
              key: const ValueKey('library-loans'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Text(
                  l10n.libraryLoanDays(loans.loanDays),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (loans.current.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SectionHeader(title: l10n.libraryOutNow, size: 16),
                  for (final loan in loans.current)
                    _LoanRow(loan: loan, named: loans.people.length > 1),
                ],
                if (loans.holds.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SectionHeader(title: l10n.libraryReservedSection, size: 16),
                  for (final hold in loans.holds)
                    ListTile(
                      key: ValueKey('loans-hold-${hold.id}'),
                      contentPadding: EdgeInsets.zero,
                      leading: _Cover(url: hold.book.coverUrl, width: 36),
                      title: Text(hold.book.title),
                      subtitle: Text(_holdLine(context, hold)),
                      onTap: () =>
                          context.push(Paths.libraryBook(hold.book.id)),
                    ),
                ],
                if (loans.history.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  SectionHeader(title: l10n.libraryReturned, size: 16),
                  for (final loan in loans.history)
                    _LoanRow(loan: loan, named: loans.people.length > 1),
                ],
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(libraryLoansProvider(null)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _LoanRow extends StatelessWidget {
  const _LoanRow({required this.loan, required this.named});

  final LibraryLoan loan;

  /// Says whose loan it is (a parent with several children).
  final bool named;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final when = loan.returnedAt != null
        ? l10n.libraryReturnedOn(shortDate(loan.returnedAt!))
        : loan.overdue
        ? l10n.libraryOverdue(isoDayLabel(loan.dueOn))
        : l10n.libraryDue(isoDayLabel(loan.dueOn));
    return ListTile(
      key: ValueKey('loan-${loan.id}'),
      contentPadding: EdgeInsets.zero,
      leading: _Cover(url: loan.book?.coverUrl, width: 36),
      title: Text(loan.book?.title ?? ''),
      subtitle: Text(
        [if (named && loan.person != null) loan.person!.name, when].join(' · '),
        style: TextStyle(
          color: loan.overdue && loan.returnedAt == null
              ? p.danger
              : p.textSecondary,
        ),
      ),
      onTap: loan.book == null
          ? null
          : () => context.push(Paths.libraryBook(loan.book!.id)),
    );
  }
}
