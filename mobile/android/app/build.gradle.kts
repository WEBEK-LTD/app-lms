import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Written by tool/apply_config.dart from the client's build config.
val yallapp = Properties().apply {
    val file = file("yallapp.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

android {
    namespace = yallapp.getProperty("namespace", "com.yallapp.app")
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = yallapp.getProperty("applicationId", "com.yallapp.app")
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // From pubspec.yaml, which tool/apply_config.dart keeps in step with
        // the build config's version_name and version_code.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Release signing is added by the build pipeline (Phase 5). Never
            // commit keystores or key.properties.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// Push notifications: only when the client's google-services.json is present
// (downloaded by tool/apply_config.dart, never committed). Without it the app
// builds normally and push stays off.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
