import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';

/// 180.4 Pushes the hosted API sends as announcements with their own place
/// (platform/web/src/lib/listings/notify.ts, lib/bookings/reschedule.ts).
void main() {
  test('the office replied: the conversation about the home', () {
    expect(
      pushTargetLocation({
        'type': 'announcement',
        'notification_id': '4',
        'inquiry_id': '12',
        'listing_id': '3',
      }),
      Paths.conversation(12),
    );
  });

  test('an appointment the business moved: that appointment', () {
    expect(
      pushTargetLocation({
        'type': 'announcement',
        'notification_id': '5',
        'appointment_id': '31',
      }),
      Paths.appointment(31),
    );
  });

  test('a course\'s announcement still opens the course', () {
    expect(
      pushTargetLocation({'type': 'announcement', 'course_id': '9'}),
      Paths.course(9),
    );
    expect(pushTargetLocation({'type': 'announcement'}), Paths.home);
  });
}
