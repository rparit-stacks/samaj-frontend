package com.rps.samajapp;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** App cream background — hsl(30 25% 98%), not pure white */
    private static final int SYSTEM_BAR_COLOR = Color.parseColor("#FBF9F8");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
    }

    @Override
    public void onStart() {
        super.onStart();
        applySystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-apply after Capacitor/SplashScreen — they can reset icon style.
        applySystemBars();
        // StatusBar plugin may flip icons after JS init — re-assert shortly after.
        getWindow().getDecorView().postDelayed(this::applySystemBars, 300);
        getWindow().getDecorView().postDelayed(this::applySystemBars, 900);
    }

    private void applySystemBars() {
        Window window = getWindow();
        View decor = window.getDecorView();

        // Prefer laid-out below status bar when the theme opts out of edge-to-edge.
        WindowCompat.setDecorFitsSystemWindows(window, true);

        window.setStatusBarColor(SYSTEM_BAR_COLOR);
        window.setNavigationBarColor(SYSTEM_BAR_COLOR);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, decor);
        if (controller != null) {
            // true = dark/black clock, battery, signal icons on light bar
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }
    }
}
