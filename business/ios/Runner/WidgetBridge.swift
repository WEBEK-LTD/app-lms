import Flutter
import UIKit
import WidgetKit

#if canImport(ActivityKit)
import ActivityKit
#endif

/// 214 The app's side of the home-screen widget and the new order's Live
/// Activity (the ShopWidget extension).
///
/// - `tr.com.yallapp.business/widget` (lib/core/services/home_widget.dart):
///   `configure` keeps the API's address, the widget's token and the
///   language in the shared keychain item; `refresh` reloads the widget.
/// - `tr.com.yallapp.business/live` (lib/core/services/live_activity.dart):
///   `start` shows a new order while the app is open (the server's
///   push-to-start does it otherwise), `end` ends one, `tokens` gives the
///   push tokens for the server; `changed` tells Dart they changed.
/// - The widget and the Live Activity open the app with
///   `yallappbusiness://push?…`: [Links] hands that data to the ring
///   channel's `initial` and `opened`, as a tapped push.
enum WidgetBridge {
  static func register(_ registry: FlutterPluginRegistry) {
    if let registrar = registry.registrar(forPlugin: "YallappWidget") {
      let channel = FlutterMethodChannel(
        name: "tr.com.yallapp.business/widget", binaryMessenger: registrar.messenger())
      channel.setMethodCallHandler { call, result in
        let args = call.arguments as? [String: Any]
        switch call.method {
        case "configure":
          let api = args?["api"] as? String ?? WidgetShared.read()?.api ?? ""
          let lang = args?["lang"] as? String ?? WidgetShared.read()?.lang ?? "en"
          WidgetShared.write(.init(api: api, token: args?["token"] as? String, lang: lang))
          WidgetCenter.shared.reloadAllTimelines()
          result(nil)
        case "refresh":
          WidgetCenter.shared.reloadAllTimelines()
          result(nil)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }
    if let registrar = registry.registrar(forPlugin: "YallappLive") {
      let channel = FlutterMethodChannel(
        name: "tr.com.yallapp.business/live", binaryMessenger: registrar.messenger())
      LiveOrders.channel = channel
      channel.setMethodCallHandler { call, result in
        let args = call.arguments as? [String: Any]
        switch call.method {
        case "start":
          LiveOrders.start(args ?? [:])
          result(nil)
        case "end":
          LiveOrders.end(args?["data"] as? [String: String] ?? [:])
          result(nil)
        case "tokens":
          result(LiveOrders.tokens())
        default:
          result(FlutterMethodNotImplemented)
        }
      }
      LiveOrders.observe()
    }
    // The links, at launch and while the app runs (Flutter hands its scene's
    // events to plugins; its deep linking is off in Info.plist).
    if let registrar = registry.registrar(forPlugin: "YallappLinks") {
      registrar.addSceneDelegate(LinkSceneDelegate.shared)
    }
    // A new order's push (content-available) in the background: the widget reads again.
    if let registrar = registry.registrar(forPlugin: "YallappWidgetPush") {
      registrar.addApplicationDelegate(WidgetPush.shared)
    }
  }
}

/// 214 Reloads the widget when a push arrives in the background; the push
/// goes on to the other plugins (Firebase) as before.
final class WidgetPush: NSObject, FlutterPlugin {
  static let shared = WidgetPush()

  static func register(with registrar: FlutterPluginRegistrar) {}

  func application(
    _ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) -> Bool {
    WidgetCenter.shared.reloadAllTimelines()
    return false
  }
}

/// 214 Receives the scene's URLs; true only for the app's own links.
final class LinkSceneDelegate: NSObject, FlutterSceneLifeCycleDelegate {
  static let shared = LinkSceneDelegate()

  func scene(
    _ scene: UIScene, willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions?
  ) -> Bool {
    var handled = false
    for context in connectionOptions?.urlContexts ?? [] where Links.open(context.url, launching: true) {
      handled = true
    }
    return handled
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) -> Bool {
    var handled = false
    for context in URLContexts where Links.open(context.url, launching: false) { handled = true }
    return handled
  }
}

/// 214 Links from the widget and the Live Activity, as tapped pushes.
enum Links {
  static var launch: [String: String]?
  static weak var ring: FlutterMethodChannel?

  /// True when it was the app's link.
  @discardableResult
  static func open(_ url: URL, launching: Bool) -> Bool {
    guard let data = WidgetShared.data(of: url) else { return false }
    if launching || ring == nil {
      launch = data
    } else {
      ring?.invokeMethod("opened", arguments: data)
    }
    return true
  }
}

/// 214 The new orders' Live Activities (iOS 17 and later; the extension's
/// deployment target).
enum LiveOrders {
  static weak var channel: FlutterMethodChannel?
  private static var startToken: String?
  private static var orderTokens: [String: [String: String]] = [:]
  private static var observing = false

  private static func hex(_ data: Data) -> String { data.map { String(format: "%02x", $0) }.joined() }

  private static func changed() {
    DispatchQueue.main.async { channel?.invokeMethod("changed", arguments: nil) }
  }

  static func tokens() -> [String: Any] {
    ["start": startToken as Any, "orders": Array(orderTokens.values)]
  }

  static func observe() {
    #if canImport(ActivityKit)
    guard #available(iOS 17.2, *), !observing else { return }
    observing = true
    Task {
      for await data in Activity<OrderActivityAttributes>.pushToStartTokenUpdates {
        startToken = hex(data)
        changed()
      }
    }
    Task {
      for activity in Activity<OrderActivityAttributes>.activities { watch(activity) }
      for await activity in Activity<OrderActivityAttributes>.activityUpdates { watch(activity) }
    }
    #endif
  }

  #if canImport(ActivityKit)
  @available(iOS 17.2, *)
  private static func key(_ a: OrderActivityAttributes) -> String { "\(a.kind):\(a.orderId)" }

  @available(iOS 17.2, *)
  private static func watch(_ activity: Activity<OrderActivityAttributes>) {
    let a = activity.attributes
    Task {
      for await data in activity.pushTokenUpdates {
        orderTokens[key(a)] = [
          "app_id": a.appId, "kind": a.kind, "order_id": a.orderId, "token": hex(data),
        ]
        changed()
      }
    }
    Task {
      for await state in activity.activityStateUpdates where state == .ended || state == .dismissed {
        if orderTokens.removeValue(forKey: key(a)) != nil { changed() }
      }
    }
  }
  #endif

  /// A new order while the app is open, when the server's push didn't
  /// already show it.
  static func start(_ args: [String: Any]) {
    #if canImport(ActivityKit)
    guard #available(iOS 17.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    func text(_ key: String) -> String { (args[key] as? String) ?? "" }
    let attributes = OrderActivityAttributes(
      appId: text("app_id"), kind: text("kind"), orderId: text("order_id"),
      number: text("number"), customer: text("customer"), total: text("total"),
      placedAt: (args["placed_at"] as? Double) ?? Date().timeIntervalSince1970,
      lang: text("lang").isEmpty ? "en" : text("lang"))
    guard !attributes.orderId.isEmpty,
      !Activity<OrderActivityAttributes>.activities.contains(where: { key($0.attributes) == key(attributes) })
    else { return }
    _ = try? Activity.request(
      attributes: attributes,
      content: .init(state: .init(waiting: true), staleDate: nil),
      pushType: .token)
    #endif
  }

  /// The order was opened or answered: its activity goes (push data: kind and id).
  static func end(_ data: [String: String]) {
    #if canImport(ActivityKit)
    guard #available(iOS 17.2, *) else { return }
    let id = data["order_id"] ?? data["food_order_id"] ?? data["market_order_id"]
    guard let id else { return }
    for activity in Activity<OrderActivityAttributes>.activities where activity.attributes.orderId == id {
      if let kind = data["kind"], kind != activity.attributes.kind { continue }
      Task {
        await activity.end(.init(state: .init(waiting: false), staleDate: nil), dismissalPolicy: .immediate)
      }
    }
    #endif
  }
}
