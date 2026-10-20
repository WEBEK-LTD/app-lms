import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// 59 Release signing for Yallapp Business under Yallapp's own Google Play
// account (docs/LAUNCH-CHECKLIST.md). Never committed: see .gitignore.
val signing = Properties().apply {
    val file = rootProject.file("key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

android {
    namespace = "tr.com.yallapp.business"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "tr.com.yallapp.business"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // From pubspec.yaml's version.
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

// 65 Huawei push for phones without Google Play services: only when
// agconnect-services.json is present (written by tool/hms_config.dart from
// the build's variables, never committed). The channel to Dart (src/huawei)
// and Huawei's SDK (../hms_push) are then built in; without the file the
// build has nothing from Huawei. As in the customers' app (mobile/, 36).
if (file("agconnect-services.json").exists()) {
    android.sourceSets.getByName("main").java.srcDir("src/huawei/java")
    dependencies {
        implementation(project(":hms_push"))
    }
}
