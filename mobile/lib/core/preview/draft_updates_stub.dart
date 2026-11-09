/// 82.1 Only the app preview (the web build) is told about drafts: the
/// phone apps never get these.
Stream<void> draftSavedMessages(String platformOrigin) => const Stream.empty();

/// 1.2 Only the app preview tells the editor which block was pressed.
void postBlockTapped(String platformOrigin, String page, String block) {}
