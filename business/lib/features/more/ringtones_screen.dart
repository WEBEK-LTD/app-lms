import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/providers.dart';
import '../../core/services/ringtones.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../../l10n/app_localizations.dart';

/// 207 A ringtone's name in the app's language.
String soundName(AppLocalizations l10n, String id) => switch (id) {
  'chime' => l10n.soundChime,
  'counter_bell' => l10n.soundCounterBell,
  'kitchen_ticket' => l10n.soundKitchenTicket,
  'marimba' => l10n.soundMarimba,
  'harp' => l10n.soundHarp,
  'digital' => l10n.soundDigital,
  'rush_hour' => l10n.soundRushHour,
  'cash_drawer' => l10n.soundCashDrawer,
  'doorbell' => l10n.soundDoorbell,
  'xylophone' => l10n.soundXylophone,
  'soft_pulse' => l10n.soundSoftPulse,
  'chirp' => l10n.soundChirp,
  'sunrise' => l10n.soundSunrise,
  'arcade' => l10n.soundArcade,
  'soft_drop' => l10n.soundDrop,
  'pop' => l10n.soundPop,
  'knock' => l10n.soundKnock,
  soundSilent => l10n.soundSilent,
  _ => l10n.soundDefault,
};

String groupName(AppLocalizations l10n, SoundGroup group) => switch (group) {
  SoundGroup.orders => l10n.ringGroupOrders,
  SoundGroup.bookings => l10n.ringGroupBookings,
  SoundGroup.cancelled => l10n.ringGroupCancelled,
  SoundGroup.messages => l10n.ringGroupMessages,
  SoundGroup.other => l10n.ringGroupOther,
};

String groupHelp(AppLocalizations l10n, SoundGroup group) => switch (group) {
  SoundGroup.orders => l10n.ringGroupOrdersHelp,
  SoundGroup.bookings => l10n.ringGroupBookingsHelp,
  SoundGroup.cancelled => l10n.ringGroupCancelledHelp,
  SoundGroup.messages => l10n.ringGroupMessagesHelp,
  SoundGroup.other => l10n.ringGroupOtherHelp,
};

IconData groupIcon(SoundGroup group) => switch (group) {
  SoundGroup.orders => AppIcons.orders,
  SoundGroup.bookings => AppIcons.appointments,
  SoundGroup.cancelled => AppIcons.cancelledOrder,
  SoundGroup.messages => AppIcons.inbox,
  SoundGroup.other => AppIcons.bell,
};

/// The words of Android's notification channels and actions.
Map<String, String> ringWords(AppLocalizations l10n) => {
  for (final g in SoundGroup.values) 'group_${g.wire}': groupName(l10n, g),
  for (final id in [...ringtoneIds, soundDefault, soundSilent])
    'sound_$id': soundName(l10n, id),
  'silence': l10n.ringSilence,
  'quiet_channel': l10n.ringQuietChannel,
};

/// 207 Settings › Ringtones: a sound for each kind of notification, new
/// orders (and bookings) ringing until opened for at most a while,
/// vibration, Android's alarm volume, the in-app volume, quiet hours, and a
/// test ring.
class RingtonesScreen extends ConsumerStatefulWidget {
  const RingtonesScreen({super.key});

  @override
  ConsumerState<RingtonesScreen> createState() => _RingtonesScreenState();
}

class _RingtonesScreenState extends ConsumerState<RingtonesScreen> {
  late final Ringer _ringer;

  @override
  void initState() {
    super.initState();
    _ringer = ref.read(ringerProvider);
  }

  @override
  void dispose() {
    unawaited(_ringer.stop());
    super.dispose();
  }

  Future<void> _set(RingSettings next) =>
      ref.read(ringSettingsProvider.notifier).set(next);

  Future<void> _pickTime(RingSettings s, {required bool from}) async {
    final quiet = s.quiet ?? const QuietHours(23 * 60, 7 * 60);
    final current = from ? quiet.from : quiet.to;
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: current ~/ 60, minute: current % 60),
    );
    if (picked == null) return;
    final m = picked.hour * 60 + picked.minute;
    final next = from ? QuietHours(m, quiet.to) : QuietHours(quiet.from, m);
    if (next.from == next.to) return;
    await _set(s.copyWith(quiet: next));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final s = ref.watch(ringSettingsProvider);
    final android = Theme.of(context).platform == TargetPlatform.android;
    final ios = Theme.of(context).platform == TargetPlatform.iOS;
    final locale = Localizations.localeOf(context);
    String time(int minutes) =>
        MaterialLocalizations.of(context).formatTimeOfDay(
          TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60),
          alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context),
        );
    return Scaffold(
      appBar: AppBar(title: Text(l10n.ringtones)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Panel(
              color: context.yb.infoBg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(AppIcons.ringing, color: context.yb.info),
                      const SizedBox(width: 12),
                      Expanded(child: Text(l10n.ringtonesHelp)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ValueListenableBuilder<bool>(
                    valueListenable: _ringer.ringing,
                    builder: (context, ringing, _) => FilledButton.icon(
                      key: const ValueKey('ring-test'),
                      icon: Icon(ringing ? AppIcons.stop : AppIcons.play),
                      label: Text(ringing ? l10n.ringtoneStop : l10n.ringTest),
                      onPressed: () => ringing
                          ? _ringer.stop()
                          : s.rings(SoundGroup.orders)
                          ? _ringer.ring(
                              s.soundOf(SoundGroup.orders),
                              max: Duration(minutes: s.ringMinutes),
                              volume: s.volume,
                            )
                          : _ringer.play(
                              s.soundOf(SoundGroup.orders),
                              volume: s.volume,
                            ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.ringTestHelp,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          SectionTitle(l10n.ringSoundsTitle),
          for (final group in SoundGroup.values)
            ListTile(
              key: ValueKey('ring-group-${group.wire}'),
              leading: Icon(groupIcon(group)),
              title: Text(groupName(l10n, group)),
              subtitle: Text(
                '${soundName(l10n, s.soundOf(group))} · '
                '${groupHelp(l10n, group)}',
              ),
              trailing: const DirectionalIcon(AppIcons.forward, size: 20),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => RingtonePickerScreen(group: group),
                ),
              ),
            ),
          SectionTitle(l10n.ringRingingTitle),
          SwitchListTile(
            key: const ValueKey('ring-orders'),
            secondary: const Icon(AppIcons.ringing),
            title: Text(l10n.ringUntilOpenedOrders),
            subtitle: Text(l10n.ringUntilOpenedHelp),
            value: s.rings(SoundGroup.orders),
            onChanged: (on) => _set(
              s.copyWith(
                ring: on
                    ? {...s.ring, SoundGroup.orders}
                    : ({...s.ring}..remove(SoundGroup.orders)),
              ),
            ),
          ),
          SwitchListTile(
            key: const ValueKey('ring-bookings'),
            secondary: const Icon(AppIcons.appointments),
            title: Text(l10n.ringUntilOpenedBookings),
            value: s.rings(SoundGroup.bookings),
            onChanged: (on) => _set(
              s.copyWith(
                ring: on
                    ? {...s.ring, SoundGroup.bookings}
                    : ({...s.ring}..remove(SoundGroup.bookings)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                const Icon(AppIcons.timer),
                const SizedBox(width: 16),
                Expanded(child: Text(l10n.ringForAtMost)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(56, 8, 16, 0),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final m in RingSettings.ringMinuteChoices)
                  ChoiceChip(
                    key: ValueKey('ring-minutes-$m'),
                    label: Text(
                      l10n.ringMinutes(
                        NumberFormat.decimalPattern(locale.toString())
                            .format(m),
                      ),
                    ),
                    selected: s.ringMinutes == m,
                    onSelected: (_) => _set(s.copyWith(ringMinutes: m)),
                  ),
              ],
            ),
          ),
          SectionTitle(l10n.ringSoundTitle),
          SwitchListTile(
            secondary: const Icon(AppIcons.vibrate),
            title: Text(l10n.ringVibrate),
            value: s.vibrate,
            onChanged: (on) => _set(s.copyWith(vibrate: on)),
          ),
          if (!ios)
            SwitchListTile(
              key: const ValueKey('ring-alarm'),
              secondary: const Icon(AppIcons.alarmVolume),
              title: Text(l10n.ringAlarmVolume),
              subtitle: Text(l10n.ringAlarmVolumeHelp),
              value: s.alarmVolume,
              onChanged: (on) => _set(s.copyWith(alarmVolume: on)),
            ),
          ListTile(
            leading: const Icon(AppIcons.volume),
            title: Text(l10n.ringVolume),
            subtitle: Slider(
              value: s.volume,
              min: 0.2,
              divisions: 8,
              label: '${(s.volume * 100).round()}%',
              onChanged: (v) => ref
                  .read(ringSettingsProvider.notifier)
                  .set(s.copyWith(volume: v)),
              onChangeEnd: (v) =>
                  _ringer.play(s.soundOf(SoundGroup.orders), volume: v),
            ),
          ),
          SectionTitle(l10n.ringQuietTitle),
          SwitchListTile(
            key: const ValueKey('ring-quiet'),
            secondary: const Icon(AppIcons.quietHours),
            title: Text(l10n.ringQuietOn),
            subtitle: Text(l10n.ringQuietHelp),
            value: s.quiet != null,
            onChanged: (on) => _set(
              on
                  ? s.copyWith(quiet: const QuietHours(23 * 60, 7 * 60))
                  : s.copyWith(clearQuiet: true),
            ),
          ),
          if (s.quiet case final quiet?)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(56, 0, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      key: const ValueKey('ring-quiet-from'),
                      onPressed: () => _pickTime(s, from: true),
                      child: Text('${l10n.ringQuietFrom} ${time(quiet.from)}'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      key: const ValueKey('ring-quiet-to'),
                      onPressed: () => _pickTime(s, from: false),
                      child: Text('${l10n.ringQuietTo} ${time(quiet.to)}'),
                    ),
                  ),
                ],
              ),
            ),
          if (android) ...[
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: OutlinedButton.icon(
                key: const ValueKey('ring-test-notification'),
                icon: const Icon(AppIcons.notificationsSettings),
                label: Text(l10n.ringTestNotification),
                onPressed: () async {
                  final sent = await ref
                      .read(ringNativeProvider)
                      .testNotification(
                        SoundGroup.orders,
                        l10n.ringTestNotificationTitle,
                        l10n.ringTestNotificationBody,
                      );
                  if (sent && context.mounted) {
                    showMessage(context, l10n.ringTestSent);
                  }
                },
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Text(
              ios ? l10n.ringIphoneNote : l10n.ringAndroidNote,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: context.yb.muted),
            ),
          ),
        ],
      ),
    );
  }
}

/// 207 The sounds of one group: each with a play button, Yallapp's
/// ringtones first, then the phone's own sound and silent.
class RingtonePickerScreen extends ConsumerStatefulWidget {
  const RingtonePickerScreen({super.key, required this.group});

  final SoundGroup group;

  @override
  ConsumerState<RingtonePickerScreen> createState() =>
      _RingtonePickerScreenState();
}

class _RingtonePickerScreenState extends ConsumerState<RingtonePickerScreen> {
  late final Ringer _ringer;

  @override
  void initState() {
    super.initState();
    _ringer = ref.read(ringerProvider);
  }

  String? _playing;

  @override
  void dispose() {
    unawaited(_ringer.stop());
    super.dispose();
  }

  Future<void> _preview(String id, double volume) async {
    setState(() => _playing = id);
    await _ringer.stop();
    await _ringer.play(id, volume: volume);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final s = ref.watch(ringSettingsProvider);
    final chosen = s.soundOf(widget.group);
    Widget row(String id) {
      final name = soundName(l10n, id);
      final selected = id == chosen;
      return ListTile(
        key: ValueKey('ringtone-$id'),
        leading: Icon(
          selected ? AppIcons.check : AppIcons.ringtone,
          color: selected ? context.yb.accent : null,
        ),
        title: Text(name),
        subtitle: selected ? Text(l10n.ringtoneChosen) : null,
        selected: selected,
        trailing: id == soundSilent
            ? const Icon(AppIcons.silent)
            : IconButton(
                key: ValueKey('ringtone-play-$id'),
                tooltip: l10n.ringtonePlay(name),
                icon: Icon(_playing == id ? AppIcons.volume : AppIcons.play),
                onPressed: () => _preview(id, s.volume),
              ),
        onTap: () async {
          final next = {...s.sounds, widget.group: id};
          await ref
              .read(ringSettingsProvider.notifier)
              .set(s.copyWith(sounds: next));
          if (id != soundSilent) await _preview(id, s.volume);
        },
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(groupName(l10n, widget.group))),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Text(groupHelp(l10n, widget.group)),
          ),
          SectionTitle(l10n.ringtonesYours),
          for (final id in ringtoneIds) row(id),
          SectionTitle(l10n.ringtonesOther),
          row(soundDefault),
          row(soundSilent),
        ],
      ),
    );
  }
}

/// 207 What Settings shows under Ringtones.
String ringSubtitle(AppLocalizations l10n, RingSettings s) =>
    l10n.ringtonesSubtitle(soundName(l10n, s.soundOf(SoundGroup.orders)));
