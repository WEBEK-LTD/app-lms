package tr.com.yallapp.business.hms;

import android.os.Bundle;

import com.huawei.hms.push.HmsMessageService;

/**
 * 65 Huawei Push Kit's service: new tokens go to the app. Notifications are
 * shown by Huawei's system; tapping one opens the app with its data.
 */
public class HmsMessages extends HmsMessageService {
    @Override
    public void onNewToken(String token) {
        HmsPush.emitToken(token);
    }

    @Override
    public void onNewToken(String token, Bundle bundle) {
        HmsPush.emitToken(token);
    }
}
