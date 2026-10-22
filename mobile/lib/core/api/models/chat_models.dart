import 'json.dart';

/// 77 Chat with the business and, in academies, course groups
/// (`Config.chat`). Missing when the app's plan has no chat or the owner
/// turned it off.
class ChatConfig {
  const ChatConfig({
    required this.baseUrl,
    required this.session,
    required this.groups,
  });

  factory ChatConfig.fromJson(Json json) => ChatConfig(
    baseUrl: reqString(json, 'base_url'),
    session:
        ChatSessionKind.fromWire(json['session']) ??
        ChatSessionKind.accessToken,
    groups: boolOr(json, 'groups', false),
  );

  /// Where the Chat endpoints are (Yallapp's hosted API for the app).
  final String baseUrl;
  final ChatSessionKind session;

  /// The academy turned on course groups.
  final bool groups;
}

/// How the app signs its chat requests: the app's own access token (hosted
/// API, Yallapp sign-in) or a chat token from the WordPress site.
enum ChatSessionKind {
  accessToken,
  site;

  static ChatSessionKind? fromWire(Object? wire) => switch (wire) {
    'access_token' => accessToken,
    'site' => site,
    _ => null,
  };
}

/// A chat token from the site (`POST /chat/session`, WordPress).
class ChatSession {
  const ChatSession({
    required this.token,
    required this.expiresAt,
    required this.baseUrl,
  });

  factory ChatSession.fromJson(Json json) => ChatSession(
    token: reqString(json, 'token'),
    expiresAt: reqDate(json, 'expires_at'),
    baseUrl: reqString(json, 'base_url'),
  );

  final String token;
  final DateTime expiresAt;
  final String baseUrl;
}

enum ChatConversationKind { direct, group }

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.kind,
    required this.title,
    required this.unreadCount,
    required this.canSend,
    required this.updatedAt,
    this.imageUrl,
    this.courseId,
    this.memberCount,
    this.lastMessage,
  });

  factory ChatConversation.fromJson(Json json) => ChatConversation(
    id: reqString(json, 'id'),
    kind: enumFrom(
      ChatConversationKind.values,
      json['kind'],
      ChatConversationKind.direct,
    ),
    title: reqString(json, 'title'),
    imageUrl: optString(json, 'image_url'),
    courseId: optString(json, 'course_id'),
    memberCount: optInt(json, 'member_count'),
    lastMessage: optObject(json, 'last_message', ChatMessage.fromJson),
    unreadCount: intOr(json, 'unread_count', 0),
    canSend: boolOr(json, 'can_send', true),
    updatedAt: reqDate(json, 'updated_at'),
  );

  final String id;
  final ChatConversationKind kind;

  /// The business's name, or the course's.
  final String title;
  final String? imageUrl;
  final String? courseId;
  final int? memberCount;
  final ChatMessage? lastMessage;
  final int unreadCount;

  /// False while the business blocked the person.
  final bool canSend;
  final DateTime updatedAt;

  bool get isGroup => kind == ChatConversationKind.group;
}

class ChatConversations {
  const ChatConversations({required this.items, required this.unreadCount});

  factory ChatConversations.fromJson(Json json) => ChatConversations(
    items: listOf(json, 'items', ChatConversation.fromJson),
    unreadCount: intOr(json, 'unread_count', 0),
  );

  final List<ChatConversation> items;
  final int unreadCount;
}

enum ChatSenderKind { member, business }

class ChatSender {
  const ChatSender({
    required this.kind,
    required this.name,
    this.memberId,
    this.imageUrl,
  });

  factory ChatSender.fromJson(Json json) => ChatSender(
    kind: enumFrom(ChatSenderKind.values, json['kind'], ChatSenderKind.member),
    memberId: optString(json, 'member_id'),
    name: optString(json, 'name') ?? '',
    imageUrl: optString(json, 'image_url'),
  );

  final ChatSenderKind kind;
  final String? memberId;

  /// The member's name; the business's name for its team.
  final String name;
  final String? imageUrl;

  bool get isBusiness => kind == ChatSenderKind.business;
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.sender,
    required this.mine,
    required this.deleted,
    required this.createdAt,
    this.clientId,
    this.text,
    this.attachment,
  });

  factory ChatMessage.fromJson(Json json) => ChatMessage(
    id: reqString(json, 'id'),
    conversationId: reqString(json, 'conversation_id'),
    clientId: optString(json, 'client_id'),
    sender: ChatSender.fromJson(asJson(json['sender'], 'sender')),
    mine: boolOr(json, 'mine', false),
    text: optString(json, 'text'),
    attachment: optObject(json, 'attachment', ChatAttachment.fromJson),
    deleted: boolOr(json, 'deleted', false),
    createdAt: reqDate(json, 'created_at'),
  );

  /// Sortable: later messages have greater IDs (digits, as a string).
  final String id;
  final String conversationId;
  final String? clientId;
  final ChatSender sender;
  final bool mine;
  final String? text;
  final ChatAttachment? attachment;
  final bool deleted;
  final DateTime createdAt;

  /// Orders two message IDs (numbers written as strings).
  static int compareIds(String a, String b) {
    final x = BigInt.tryParse(a);
    final y = BigInt.tryParse(b);
    if (x != null && y != null) return x.compareTo(y);
    return a.length != b.length ? a.length - b.length : a.compareTo(b);
  }
}

enum ChatAttachmentKind { image, video, audio, file }

class ChatAttachment {
  const ChatAttachment({
    required this.kind,
    required this.name,
    required this.contentType,
    required this.sizeBytes,
    required this.url,
    required this.urlExpiresAt,
    this.durationSeconds,
  });

  factory ChatAttachment.fromJson(Json json) => ChatAttachment(
    kind: enumFrom(
      ChatAttachmentKind.values,
      json['kind'],
      ChatAttachmentKind.file,
    ),
    name: optString(json, 'name') ?? '',
    contentType: optString(json, 'content_type') ?? '',
    sizeBytes: intOr(json, 'size_bytes', 0),
    durationSeconds: optInt(json, 'duration_seconds'),
    url: reqString(json, 'url'),
    urlExpiresAt: reqDate(json, 'url_expires_at'),
  );

  final ChatAttachmentKind kind;
  final String name;
  final String contentType;
  final int sizeBytes;
  final int? durationSeconds;

  /// A signed link, valid until [urlExpiresAt]; the next list gives a new one.
  final String url;
  final DateTime urlExpiresAt;
}

class ChatMessagesPage {
  const ChatMessagesPage({
    required this.items,
    required this.hasMore,
    required this.pollAfterSeconds,
  });

  factory ChatMessagesPage.fromJson(Json json) => ChatMessagesPage(
    items: listOf(json, 'items', ChatMessage.fromJson),
    hasMore: boolOr(json, 'has_more', false),
    pollAfterSeconds: intOr(json, 'poll_after_seconds', 5).clamp(3, 15),
  );

  final List<ChatMessage> items;
  final bool hasMore;

  /// 3 while messages come, up to 15 when it's quiet.
  final int pollAfterSeconds;
}

class ChatMember {
  const ChatMember({
    required this.id,
    required this.name,
    required this.business,
    required this.blocked,
    this.imageUrl,
  });

  factory ChatMember.fromJson(Json json) => ChatMember(
    id: reqString(json, 'id'),
    name: optString(json, 'name') ?? '',
    imageUrl: optString(json, 'image_url'),
    business: boolOr(json, 'business', false),
    blocked: boolOr(json, 'blocked', false),
  );

  final String id;
  final String name;
  final String? imageUrl;

  /// The business (its team): never blocked.
  final bool business;

  /// The person asking blocked this member.
  final bool blocked;
}

/// Why a message is reported.
enum ChatReportReason { spam, abuse, inappropriate, other }

class ChatUpload {
  const ChatUpload({
    required this.id,
    required this.kind,
    required this.uploadUrl,
    required this.chunkBytes,
    required this.size,
  });

  factory ChatUpload.fromJson(Json json) => ChatUpload(
    id: reqString(json, 'id'),
    kind: enumFrom(
      ChatAttachmentKind.values,
      json['kind'],
      ChatAttachmentKind.file,
    ),
    uploadUrl: reqString(json, 'upload_url'),
    chunkBytes: intOr(json, 'chunk_bytes', 5 * 1024 * 1024),
    size: reqInt(json, 'size'),
  );

  final String id;
  final ChatAttachmentKind kind;
  final String uploadUrl;
  final int chunkBytes;
  final int size;
}
