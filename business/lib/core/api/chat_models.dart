import 'json.dart';

/// 77 The app's chat as the business sees it (owner.yaml, "Chat"): every
/// person who wrote, an academy's course groups, reports and the switches.

class ChatPerson {
  const ChatPerson({
    required this.id,
    required this.name,
    required this.blocked,
    this.imageUrl,
  });

  factory ChatPerson.fromJson(Json json) => ChatPerson(
    id: str(json, 'id'),
    name: str(json, 'name'),
    imageUrl: optStr(json, 'image_url'),
    blocked: boolean(json, 'blocked'),
  );

  final String id;
  final String name;
  final String? imageUrl;

  /// The business stopped them from sending.
  final bool blocked;
}

class ChatAttachment {
  const ChatAttachment({
    required this.kind,
    required this.name,
    required this.contentType,
    required this.sizeBytes,
    required this.url,
    required this.mediaId,
    this.durationSeconds,
  });

  factory ChatAttachment.fromJson(Json json) => ChatAttachment(
    kind: str(json, 'kind', 'file'),
    name: str(json, 'name'),
    contentType: str(json, 'content_type'),
    sizeBytes: integer(json, 'size_bytes'),
    durationSeconds: optInt(json, 'duration_seconds'),
    url: str(json, 'url'),
    mediaId: str(json, 'media_id'),
  );

  /// image, video, audio or file.
  final String kind;
  final String name;
  final String contentType;
  final int sizeBytes;
  final int? durationSeconds;
  final String url;
  final String mediaId;
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.fromBusiness,
    required this.senderName,
    required this.deleted,
    required this.reported,
    required this.createdAt,
    this.memberId,
    this.teamMember,
    this.clientId,
    this.text,
    this.attachment,
  });

  factory ChatMessage.fromJson(Json json) {
    final sender = optObject(json, 'sender') ?? const {};
    final attachment = optObject(json, 'attachment');
    return ChatMessage(
      id: str(json, 'id'),
      conversationId: str(json, 'conversation_id'),
      clientId: optStr(json, 'client_id'),
      fromBusiness: str(sender, 'kind') == 'business',
      memberId: optStr(sender, 'member_id'),
      senderName: str(sender, 'name'),
      teamMember: optStr(sender, 'team_member'),
      text: optStr(json, 'text'),
      attachment: attachment == null
          ? null
          : ChatAttachment.fromJson(attachment),
      deleted: boolean(json, 'deleted'),
      reported: boolean(json, 'reported'),
      createdAt: date(json, 'created_at'),
    );
  }

  /// Sortable: later messages have greater IDs.
  final String id;
  final String conversationId;
  final String? clientId;
  final bool fromBusiness;
  final String? memberId;
  final String senderName;

  /// Who on the team wrote a business message (the team sees it only).
  final String? teamMember;
  final String? text;
  final ChatAttachment? attachment;
  final bool deleted;

  /// It has an open report.
  final bool reported;
  final DateTime createdAt;

  /// Orders two message IDs (numbers written as strings).
  static int compareIds(String a, String b) {
    final x = BigInt.tryParse(a);
    final y = BigInt.tryParse(b);
    if (x != null && y != null) return x.compareTo(y);
    return a.compareTo(b);
  }

  ChatMessage asDeleted() => ChatMessage(
    id: id,
    conversationId: conversationId,
    clientId: clientId,
    fromBusiness: fromBusiness,
    memberId: memberId,
    senderName: senderName,
    teamMember: teamMember,
    deleted: true,
    reported: false,
    createdAt: createdAt,
  );
}

class ChatThread {
  const ChatThread({
    required this.id,
    required this.group,
    required this.title,
    required this.unreadCount,
    required this.updatedAt,
    this.imageUrl,
    this.person,
    this.memberCount,
    this.lastMessage,
    this.keepUntil,
    this.expiresOn,
  });

  factory ChatThread.fromJson(Json json) {
    final person = optObject(json, 'member');
    final last = optObject(json, 'last_message');
    return ChatThread(
      id: str(json, 'id'),
      group: str(json, 'kind') == 'group',
      title: str(json, 'title'),
      imageUrl: optStr(json, 'image_url'),
      person: person == null ? null : ChatPerson.fromJson(person),
      memberCount: optInt(json, 'member_count'),
      lastMessage: last == null ? null : ChatMessage.fromJson(last),
      unreadCount: integer(json, 'unread_count'),
      updatedAt: date(json, 'updated_at'),
      keepUntil: optStr(json, 'keep_until'),
      expiresOn: optStr(json, 'expires_on'),
    );
  }

  final String id;

  /// A course's group; else a person's conversation with the business.
  final bool group;

  /// The person's name, or the course's title.
  final String title;
  final String? imageUrl;
  final ChatPerson? person;
  final int? memberCount;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final DateTime updatedAt;

  /// Kept by the business until this day (YYYY-MM-DD).
  final String? keepUntil;

  /// When its oldest messages are deleted (YYYY-MM-DD).
  final String? expiresOn;
}

class ChatInbox {
  const ChatInbox({
    required this.items,
    required this.unreadCount,
    required this.openReports,
    required this.expiring,
    this.deleteOn,
  });

  factory ChatInbox.fromJson(Json json) {
    final expiring = optObject(json, 'expiring') ?? const {};
    return ChatInbox(
      items: listOf(json, 'items', ChatThread.fromJson),
      unreadCount: integer(json, 'unread_count'),
      openReports: integer(json, 'open_reports'),
      expiring: integer(expiring, 'conversations'),
      deleteOn: optStr(expiring, 'delete_on'),
    );
  }

  final List<ChatThread> items;
  final int unreadCount;

  /// Reports the business hasn't dealt with.
  final int openReports;

  /// Conversations whose oldest messages are deleted within 30 days…
  final int expiring;

  /// …the first of them on this day (YYYY-MM-DD).
  final String? deleteOn;
}

class ChatMessagesPage {
  const ChatMessagesPage({
    required this.items,
    required this.hasMore,
    required this.pollAfterSeconds,
  });

  factory ChatMessagesPage.fromJson(Json json) => ChatMessagesPage(
    items: listOf(json, 'items', ChatMessage.fromJson),
    hasMore: boolean(json, 'has_more'),
    pollAfterSeconds: integer(json, 'poll_after_seconds', 5).clamp(3, 15),
  );

  final List<ChatMessage> items;
  final bool hasMore;
  final int pollAfterSeconds;
}

class ChatReport {
  const ChatReport({
    required this.id,
    required this.message,
    required this.reporter,
    required this.reason,
    required this.open,
    required this.createdAt,
    this.conversationTitle,
    this.note,
    this.outcome,
  });

  factory ChatReport.fromJson(Json json) => ChatReport(
    id: str(json, 'id'),
    message: ChatMessage.fromJson(optObject(json, 'message') ?? const {}),
    conversationTitle: optStr(json, 'conversation_title'),
    reporter: ChatPerson.fromJson(optObject(json, 'reporter') ?? const {}),
    reason: str(json, 'reason', 'other'),
    note: optStr(json, 'note'),
    open: str(json, 'status', 'open') == 'open',
    outcome: optStr(json, 'outcome'),
    createdAt: date(json, 'created_at'),
  );

  final String id;
  final ChatMessage message;
  final String? conversationTitle;
  final ChatPerson reporter;

  /// spam, abuse, inappropriate or other.
  final String reason;
  final String? note;
  final bool open;

  /// dismissed, deleted or blocked, once closed.
  final String? outcome;
  final DateTime createdAt;
}

/// What the business does with a report.
enum ChatReportAction {
  dismiss('dismiss'),
  deleteMessage('delete_message'),
  blockSender('block_sender');

  const ChatReportAction(this.wire);
  final String wire;
}

class ChatSettings {
  const ChatSettings({
    required this.available,
    required this.enabled,
    this.courseGroups,
  });

  factory ChatSettings.fromJson(Json json) => ChatSettings(
    available: boolean(json, 'available'),
    enabled: boolean(json, 'enabled', true),
    courseGroups: json['course_groups'] is bool
        ? json['course_groups'] as bool
        : null,
  );

  /// The app's plan has chat (Pro and Business).
  final bool available;
  final bool enabled;

  /// Academies; null for other app types.
  final bool? courseGroups;
}
