import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/widgets/states.dart';
import 'package:yallapp_business/features/rides/rides_screen.dart';

/// 178 QA of the rides and taxi apps: on the Rides board a ride whose
/// driver is on the way (`accepted`, docs/api/owner.yaml `Ride.status`) had
/// the grey tag of an unknown status: the board's colours named an
/// `assigned` ride, which rides never are.
void main() {
  test('each ride status of the Owner API has its colour', () {
    expect(rideTone('scheduled'), Tone.info);
    expect(rideTone('searching'), Tone.warn);
    expect(rideTone('accepted'), Tone.info);
    expect(rideTone('arrived'), Tone.info);
    expect(rideTone('in_progress'), Tone.good);
    expect(rideTone('completed'), Tone.good);
    expect(rideTone('cancelled'), Tone.bad);
    expect(rideTone('no_driver'), Tone.bad);
  });
}
