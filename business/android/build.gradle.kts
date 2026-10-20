allprojects {
    repositories {
        google()
        mavenCentral()
        // 65 Huawei's SDK, only for builds with Huawei push (hms_push/).
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

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
