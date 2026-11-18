package com.yallapp.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * 170 The payment page, in Chrome's Custom Tab over the app, sends the
 * customer back with the app's own address
 * (`yallapp-<app id>://app/pay-return?order=<id>&result=<…>`). This activity
 * shows nothing: with the app running, [MainActivity] comes back over the
 * tab (which closes it) and hands the link to the payment screen, which
 * asks the platform how the payment stands; without it, the app starts with
 * the link, which opens Orders.
 */
class PayReturnActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val link = intent?.data
        val main = MainActivity.running()
        if (link != null && main != null) {
            main.payReturned(link)
        } else {
            startActivity(
                Intent(this, MainActivity::class.java)
                    .setData(link)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            )
        }
        finish()
    }
}
