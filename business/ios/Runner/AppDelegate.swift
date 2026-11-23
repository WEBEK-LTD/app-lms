import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // 132 While the app lock is on, a blur covers the app as it leaves the
    // screen, so the app switcher shows nothing of the business.
    NotificationCenter.default.addObserver(
      forName: UIScene.willDeactivateNotification, object: nil, queue: .main
    ) { note in
      if let scene = note.object as? UIWindowScene { PrivacyCover.show(in: scene) }
    }
    NotificationCenter.default.addObserver(
      forName: UIScene.didActivateNotification, object: nil, queue: .main
    ) { _ in
      PrivacyCover.hide()
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    // 132 Turned on and off with the app lock (lib/core/services/privacy.dart).
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "YallappPrivacyCover") {
      let channel = FlutterMethodChannel(
        name: "tr.com.yallapp.business/privacy", binaryMessenger: registrar.messenger())
      channel.setMethodCallHandler { call, result in
        if call.method == "setSecure" {
          let args = call.arguments as? [String: Any]
          PrivacyCover.enabled = (args?["on"] as? Bool) ?? false
          if !PrivacyCover.enabled { PrivacyCover.hide() }
          result(nil)
        } else {
          result(FlutterMethodNotImplemented)
        }
      }
    }
    // 206 The ringtones (lib/core/services/ringtones.dart): pushes carry the
    // sounds bundled in Runner/Sounds; the app asks for the time zone of the
    // quiet hours. The rest is Android's.
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "YallappRing") {
      let channel = FlutterMethodChannel(
        name: "tr.com.yallapp.business/ring", binaryMessenger: registrar.messenger())
      channel.setMethodCallHandler { call, result in
        switch call.method {
        case "timeZone":
          result(TimeZone.current.identifier)
        case "stopRinging":
          // iOS stops a notification's sound once the app is open.
          result(nil)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }
  }
}

/// 132 The blur over the app's windows while it isn't in front.
enum PrivacyCover {
  static var enabled = false
  private static var covers: [UIView] = []

  static func show(in scene: UIWindowScene) {
    guard enabled, covers.isEmpty else { return }
    for window in scene.windows {
      let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemThickMaterial))
      blur.frame = window.bounds
      blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      window.addSubview(blur)
      covers.append(blur)
    }
  }

  static func hide() {
    covers.forEach { $0.removeFromSuperview() }
    covers.removeAll()
  }
}
