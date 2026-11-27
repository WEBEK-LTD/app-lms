import 'package:flutter/widgets.dart';

import '../posts/ui/member_posts.dart';
import '../showcase/ui/profile_sections.dart';

/// The sections under a profile's apps, each drawn for a member (or as
/// nothing): area D's posts; area E adds Showcase, Pro and Tutorials here.
List<Widget Function(String memberId)> profileSections() => [
  (id) => MemberPostsSection(memberId: id),
  // Area E: the member's Showcase and their Pro profile.
  (id) => MemberProSection(memberId: id),
  (id) => MemberShowcaseSection(memberId: id),
];
