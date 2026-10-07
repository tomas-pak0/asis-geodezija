package lt.tyliaitpk.asis;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.GnssStatus;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String PAGE = ORIGIN + "/assets/index.html";
    private static final String PRIVACY = ORIGIN + "/assets/privacy.html";
    private static final String PRIVACY_EN = ORIGIN + "/assets/privacy.en.html";
    private static final String PRIVACY_RU = ORIGIN + "/assets/privacy.ru.html";
    private static boolean isInternalPage(String url){return PAGE.equals(url)||PRIVACY.equals(url)||PRIVACY_EN.equals(url)||PRIVACY_RU.equals(url);}
    private static final int LOCATION_REQUEST = 12, FILE_REQUEST = 14;
    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;
    private GeolocationPermissions.Callback pendingLocation;
    private String pendingOrigin;
    private LocationManager locationManager;
    private boolean gnssTracking, pageReady, locationRequested, locationListening;
    private Location lastLocation;
    private final LocationListener locationListener=this::onLocation;
    private final class NativeLocation {
        @JavascriptInterface public void start(){runOnUiThread(()->{
            if(!PAGE.equals(webView.getUrl()))return;
            locationRequested=true;
            if(hasLocationPermission())startLocation();
            else requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_REQUEST);
        });}
        @JavascriptInterface public void stop(){runOnUiThread(()->{
            locationRequested=false;stopLocation();
        });}
    }
    private final class NativeShare {
        @JavascriptInterface public void send(String text,String language){runOnUiThread(()->{
            if(webView==null||!PAGE.equals(webView.getUrl())||text==null||text.isEmpty()||text.length()>2000)return;
            Intent send=new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT,text);
            try{startActivity(Intent.createChooser(send,"ru".equals(language)?"Поделиться координатами":"en".equals(language)?"Share coordinates":"Bendrinti koordinates"));}
            catch(ActivityNotFoundException ignored){
                sendToPage("document.getElementById('shareStatus').textContent='Nėra programėlės tekstui bendrinti.';");
            }
        });}
    }
    private String gpsText="Laukiama vietos leidimo";
    private final GnssStatus.Callback gnssCallback=new GnssStatus.Callback() {
        @Override public void onStarted(){gpsText="Ieškoma palydovų…";showTelemetry();}
        @Override public void onStopped(){gpsText="GPS imtuvas sustabdytas";showTelemetry();}
        @Override public void onSatelliteStatusChanged(GnssStatus status){
            int visible=status.getSatelliteCount(),used=0;float strength=0;
            for(int i=0;i<visible;i++)if(status.usedInFix(i)){used++;strength+=status.getCn0DbHz(i);}
            gpsText="Matomi "+visible+" · naudojami "+used+(used>0?String.format(Locale.getDefault()," · vid. %.1f dB-Hz",strength/used):"");
            showTelemetry();
        }
    };
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xff101216);getWindow().setNavigationBarColor(0xff101216);
        locationManager=(LocationManager)getSystemService(LOCATION_SERVICE);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView=new WebView(this);webView.setBackgroundColor(0xff101216);
        webView.setKeepScreenOn(true);
        FrameLayout frame=new FrameLayout(this);frame.setBackgroundColor(0xff101216);
        frame.addView(webView,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
        if(Build.VERSION.SDK_INT>=35)frame.setOnApplyWindowInsetsListener((view,insets)->{
            android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
            view.setPadding(safe.left,safe.top,safe.right,safe.bottom);return WindowInsets.CONSUMED;
        });
        setContentView(frame);
        // WindowInsetsController requires an attached decor view on Android 16.
        if(Build.VERSION.SDK_INT>=30){
            WindowInsetsController controller=getWindow().getInsetsController();
            if(controller!=null)controller.setSystemBarsAppearance(0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }else{
            getWindow().getDecorView().setSystemUiVisibility(getWindow().getDecorView().getSystemUiVisibility()
                & ~(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR));
        }
        WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        webView.addJavascriptInterface(new NativeLocation(),"AsisNativeLocation");
        webView.addJavascriptInterface(new NativeShare(),"AsisNativeShare");
        settings.setGeolocationEnabled(true);settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(request.isForMainFrame()&&!isInternalPage(request.getUrl().toString())){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(ActivityNotFoundException ignored){}
                    return true;
                }
                return false;
            }
            @Override public void onPageFinished(WebView view,String url){pageReady=PAGE.equals(url);showTelemetry();}
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
                pendingFiles=callback;
                try{Intent choose=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    choose.addCategory(Intent.CATEGORY_OPENABLE);choose.setType("*/*");
                    choose.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(choose,FILE_REQUEST);
                }catch(ActivityNotFoundException ex){pendingFiles.onReceiveValue(null);pendingFiles=null;}
                return true;
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!ORIGIN.equals(origin)){callback.invoke(origin,false,false);return;}
                if(hasLocationPermission()){callback.invoke(origin,true,false);startTelemetry();return;}
                pendingLocation=callback;pendingOrigin=origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_REQUEST);
            }
        });
        webView.loadUrl(PAGE);
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==FILE_REQUEST&&pendingFiles!=null){pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));pendingFiles=null;}
    }
    private boolean hasLocationPermission(){return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED
        ||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;}
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
        super.onRequestPermissionsResult(code,permissions,results);
        if(code!=LOCATION_REQUEST)return;
        if(pendingLocation!=null){pendingLocation.invoke(pendingOrigin,hasLocationPermission(),false);pendingLocation=null;pendingOrigin=null;}
        if(locationRequested){
            if(hasLocationPermission())startLocation();
            else {locationRequested=false;sendLocationError("Suteik vietos leidimą programėlei telefono nustatymuose.");
                sendToPage("window.AsisApplyNativeLocationStopped?.();");}
        }
        startTelemetry();
    }
    private void sendToPage(String script){
        if(pageReady&&webView!=null)webView.evaluateJavascript(script,null);
    }
    private void sendLocationError(String message){
        sendToPage("window.AsisApplyNativeLocationError?.("+JSONObject.quote(message)+");");
    }
    private void onLocation(Location location){
        if(!locationRequested||!pageReady)return;
        if(lastLocation!=null&&location.getTime()<lastLocation.getTime())return;
        lastLocation=location;
        String payload="{latitude:"+location.getLatitude()+",longitude:"+location.getLongitude()
            +",accuracy:"+(location.hasAccuracy()?location.getAccuracy():"null")
            +",speed:"+(location.hasSpeed()?location.getSpeed():"null")
            +",heading:"+(location.hasBearing()?location.getBearing():"null")
            +",headingAccuracy:"+(location.hasBearingAccuracy()?location.getBearingAccuracyDegrees():"null")
            +",timestamp:"+location.getTime()+"}";
        sendToPage("window.AsisApplyNativePosition?.("+payload+");");
    }
    private void startLocation(){
        if(!locationRequested||locationListening||!hasLocationPermission())return;
        boolean registered=false;
        try{
            if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED
                &&locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)){
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000,0,locationListener);
                registered=true;
            }
            if(locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)){
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,1000,0,locationListener);
                registered=true;
            }
            locationListening=registered;
            if(registered){
                Location cached=null;
                if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED)
                    cached=locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                Location network=locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if(network!=null&&(cached==null||network.getTime()>cached.getTime()))cached=network;
                if(cached!=null&&System.currentTimeMillis()-cached.getTime()<60000)onLocation(cached);
            }else{
                locationRequested=false;
                sendLocationError("Įjunk telefono vietos nustatymą (GPS) ir bandyk dar kartą.");
                sendToPage("window.AsisApplyNativeLocationStopped?.();");
            }
        }catch(SecurityException|IllegalArgumentException e){
            locationRequested=false;stopLocation();
            sendLocationError("Nepavyko pradėti vietos matavimo. Patikrink vietos leidimą ir GPS.");
            sendToPage("window.AsisApplyNativeLocationStopped?.();");
        }
    }
    private void stopLocation(){
        locationManager.removeUpdates(locationListener);locationListening=false;
    }
    private void startTelemetry(){
        if(hasLocationPermission()&&!gnssTracking){
            if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED){
                try{gnssTracking=locationManager.registerGnssStatusCallback(gnssCallback,new Handler(Looper.getMainLooper()));}
                catch(SecurityException|IllegalArgumentException ex){gpsText="Palydovų duomenys neprieinami";}
            }else gpsText="Palydovams reikia tikslios vietos leidimo";
        }
        showTelemetry();
    }
    private void showTelemetry(){
        if(webView==null||!pageReady)return;
        String script="if(window.AsisApplyNativeTelemetry)window.AsisApplyNativeTelemetry({gps:"
            +JSONObject.quote(gpsText)+"});";
        runOnUiThread(()->{if(pageReady)webView.evaluateJavascript(script,null);});
    }
    @Override protected void onResume(){
        super.onResume();if(webView!=null)webView.onResume();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if(webView!=null)webView.setKeepScreenOn(true);
        if(locationRequested&&pageReady)startLocation();
        if(locationManager!=null&&hasLocationPermission())startTelemetry();
    }
    @Override protected void onPause(){
        stopLocation();
        if(gnssTracking){locationManager.unregisterGnssStatusCallback(gnssCallback);gnssTracking=false;}
        if(webView!=null)webView.onPause();super.onPause();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus){
        super.onWindowFocusChanged(hasFocus);
        if(hasFocus){
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if(webView!=null)webView.setKeepScreenOn(true);
        }
    }
    @Override protected void onDestroy(){
        stopLocation();
        if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}
        if(webView!=null)webView.destroy();super.onDestroy();
    }
    @Override public void onBackPressed(){
        if(webView!=null&&webView.canGoBack())webView.goBack();
        else super.onBackPressed();
    }
}


