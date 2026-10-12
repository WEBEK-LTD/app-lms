import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var screenSecurity: ScreenSecurity?

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
    }
  }
}

/// iOS can't block screen recording, so the app listens for capture changes
/// and the Flutter side blanks protected video while the screen is captured
/// (screen recording, AirPlay mirroring or QuickTime).
///
/// Method channel `yallapp/screen_security`: `setSecure` (no-op on iOS) and
/// `isCaptured`. Event channel `yallapp/screen_capture`: `true` or `false`
/// whenever the capture state changes.
final class ScreenSecurity: NSObject, FlutterStreamHandler {
  private let methods: FlutterMethodChannel
  private let events: FlutterEventChannel
  private var sink: FlutterEventSink?
  private var observer: NSObjectProtocol?

  init(messenger: FlutterBinaryMessenger) {
    methods = FlutterMethodChannel(name: "yallapp/screen_security", binaryMessenger: messenger)
    events = FlutterEventChannel(name: "yallapp/screen_capture", binaryMessenger: messenger)
    super.init()
    methods.setMethodCallHandler { [weak self] call, result in
      switch call.method {
      case "setSecure":
        result(nil)
      case "isCaptured":
        result(self?.isCaptured ?? false)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
    events.setStreamHandler(self)
  }

  private var isCaptured: Bool {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if let scene = scenes.first {
      return scene.screen.isCaptured
    }
    return false
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
