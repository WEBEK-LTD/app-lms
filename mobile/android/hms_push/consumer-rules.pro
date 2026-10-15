# 36 Huawei's SDK and the app's channel to it (found by name from MainActivity).
-keepattributes *Annotation*,Exceptions,InnerClasses,Signature,SourceFile,LineNumberTable
-keep class com.huawei.hianalytics.** { *; }
-keep class com.huawei.updatesdk.** { *; }
-keep class com.huawei.hms.** { *; }
-dontwarn com.huawei.**
-keep class com.yallapp.hms.** { *; }
-keep class com.yallapp.app.HmsPushChannel { *; }
