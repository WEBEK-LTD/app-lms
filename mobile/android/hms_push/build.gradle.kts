// 36 Huawei Push Kit, for Android phones without Google Play services.
//
// settings.gradle.kts includes this module only when the client's
// agconnect-services.json is in android/app (downloaded by
// tool/apply_config.dart, never committed): ordinary builds never see it, nor
// Huawei's Maven repository. It has no Flutter code; the app's
// HmsPushChannel (android/app/src/huawei) talks to Dart.
//
// The AppGallery Connect Gradle plugin isn't used: the app ID it would put
// in the manifest is set here from the same file, and the file goes into the
// assets, where Huawei's SDK reads it.

plugins {
    id("com.android.library")
}

val agconnect = rootProject.file("app/agconnect-services.json")

@Suppress("UNCHECKED_CAST")
val hmsAppId: String = (groovy.json.JsonSlurper().parse(agconnect) as Map<String, Any?>).let { json ->
    val appInfo = json["app_info"] as? Map<String, Any?>
    val client = json["client"] as? Map<String, Any?>
    (appInfo?.get("app_id") ?: client?.get("app_id"))?.toString()
        ?: throw GradleException("agconnect-services.json has no app ID.")
}

// The file goes into this module's assets. It is copied while Gradle reads
// the build, and the folder is given as a plain path: Android Gradle Plugin 9
// refuses a Provider in the source sets.
val agconnectAssets: File = layout.buildDirectory.dir("generated/agconnect").get().asFile
agconnect.copyTo(File(agconnectAssets, "agconnect-services.json"), overwrite = true)

android {
    namespace = "com.yallapp.hms"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
        manifestPlaceholders["hmsAppId"] = hmsAppId
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets.getByName("main").assets.srcDir(agconnectAssets)
}

dependencies {
    implementation("com.huawei.hms:push:6.13.0.300")
}
