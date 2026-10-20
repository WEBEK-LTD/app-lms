package tr.com.yallapp.business.hms;

import android.content.Context;

import com.huawei.hms.aaid.HmsInstanceId;
import com.huawei.hms.api.ConnectionResult;
import com.huawei.hms.api.HuaweiApiAvailability;
import com.huawei.hms.push.HmsMessaging;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

/**
 * 65 Huawei Push Kit for the app: which push services the phone has, the
 * Push Kit token, and new tokens as Huawei sends them (HmsMessages).
 */
public final class HmsPush {
    /** Gets new Push Kit tokens. */
    public interface Listener {
        void onToken(String token);
    }

    private static volatile Listener listener;

    private HmsPush() {}

    public static void setListener(Listener value) {
        listener = value;
    }

    static void emitToken(String token) {
        Listener current = listener;
        if (current != null && token != null && !token.isEmpty()) current.onToken(token);
    }

    /** {"googlePlay": bool, "huawei": bool}. */
    public static Map<String, Object> availability(Context context) {
        Map<String, Object> status = new HashMap<>();
        status.put("googlePlay", googlePlayAvailable(context));
        boolean huawei;
        try {
            huawei = HuaweiApiAvailability.getInstance().isHuaweiMobileServicesAvailable(context) == ConnectionResult.SUCCESS;
        } catch (RuntimeException e) {
            huawei = false;
        }
        status.put("huawei", huawei);
        return status;
    }

    /**
     * Google Play services, found by name: Firebase brings the library into
     * every build. 0 is ConnectionResult.SUCCESS.
     */
    private static boolean googlePlayAvailable(Context context) {
        try {
            Class<?> type = Class.forName("com.google.android.gms.common.GoogleApiAvailability");
            Object instance = type.getMethod("getInstance").invoke(null);
            Method check = type.getMethod("isGooglePlayServicesAvailable", Context.class);
            return Integer.valueOf(0).equals(check.invoke(instance, context));
        } catch (ReflectiveOperationException | RuntimeException e) {
            return false;
        }
    }

    /**
     * The Push Kit token. Blocks: call it off the main thread. Older EMUI
     * versions answer with an empty string and send the token to
     * HmsMessages.onNewToken instead.
     */
    public static String token(Context context, String appId) throws Exception {
        return HmsInstanceId.getInstance(context).getToken(appId, HmsMessaging.DEFAULT_TOKEN_SCOPE);
    }
}
