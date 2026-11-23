import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 207 An order as text, to send to a courier, a colleague or a printer
/// app: its number, each item, the total, who ordered and where it goes.
String orderText(BuildContext context, Order order) {
  final l10n = context.l10n;
  final comma = context.lang == 'ar' ? '، ' : ', ';
  final to = order.deliverTo;
  final c = order.customer;
  final name = to?.name ?? order.buyerName;
  final phone = to?.phone ?? c?.phone;
  final address = [
    to?.address ?? c?.address,
    to?.city ?? c?.city,
  ].whereType<String>().where((t) => t.trim().isNotEmpty).join(comma);
  return [
    l10n.orderTextTitle(order.label),
    for (final line in order.lines)
      [
        '${line.quantity} × ${line.name}',
        if (line.options.isNotEmpty) '(${line.options.join(comma)})',
      ].join(' '),
    l10n.orderTextTotal(order.total.formatted),
    if (name != null && name.trim().isNotEmpty) l10n.orderTextName(name),
    if (phone != null && phone.trim().isNotEmpty) l10n.orderTextPhone(phone),
    if (address.isNotEmpty) l10n.orderTextAddress(address),
    if (to?.notes case final notes? when notes.trim().isNotEmpty)
      l10n.orderTextNotes(notes),
  ].join('\n');
}

/// 207 The order page's Share: copy the details, or send them on WhatsApp
/// to whoever the owner picks there.
class OrderShareButton extends ConsumerWidget {
  const OrderShareButton({super.key, required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return PopupMenuButton<String>(
      key: const ValueKey('order-share'),
      tooltip: l10n.shareOrder,
      icon: const Icon(AppIcons.share),
      onSelected: (choice) async {
        final text = orderText(context, order);
        if (choice == 'copy') {
          await Clipboard.setData(ClipboardData(text: text));
          if (context.mounted) showMessage(context, l10n.orderCopied);
        } else {
          await openLink(
            context,
            ref,
            'https://wa.me/?text=${Uri.encodeComponent(text)}',
          );
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'copy',
          child: ListTile(
            leading: const Icon(AppIcons.copy),
            title: Text(l10n.copyOrder),
          ),
        ),
        PopupMenuItem(
          value: 'whatsapp',
          child: ListTile(
            leading: const Icon(AppIcons.whatsapp),
            title: Text(l10n.sendOrderWhatsapp),
          ),
        ),
      ],
    );
  }
}
