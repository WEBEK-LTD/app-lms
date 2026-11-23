import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/providers.dart';
import '../../core/services/ringtones.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/digits.dart';
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
  // 213
  'cha_ching' => l10n.soundChaChing,
  'coin_drop' => l10n.soundCoinDrop,
  'till_bell' => l10n.soundTillBell,
  'coin_chime' => l10n.soundCoinChime,
  'sale_jingle' => l10n.soundSaleJingle,
  'piggy_bank' => l10n.soundPiggyBank,
  'receipt_printer' => l10n.soundReceiptPrinter,
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
  // 214 A new order's notification: Accept and Open.
  'accept': l10n.accept,
  'open': l10n.open,
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
          // 214 iPhone: new orders through Focus (Time Sensitive).
          if (defaultTargetPlatform == TargetPlatform.iOS)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Panel(
                key: const ValueKey('ring-focus'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Icon(AppIcons.focus, color: context.yb.info),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            l10n.ringFocusTitle,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(l10n.ringFocusHelp),
                    const SizedBox(height: 8),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: OutlinedButton(
                        key: const ValueKey('ring-focus-open'),
                        onPressed: () => ref
                            .read(ringNativeProvider)
                            .openNotificationSettings(),
                        child: Text(l10n.ringFocusOpen),
                      ),
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
          // 214 New orders: the same sound, or by the order's value.
          SectionTitle(l10n.ringByValueTitle),
          RadioGroup<bool>(
            groupValue: s.byValue != null,
            onChanged: (byValue) {
              if (byValue == null) return;
              _set(
                byValue
                    ? s.copyWith(byValue: defaultBands(s))
                    : s.copyWith(clearByValue: true),
              );
            },
            child: Column(
              children: [
                RadioListTile<bool>(
                  key: const ValueKey('ring-mode-same'),
                  value: false,
                  title: Text(l10n.ringSameForEvery),
                  subtitle: Text(soundName(l10n, s.soundOf(SoundGroup.orders))),
                ),
                RadioListTile<bool>(
                  key: const ValueKey('ring-mode-value'),
                  value: true,
                  title: Text(l10n.ringByValue),
                  subtitle: Text(l10n.ringByValueHelp),
                ),
              ],
            ),
          ),
          if (s.byValue case final bands?)
            ValueBandsEditor(
              bands: bands,
              onChanged: (next) => _set(s.copyWith(byValue: next)),
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
  const RingtonePickerScreen({super.key, required this.group, this.choose});

  final SoundGroup group;

  /// 214 Choosing for a value band: the sound chosen now; the screen pops
  /// with the one tapped instead of saving the group's.
  final String? choose;

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
    final chosen = widget.choose ?? s.soundOf(widget.group);
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
          if (widget.choose != null) {
            Navigator.of(context).pop(id);
            return;
          }
          final next = {...s.sounds, widget.group: id};
          await ref
              .read(ringSettingsProvider.notifier)
              .set(s.copyWith(sounds: next));
          if (id != soundSilent) await _preview(id, s.volume);
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.choose != null
              ? l10n.ringBandSound
              : groupName(l10n, widget.group),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Text(groupHelp(l10n, widget.group)),
          ),
          SectionTitle(l10n.ringtonesYours),
          for (final id in ringtoneIds)
            if (!moneyRingtoneIds.contains(id)) row(id),
          // 213 A cash register, coins, the till.
          SectionTitle(l10n.ringtonesMoney),
          for (final id in moneyRingtoneIds) row(id),
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

/// 214 The bands a phone starts from when it turns on Ring by order value:
/// under 500 with the orders' sound, 500 and more Cash drawer, 2,000 and
/// more Cha-ching.
List<ValueBand> defaultBands(RingSettings s) => [
  ValueBand(0, s.soundOf(SoundGroup.orders)),
  const ValueBand(500, 'cash_drawer'),
  const ValueBand(2000, 'cha_ching'),
];

/// 214 Up to three bands of Ring by order value: where each starts (the
/// first from 0) and its sound, each with its own picker; a third band can
/// be added or taken away.
class ValueBandsEditor extends StatelessWidget {
  const ValueBandsEditor({
    super.key,
    required this.bands,
    required this.onChanged,
  });

  final List<ValueBand> bands;
  final ValueChanged<List<ValueBand>> onChanged;

  String _amount(BuildContext context, double v) =>
      NumberFormat.decimalPattern(Localizations.localeOf(context).toString())
          .format(v);

  Future<void> _from(BuildContext context, int i) async {
    final min = bands[i - 1].from;
    final max = i + 1 < bands.length ? bands[i + 1].from : double.infinity;
    final value = await showDialog<double>(
      context: context,
      builder: (_) =>
          _BandAmountDialog(from: bands[i].from, min: min, max: max),
    );
    if (value == null) return;
    onChanged([
      for (final (j, b) in bands.indexed)
        j == i ? ValueBand(value, b.sound) : b,
    ]);
  }

  Future<void> _sound(BuildContext context, int i) async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => RingtonePickerScreen(
          group: SoundGroup.orders,
          choose: bands[i].sound,
        ),
      ),
    );
    if (id == null) return;
    onChanged([
      for (final (j, b) in bands.indexed) j == i ? ValueBand(b.from, id) : b,
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      children: [
        for (final (i, band) in bands.indexed)
          ListTile(
            key: ValueKey('ring-band-$i'),
            contentPadding: const EdgeInsetsDirectional.fromSTEB(56, 0, 8, 0),
            title: Text(
              i == 0
                  ? l10n.ringBandUnder(_amount(context, bands[1].from))
                  : i + 1 < bands.length
                  ? l10n.ringBandBetween(
                      _amount(context, band.from),
                      _amount(context, bands[i + 1].from),
                    )
                  : l10n.ringBandFrom(_amount(context, band.from)),
            ),
            subtitle: Text(soundName(l10n, band.sound)),
            onTap: () => _sound(context, i),
            trailing: i == 0
                ? null
                : IconButton(
                    key: ValueKey('ring-band-edit-$i'),
                    tooltip: l10n.ringBandFromTitle,
                    icon: const Icon(AppIcons.edit),
                    onPressed: () => _from(context, i),
                  ),
          ),
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(56, 0, 16, 0),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: bands.length < RingSettings.maxBands
                ? TextButton.icon(
                    key: const ValueKey('ring-band-add'),
                    icon: const Icon(AppIcons.add),
                    label: Text(l10n.ringBandAdd),
                    onPressed: () => onChanged([
                      ...bands,
                      ValueBand(bands.last.from * 4, 'cha_ching'),
                    ]),
                  )
                : TextButton.icon(
                    key: const ValueKey('ring-band-remove'),
                    icon: const Icon(AppIcons.remove),
                    label: Text(l10n.ringBandRemove),
                    onPressed: () =>
                        onChanged(bands.sublist(0, bands.length - 1)),
                  ),
          ),
        ),
      ],
    );
  }
}

/// 214 Where a band starts: above the band before it, below the one after.
class _BandAmountDialog extends StatefulWidget {
  const _BandAmountDialog({
    required this.from,
    required this.min,
    required this.max,
  });

  final double from;
  final double min;
  final double max;

  @override
  State<_BandAmountDialog> createState() => _BandAmountDialogState();
}

class _BandAmountDialogState extends State<_BandAmountDialog> {
  late final _controller = TextEditingController(
    text: widget.from == widget.from.roundToDouble()
        ? '${widget.from.round()}'
        : '${widget.from}',
  );
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.ringBandFromTitle),
      content: TextField(
        key: const ValueKey('ring-band-amount'),
        controller: _controller,
        autofocus: true,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(
          helperText: l10n.ringBandFromHelp,
          errorText: _error,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l10n.cancel),
        ),
        FilledButton(
          key: const ValueKey('ring-band-save'),
          onPressed: () {
            final v = double.tryParse(typedAmount(_controller.text));
            if (v == null || v <= widget.min || v >= widget.max) {
              setState(() => _error = l10n.ringBandFromInvalid);
              return;
            }
            Navigator.pop(context, v);
          },
          child: Text(l10n.save),
        ),
      ],
    );
  }
}
