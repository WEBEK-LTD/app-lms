import Foundation
import Security

#if canImport(ActivityKit)
import ActivityKit
#endif

/// 214 What the app and its widget extension (ShopWidget) share, compiled
/// into both targets.
///
/// The widget's settings (the Owner API's address, the widget's own
/// read-only token and the app's language) are one keychain item in the
/// access group both targets have (`keychain-access-groups` in their
/// entitlements; `YBKeychainGroup` in their Info.plist). No App Group: the
/// widget keeps its last figures in its own container.
enum WidgetShared {
  static let service = "tr.com.yallapp.business.widget"
  static let account = "config"

  /// The app's URL scheme: the widget and the Live Activity open the app
  /// with the push data it reads (`yallappbusiness://push?kind=…&order_id=…`).
  static let scheme = "yallappbusiness"

  struct Config: Codable, Equatable {
    var api: String
    var token: String?
    var lang: String
  }

  static var accessGroup: String? {
    let group = Bundle.main.object(forInfoDictionaryKey: "YBKeychainGroup") as? String
    guard let group, !group.isEmpty, !group.contains("$(") else { return nil }
    return group
  }

  private static func query() -> [String: Any] {
    var q: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
    if let group = accessGroup { q[kSecAttrAccessGroup as String] = group }
    return q
  }

  static func read() -> Config? {
    var q = query()
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var out: CFTypeRef?
    guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else {
      return nil
    }
    return try? JSONDecoder().decode(Config.self, from: data)
  }

  static func write(_ config: Config) {
    guard let data = try? JSONEncoder().encode(config) else { return }
    let q = query()
    // Readable by the widget while the phone is locked, after its first unlock.
    let attributes: [String: Any] = [
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
    ]
    if SecItemUpdate(q as CFDictionary, attributes as CFDictionary) == errSecItemNotFound {
      var add = q
      add.merge(attributes) { _, new in new }
      SecItemAdd(add as CFDictionary, nil)
    }
  }

  /// A link the app opens as if a push with [data] was tapped.
  static func link(_ data: [String: String]) -> URL {
    var c = URLComponents()
    c.scheme = scheme
    c.host = "push"
    c.queryItems = data.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
    return c.url ?? URL(string: "\(scheme)://push")!
  }

  /// The push data of a link from [link], or nil for another URL.
  static func data(of url: URL) -> [String: String]? {
    guard url.scheme == scheme, url.host == "push",
      let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
    else { return nil }
    var out: [String: String] = [:]
    for item in items { if let v = item.value { out[item.name] = v } }
    return out
  }

  /// Digits as the app writes them: Western in every language.
  @available(iOS 16.0, *)
  static func locale(_ lang: String) -> Locale {
    var c = Locale.Components(languageCode: Locale.LanguageCode(lang))
    c.numberingSystem = Locale.NumberingSystem("latn")
    return Locale(components: c)
  }

  /// The extension's words in the app's language (not only the phone's).
  static func word(_ key: String, _ lang: String, bundle: Bundle = .main) -> String {
    if let path = bundle.path(forResource: lang, ofType: "lproj"), let b = Bundle(path: path) {
      return b.localizedString(forKey: key, value: nil, table: nil)
    }
    return bundle.localizedString(forKey: key, value: nil, table: nil)
  }
}

#if canImport(ActivityKit)
/// 214 A new order on the lock screen and the Dynamic Island until it is
/// accepted or opened. The field names are the push's `attributes` and
/// `content-state` keys (lib/owner/live-activity.ts); times in seconds since
/// 1970.
@available(iOS 16.1, *)
struct OrderActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// False once accepted elsewhere (the activity then ends).
    var waiting: Bool
  }

  var appId: String
  /// new_order, new_food_order or new_market_order.
  var kind: String
  var orderId: String
  /// "1042", "F-1047".
  var number: String
  /// The customer's first name ("" when unknown).
  var customer: String
  /// The total as the shop writes it ("₺250.00").
  var total: String
  var placedAt: Double
  var lang: String

  /// The push data that opens this order in the app.
  var pushData: [String: String] {
    let idKey: String
    switch kind {
    case "new_food_order": idKey = "food_order_id"
    case "new_market_order": idKey = "market_order_id"
    default: idKey = "order_id"
    }
    return ["type": "owner", "kind": kind, "app_id": appId, idKey: orderId]
  }
}
#endif
