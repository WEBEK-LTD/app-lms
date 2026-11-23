import ActivityKit
import SwiftUI
import WidgetKit

/// 214 A new order on the lock screen and in the Dynamic Island: its
/// number, the customer's first name, the total and how long it has been
/// waiting (counted by the system, no pushes needed). It stays until the
/// order is accepted or opened: the app ends it then, and the server ends
/// it when it was accepted from another phone or the dashboard. Started by
/// the server's push (push-to-start) or, while the app is open, by the app.
struct OrderLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: OrderActivityAttributes.self) { context in
      OrderLockScreen(attributes: context.attributes)
        .activityBackgroundTint(Color(uiColor: .secondarySystemBackground))
        .widgetURL(WidgetShared.link(context.attributes.pushData))
    } dynamicIsland: { context in
      let a = context.attributes
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(verbatim: a.number).font(.headline)
          } icon: {
            Image(systemName: "bag.fill").foregroundStyle(.orange)
          }
          .orderLook(a.lang)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(verbatim: a.total).font(.headline).orderLook(a.lang)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text(verbatim: a.customer).lineLimit(1)
            Spacer()
            Waiting(attributes: a)
          }
          .font(.subheadline)
          .orderLook(a.lang)
        }
      } compactLeading: {
        Image(systemName: "bag.fill").foregroundStyle(.orange)
      } compactTrailing: {
        Waiting(attributes: a, short: true)
      } minimal: {
        Image(systemName: "bag.fill").foregroundStyle(.orange)
      }
      .widgetURL(WidgetShared.link(a.pushData))
    }
  }
}

private struct OrderLockScreen: View {
  var attributes: OrderActivityAttributes

  var body: some View {
    let a = attributes
    HStack(spacing: 12) {
      Image(systemName: "bag.fill")
        .font(.title2)
        .foregroundStyle(.orange)
      VStack(alignment: .leading, spacing: 2) {
        Text(String(format: WidgetShared.word("live.newOrder", a.lang), a.number))
          .font(.headline)
          .lineLimit(1)
        Text(verbatim: [a.customer, a.total].filter { !$0.isEmpty }.joined(separator: " · "))
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer(minLength: 8)
      VStack(alignment: .trailing, spacing: 2) {
        Waiting(attributes: a)
        Text(WidgetShared.word("live.waiting", a.lang))
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(16)
    .orderLook(a.lang)
  }
}

/// How long the order has waited, counting up.
private struct Waiting: View {
  var attributes: OrderActivityAttributes
  var short = false

  var body: some View {
    let placed = Date(timeIntervalSince1970: attributes.placedAt)
    Text(timerInterval: placed...Date.distantFuture, countsDown: false)
      .monospacedDigit()
      .font(short ? .caption2.weight(.semibold) : .headline)
      .foregroundStyle(.orange)
      .multilineTextAlignment(.trailing)
      .frame(maxWidth: short ? 52 : 80)
      // Western digits in every language.
      .environment(\.locale, WidgetShared.locale(attributes.lang))
  }
}

extension View {
  /// The app's language: right to left in Arabic, Western digits.
  fileprivate func orderLook(_ lang: String) -> some View {
    environment(\.layoutDirection, lang == "ar" ? .rightToLeft : .leftToRight)
      .environment(\.locale, WidgetShared.locale(lang))
  }
}
