import AppIntents
import SwiftUI
import WidgetKit

/// 214 The home-screen widget (small and medium): the shop's sales today in
/// its currency, its orders today and the new orders waiting; tapped, the
/// app opens on that shop's orders. It reads `GET /widget` of the Owner API
/// with the widget's own read-only token (kept by the app in the shared
/// keychain item, WidgetShared), every 15 minutes or so and whenever the app
/// asks (a new order, an order accepted, the app opened).

// MARK: - The data

struct WidgetShop: Codable, Hashable {
  var id: String
  var name: String
}

struct WidgetDay: Codable {
  struct Sales: Codable {
    var amount_cents: Int
    var currency: String
    var formatted: String
  }
  struct App: Codable {
    var id: String
    var name: String
    var date: String?
    var sales: Sales?
    var orders: Int
    var waiting: Int
  }
  var apps: [WidgetShop]
  var app: App?
  var updated_at: String?
}

enum WidgetAPI {
  private static let defaults = UserDefaults.standard

  static func cached(_ appId: String?) -> WidgetDay? {
    guard let data = defaults.data(forKey: "cache_\(appId ?? "default")") else { return nil }
    return try? JSONDecoder().decode(WidgetDay.self, from: data)
  }

  static func clearCache() {
    for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("cache_") {
      defaults.removeObject(forKey: key)
    }
  }

  /// nil: signed out (no token, or the server said so) or offline.
  static func fetch(_ appId: String?) async -> WidgetDay? {
    guard let config = WidgetShared.read(), let token = config.token,
      var c = URLComponents(string: config.api + "/widget")
    else {
      clearCache()
      return nil
    }
    if let appId { c.queryItems = [URLQueryItem(name: "app_id", value: appId)] }
    guard let url = c.url else { return nil }
    var request = URLRequest(url: url, timeoutInterval: 10)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue(config.lang, forHTTPHeaderField: "Accept-Language")
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if status == 401 {
        clearCache()
        return nil
      }
      guard status == 200, let day = try? JSONDecoder().decode(WidgetDay.self, from: data) else {
        return nil
      }
      defaults.set(data, forKey: "cache_\(appId ?? "default")")
      return day
    } catch {
      return nil
    }
  }
}

// MARK: - Which shop (asked when the account has several)

struct ShopEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "widget.shop"
  static var defaultQuery = ShopQuery()

  var id: String
  var name: String

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct ShopQuery: EntityQuery {
  private func shops() async -> [ShopEntity] {
    let day = await WidgetAPI.fetch(nil) ?? WidgetAPI.cached(nil)
    return (day?.apps ?? []).map { ShopEntity(id: $0.id, name: $0.name) }
  }

  func entities(for identifiers: [String]) async throws -> [ShopEntity] {
    await shops().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [ShopEntity] { await shops() }

  func defaultResult() async -> ShopEntity? { await shops().first }
}

struct ChooseShopIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "widget.choose"
  static var description = IntentDescription("widget.description")

  @Parameter(title: "widget.shop")
  var shop: ShopEntity?
}

// MARK: - The timeline

struct ShopEntry: TimelineEntry {
  var date: Date
  var day: WidgetDay?
  var signedIn: Bool
  /// The figures are the last ones: this read failed.
  var stale: Bool
  var lang: String
}

struct ShopProvider: AppIntentTimelineProvider {
  private var lang: String { WidgetShared.read()?.lang ?? "en" }

  func placeholder(in context: Context) -> ShopEntry {
    ShopEntry(
      date: .now,
      day: WidgetDay(
        apps: [],
        app: .init(
          id: "", name: "Yallapp Business", date: nil,
          sales: .init(amount_cents: 0, currency: "TRY", formatted: "₺0.00"), orders: 0, waiting: 0),
        updated_at: nil),
      signedIn: true, stale: false, lang: lang)
  }

  func snapshot(for configuration: ChooseShopIntent, in context: Context) async -> ShopEntry {
    if context.isPreview { return placeholder(in: context) }
    return await entry(for: configuration)
  }

  func timeline(for configuration: ChooseShopIntent, in context: Context) async -> Timeline<ShopEntry> {
    let entry = await entry(for: configuration)
    // About every 15 minutes; the app asks for more on a new order.
    return Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(15 * 60)))
  }

  private func entry(for configuration: ChooseShopIntent) async -> ShopEntry {
    let appId = configuration.shop?.id
    let signedIn = WidgetShared.read()?.token != nil
    let fresh = await WidgetAPI.fetch(appId)
    let shown = fresh ?? (signedIn ? WidgetAPI.cached(appId) : nil)
    return ShopEntry(
      date: .now, day: shown, signedIn: WidgetShared.read()?.token != nil,
      stale: fresh == nil && shown != nil, lang: lang)
  }
}

// MARK: - The views

struct ShopWidgetView: View {
  @Environment(\.widgetFamily) private var family
  var entry: ShopEntry

  private func w(_ key: String) -> String { WidgetShared.word(key, entry.lang) }

  private var link: URL {
    var data = ["widget": "orders"]
    if let id = entry.day?.app?.id { data["app_id"] = id }
    return WidgetShared.link(data)
  }

  var body: some View {
    content
      .environment(\.layoutDirection, entry.lang == "ar" ? .rightToLeft : .leftToRight)
      .environment(\.locale, WidgetShared.locale(entry.lang))
      .widgetURL(link)
      .containerBackground(for: .widget) { Color(uiColor: .systemBackground) }
  }

  @ViewBuilder private var content: some View {
    if let app = entry.day?.app {
      VStack(alignment: .leading, spacing: 4) {
        Text(app.name)
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .lineLimit(1)
        Text(w("widget.sales"))
          .font(.caption2)
          .foregroundStyle(.secondary)
        Text(app.sales?.formatted ?? "0")
          .font(family == .systemSmall ? .title3.weight(.bold) : .title2.weight(.bold))
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Spacer(minLength: 0)
        HStack(spacing: 12) {
          figure(w("widget.orders"), app.orders, accent: false)
          figure(w("widget.waiting"), app.waiting, accent: app.waiting > 0)
        }
        footer
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else {
      VStack(alignment: .leading, spacing: 6) {
        Text("Yallapp Business").font(.caption.weight(.semibold))
        Spacer(minLength: 0)
        Text(w(entry.signedIn ? "widget.offline" : "widget.signIn"))
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }

  private func figure(_ label: String, _ value: Int, accent: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      // Western digits in every language, as the app writes them.
      Text(verbatim: String(value))
        .font(.headline.weight(.bold))
        .foregroundStyle(accent ? Color.orange : Color.primary)
      Text(label).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
    }
  }

  @ViewBuilder private var footer: some View {
    if family != .systemSmall {
      let time = Self.time.string(from: entry.date)
      Text(entry.stale ? w("widget.offline") : String(format: w("widget.updated"), time))
        .font(.caption2)
        .foregroundStyle(.tertiary)
        .lineLimit(1)
    }
  }

  private static let time: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "HH:mm"
    return f
  }()
}

struct ShopWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "ShopWidget", intent: ChooseShopIntent.self, provider: ShopProvider()) {
      ShopWidgetView(entry: $0)
    }
    .configurationDisplayName("widget.name")
    .description("widget.description")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct YallappWidgets: WidgetBundle {
  var body: some Widget {
    ShopWidget()
    OrderLiveActivity()
  }
}
