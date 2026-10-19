import Flutter
import PDFKit
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var screenSecurity: ScreenSecurity?
  private var pdfPages: PdfPages?
  private var privateFiles: PrivateFiles?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "YallappScreenSecurity") {
      screenSecurity = ScreenSecurity(messenger: registrar.messenger())
      // 53 Course PDFs in the app's own viewer; saved lessons out of backups.
      pdfPages = PdfPages(messenger: registrar.messenger())
      privateFiles = PrivateFiles(messenger: registrar.messenger())
    }
  }
}

/// Screen protection on iOS (53: course content or the whole app, as the
/// owner chose; lib/core/services/screen_security.dart). iOS doesn't let
/// apps block screenshots or recording, so the app does what it can:
///
/// - `setSecure`: draws the app's window inside a secure text field's layer.
///   iOS leaves secure text fields out of screenshots, recordings and
///   mirrored screens, so protected screens come out blank there. This
///   relies on how UIKit draws password fields, which Apple doesn't
///   document: it's set up once, only when the field has the layer it needs,
///   and a future iOS may stop honouring it. The capture cover below and the
///   app switcher blur don't depend on it.
/// - While protection is on, the app switcher's picture is blurred.
/// - Event channel `yallapp/screen_capture`: `true` or `false` whenever the
///   screen starts or stops being recorded or mirrored (the Flutter side
///   covers protected screens and pauses the video).
/// - Event channel `yallapp/screenshots`: one event per screenshot, so the
///   app can say protected content can't be captured.
final class ScreenSecurity: NSObject, FlutterStreamHandler {
  private let methods: FlutterMethodChannel
  private let events: FlutterEventChannel
  private let shots: FlutterEventChannel
  private let screenshots = ScreenshotEvents()
  private var sink: FlutterEventSink?
  private var observer: NSObjectProtocol?
  private var lifecycle: [NSObjectProtocol] = []
  private var secure = false
  private var secureField: UITextField?
  private var blur: UIView?

  init(messenger: FlutterBinaryMessenger) {
    methods = FlutterMethodChannel(name: "yallapp/screen_security", binaryMessenger: messenger)
    events = FlutterEventChannel(name: "yallapp/screen_capture", binaryMessenger: messenger)
    shots = FlutterEventChannel(name: "yallapp/screenshots", binaryMessenger: messenger)
    super.init()
    methods.setMethodCallHandler { [weak self] call, result in
      switch call.method {
      case "setSecure":
        let enabled = (call.arguments as? [String: Any])?["enabled"] as? Bool ?? false
        self?.setSecure(enabled)
        result(nil)
      case "isCaptured":
        result(self?.isCaptured ?? false)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
    events.setStreamHandler(self)
    shots.setStreamHandler(screenshots)
    let center = NotificationCenter.default
    // The app switcher takes its picture as the app leaves the screen.
    lifecycle = [
      center.addObserver(forName: UIScene.willDeactivateNotification, object: nil, queue: .main) { [weak self] _ in
        self?.coverForSwitcher()
      },
      center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.coverForSwitcher()
      },
      center.addObserver(forName: UIScene.didActivateNotification, object: nil, queue: .main) { [weak self] _ in
        self?.uncover()
      },
      center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.uncover()
      },
    ]
  }

  deinit {
    lifecycle.forEach { NotificationCenter.default.removeObserver($0) }
  }

  private var window: UIWindow? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let windows = scenes.flatMap { $0.windows }
    return windows.first { $0.isKeyWindow } ?? windows.first
  }

  private var isCaptured: Bool {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let scene = scenes.first {
      return scene.screen.isCaptured
    }
    return false
  }

  private func setSecure(_ enabled: Bool) {
    secure = enabled
    if enabled, let window = window {
      attachSecureLayer(to: window)
    }
    secureField?.isSecureTextEntry = enabled
    if !enabled {
      uncover()
    }
  }

  /// Moves the window's layer into a secure text field's drawing layer, once.
  private func attachSecureLayer(to window: UIWindow) {
    if secureField != nil {
      return
    }
    let field = UITextField()
    field.isSecureTextEntry = true
    field.isUserInteractionEnabled = false
    field.translatesAutoresizingMaskIntoConstraints = false
    window.addSubview(field)
    NSLayoutConstraint.activate([
      field.centerXAnchor.constraint(equalTo: window.centerXAnchor),
      field.centerYAnchor.constraint(equalTo: window.centerYAnchor),
    ])
    guard let superlayer = window.layer.superlayer else {
      field.removeFromSuperview()
      return
    }
    superlayer.addSublayer(field.layer)
    let canvas: CALayer?
    if #available(iOS 17.0, *) {
      canvas = field.layer.sublayers?.last
    } else {
      canvas = field.layer.sublayers?.first
    }
    guard let canvas = canvas else {
      window.layer.addSublayer(field.layer)
      field.removeFromSuperview()
      return
    }
    canvas.addSublayer(window.layer)
    secureField = field
  }

  private func coverForSwitcher() {
    guard secure, blur == nil, let window = window else { return }
    let view = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
    view.frame = window.bounds
    view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(view)
    blur = view
  }

  private func uncover() {
    blur?.removeFromSuperview()
    blur = nil
  }

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    sink = events
    events(isCaptured)
    observer = NotificationCenter.default.addObserver(
      forName: UIScreen.capturedDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self = self else { return }
      self.sink?(self.isCaptured)
    }
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    if let observer = observer {
      NotificationCenter.default.removeObserver(observer)
    }
    observer = nil
    sink = nil
    return nil
  }
}

/// 53 One event per screenshot (`UIApplication.userDidTakeScreenshotNotification`).
final class ScreenshotEvents: NSObject, FlutterStreamHandler {
  private var observer: NSObjectProtocol?

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    observer = NotificationCenter.default.addObserver(
      forName: UIApplication.userDidTakeScreenshotNotification,
      object: nil,
      queue: .main
    ) { _ in
      events(true)
    }
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    if let observer = observer {
      NotificationCenter.default.removeObserver(observer)
    }
    observer = nil
    return nil
  }
}

/// 53 Course PDFs drawn page by page with PDFKit for the app's own viewer
/// (lib/core/services/pdf_pages.dart). The document stays in memory: never
/// written to a file, and nothing offers to share, save or print it.
///
/// Methods on `yallapp/pdf`: `open` {bytes} -> {id, pages}, `render`
/// {id, page, width} -> PNG bytes, `close` {id}.
final class PdfPages {
  private let channel: FlutterMethodChannel
  private let queue = DispatchQueue(label: "yallapp.pdf")
  private var documents: [Int: PDFDocument] = [:]
  private var nextId = 1

  init(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(name: "yallapp/pdf", binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in
      guard let self = self else { return result(nil) }
      let args = call.arguments as? [String: Any] ?? [:]
      switch call.method {
      case "open":
        guard let data = (args["bytes"] as? FlutterStandardTypedData)?.data else { return result(nil) }
        self.queue.async {
          var opened: [String: Int]? = nil
          if let document = PDFDocument(data: data), !document.isLocked, document.pageCount > 0 {
            let id = self.nextId
            self.nextId += 1
            self.documents[id] = document
            opened = ["id": id, "pages": document.pageCount]
          }
          DispatchQueue.main.async { result(opened) }
        }
      case "render":
        let id = args["id"] as? Int ?? 0
        let index = args["page"] as? Int ?? 0
        let width = min(max(args["width"] as? Int ?? 1080, 100), 4000)
        self.queue.async {
          var png: FlutterStandardTypedData? = nil
          if let page = self.documents[id]?.page(at: index) {
            let box = page.bounds(for: .mediaBox)
            let height = box.width > 0 ? CGFloat(width) * box.height / box.width : CGFloat(width)
            let image = page.thumbnail(of: CGSize(width: CGFloat(width), height: height), for: .mediaBox)
            if let data = image.pngData() {
              png = FlutterStandardTypedData(bytes: data)
            }
          }
          DispatchQueue.main.async { result(png) }
        }
      case "close":
        let id = args["id"] as? Int ?? 0
        self.queue.async {
          self.documents.removeValue(forKey: id)
          DispatchQueue.main.async { result(nil) }
        }
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}

/// 53 Saved lessons stay on this phone (lib/modules/lms/downloads/):
/// `excludeFromBackup` {path} keeps a folder out of iCloud and computer
/// backups; `protect` {path} gives a file complete data protection, so it
/// can't be read while the phone is locked.
final class PrivateFiles {
  private let channel: FlutterMethodChannel

  init(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(name: "yallapp/private_files", binaryMessenger: messenger)
    channel.setMethodCallHandler { call, result in
      guard let path = (call.arguments as? [String: Any])?["path"] as? String else { return result(false) }
      switch call.method {
      case "excludeFromBackup":
        var url = URL(fileURLWithPath: path, isDirectory: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        result((try? url.setResourceValues(values)) != nil)
      case "protect":
        let done = (try? FileManager.default.setAttributes(
          [.protectionKey: FileProtectionType.complete], ofItemAtPath: path)) != nil
        result(done)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
