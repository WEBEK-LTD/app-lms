import 'dart:async';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../../core/api/models/models.dart';
import 'chat_api.dart';

/// 77 What the chat takes, by content type (the platform's `CHAT_KINDS`),
/// and the largest file of each kind.
const chatFileTypes = <String, String>{
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  'gif': 'image/gif',
  'mp4': 'video/mp4',
  'm4v': 'video/mp4',
  'mov': 'video/quicktime',
  'webm': 'video/webm',
  'm4a': 'audio/mp4',
  'aac': 'audio/aac',
  'mp3': 'audio/mpeg',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt': 'text/plain',
};

/// The documents the file picker offers.
const chatDocumentExtensions = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
];

const _mb = 1024 * 1024;

/// The content type the chat takes for [name] ([given] when the chat takes
/// it), or null when the chat doesn't take this kind of file.
String? chatTypeOf(String name, [String? given]) {
  final type = given?.toLowerCase().split(';').first.trim();
  if (type != null && chatFileTypes.containsValue(type)) return type;
  final dot = name.lastIndexOf('.');
  if (dot < 0) return null;
  return chatFileTypes[name.substring(dot + 1).toLowerCase()];
}

/// The kind of attachment a content type makes.
ChatAttachmentKind chatKindOf(String type) {
  if (type.startsWith('image/')) return ChatAttachmentKind.image;
  if (type.startsWith('video/')) return ChatAttachmentKind.video;
  if (type.startsWith('audio/')) return ChatAttachmentKind.audio;
  return ChatAttachmentKind.file;
}

/// The largest file of a kind: pictures 20 MB, videos 200 MB, voice
/// messages 20 MB, files 50 MB.
int chatMaxBytes(String type) => switch (chatKindOf(type)) {
  ChatAttachmentKind.image => 20 * _mb,
  ChatAttachmentKind.video => 200 * _mb,
  ChatAttachmentKind.audio => 20 * _mb,
  ChatAttachmentKind.file => 50 * _mb,
};

/// A file on the phone (or in the browser), read in chunks.
class PickedChatFile extends ChatFile {
  PickedChatFile(
    this._file, {
    required this.name,
    required this.size,
    required this.type,
    this.durationSeconds,
  });

  final XFile _file;
  @override
  final String name;
  @override
  final int size;
  @override
  final String type;
  @override
  final int? durationSeconds;

  /// The local path, for showing a picture before it's sent.
  String get path => _file.path;

  @override
  Future<List<int>> read(int start, int end) async {
    final out = BytesBuilder(copy: false);
    await for (final part in _file.openRead(start, end)) {
      out.add(part);
    }
    return out.takeBytes();
  }

  /// [file] when the chat takes its type (with the content type the chat
  /// knows it by), else null.
  static Future<PickedChatFile?> of(XFile file, {int? durationSeconds}) async {
    final type = chatTypeOf(file.name, file.mimeType);
    if (type == null) return null;
    return PickedChatFile(
      file,
      name: file.name,
      size: await file.length(),
      type: type,
      durationSeconds: durationSeconds,
    );
  }
}

/// What the person picked: a file the chat takes, or why not.
sealed class ChatPick {
  const ChatPick();
}

class ChatPicked extends ChatPick {
  const ChatPicked(this.file);
  final ChatFile file;
}

/// A kind of file the chat doesn't take.
class ChatPickUnsupported extends ChatPick {
  const ChatPickUnsupported();
}

enum ChatPickSource { gallery, camera, video, file }

/// Photos, videos and files from the phone. Replaced in tests.
abstract class ChatPicker {
  /// Null when the person changed their mind.
  Future<ChatPick?> pick(ChatPickSource source);
}

class DeviceChatPicker implements ChatPicker {
  final _images = ImagePicker();

  @override
  Future<ChatPick?> pick(ChatPickSource source) async {
    final XFile? file = switch (source) {
      // A quality makes iPhone pictures (HEIC) JPEG.
      ChatPickSource.gallery => await _images.pickMedia(imageQuality: 85),
      ChatPickSource.camera => await _images.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      ),
      ChatPickSource.video => await _images.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 10),
      ),
      ChatPickSource.file => (await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: chatDocumentExtensions,
      )).firstOrNull?.xFile,
    };
    if (file == null) return null;
    final picked = await PickedChatFile.of(file);
    return picked == null ? const ChatPickUnsupported() : ChatPicked(picked);
  }
}

final chatPickerProvider = Provider<ChatPicker>((ref) => DeviceChatPicker());

/// Voice messages: AAC in an MP4 file (`.m4a`), which Android, iPhones and
/// browsers all play. Replaced in tests.
abstract class VoiceRecorder {
  /// Asks for the microphone; false when the person said no.
  Future<bool> start();

  /// The recording, or null when nothing was recorded.
  Future<ChatFile?> stop();
  Future<void> cancel();
  void dispose();
}

class DeviceVoiceRecorder implements VoiceRecorder {
  final _recorder = AudioRecorder();
  DateTime? _started;

  @override
  Future<bool> start() async {
    if (!await _recorder.hasPermission()) return false;
    final name = 'voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
    final path = kIsWeb
        ? name
        : '${(await getTemporaryDirectory()).path}/$name';
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc, numChannels: 1),
      path: path,
    );
    _started = DateTime.now();
    return true;
  }

  @override
  Future<ChatFile?> stop() async {
    final path = await _recorder.stop();
    final started = _started;
    _started = null;
    if (path == null || started == null) return null;
    final seconds = DateTime.now().difference(started).inSeconds;
    if (seconds < 1) return null;
    final name = 'voice-${started.millisecondsSinceEpoch}.m4a';
    final file = XFile(path, name: name, mimeType: 'audio/mp4');
    return PickedChatFile(
      file,
      name: name,
      size: await file.length(),
      type: 'audio/mp4',
      durationSeconds: seconds,
    );
  }

  @override
  Future<void> cancel() async {
    _started = null;
    await _recorder.cancel();
  }

  @override
  void dispose() => unawaited(_recorder.dispose());
}

/// Makes a recorder for a conversation screen, which disposes it.
final voiceRecorderProvider = Provider<VoiceRecorder Function()>(
  (ref) => DeviceVoiceRecorder.new,
);
