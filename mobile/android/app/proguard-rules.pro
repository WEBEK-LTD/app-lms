# 188 Stripe's PaymentSheet (flutter_stripe 14.2.0's README): classes it
# loads by name, and optional parts of the Stripe SDK the app doesn't ship.
-dontwarn com.stripe.android.pushProvisioning.**
-dontwarn com.google.android.gms.tapandpay.**
-dontwarn kotlinx.parcelize.Parceler$DefaultImpls
-dontwarn kotlinx.parcelize.Parceler
-dontwarn kotlinx.parcelize.Parcelize
-keep class com.stripe.** { *; }
