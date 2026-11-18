// The Google Services plugin is on the classpath for every build but only
// applied by app/build.gradle.kts when the client's google-services.json is
// present (push notifications on).
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.google.gms:google-services:4.4.2")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        // 36 Huawei's SDK, only for builds with Huawei push (hms_push/).
        if (rootProject.file("app/agconnect-services.json").exists()) {
            maven("https://developer.huawei.com/repo/")
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}
// 192 Google's play-services-tapandpay (for issuing cards to wallets, which the apps don't do)
// isn't on any public repository: left out of every library's lint checks, where Stripe's
// push-provisioning module asks for it, so nothing tries to download it.
subprojects {
    configurations.matching { it.name.contains("LintChecks", ignoreCase = true) || it.name == "lintChecks" || it.name == "lintPublish" }.configureEach {
        exclude(group = "com.google.android.gms", module = "play-services-tapandpay")
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
