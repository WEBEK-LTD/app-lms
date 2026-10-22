/// 82.1 Only the app preview (the web build) is told about drafts: the
/// phone apps never get these.
Stream<void> draftSavedMessages(String platformOrigin) => const Stream.empty();
