import 'package:flutter/material.dart';

import '../../core/widgets/avatar.dart';
import '../../core/widgets/images.dart';
import 'data/groups_api.dart';

abstract final class GroupLinks {
  static const create = '/groups/new';
  static String group(String id) => '/groups/${Uri.encodeComponent(id)}';
  static String members(String id) => '${group(id)}/members';
}

/// A group's cover as a square, or its first letter on a solid colour.
class GroupMark extends StatelessWidget {
  const GroupMark({super.key, required this.group, this.size = 44});

  final Group group;
  final double size;

  @override
  Widget build(BuildContext context) {
    final cover = group.coverUrl;
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Avatar.gradientFor(group.id).first,
        borderRadius: BorderRadius.circular(size > 40 ? 12 : 8),
        image: cover == null
            ? null
            : DecorationImage(image: imageOf(cover), fit: BoxFit.cover),
      ),
      child: cover != null
          ? null
          : Text(
              group.name.isEmpty
                  ? ''
                  : group.name.characters.first.toUpperCase(),
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: size * .42,
              ),
            ),
    );
  }
}
