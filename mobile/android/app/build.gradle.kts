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

// Release signing, written by the build pipeline from the client's upload key
// (build/README.md). Never committed: see .gitignore.
val signing = Properties().apply {
    val file = rootProject.file("key.properties")
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

    signingConfigs {
        if (signing.getProperty("storeFile") != null) {
            create("release") {
                storeFile = file(signing.getProperty("storeFile"))
                storePassword = signing.getProperty("storePassword")
                keyAlias = signing.getProperty("keyAlias")
                keyPassword = signing.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Without key.properties (local runs, CI checks) release builds use
            // the debug key; such builds can't be uploaded to Google Play.
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
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

// 36 Huawei push for phones without Google Play services: only when the
// client's agconnect-services.json is present (downloaded by
// tool/apply_config.dart, never committed). The channel to Dart
// (src/huawei) and Huawei's SDK (../hms_push) are then built in; without the
// file the build has nothing from Huawei.
if (file("agconnect-services.json").exists()) {
    android.sourceSets.getByName("main").java.srcDir("src/huawei/java")
    dependencies {
        implementation(project(":hms_push"))
    }
}
