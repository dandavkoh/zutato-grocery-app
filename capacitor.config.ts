import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zutato.app',
  appName: 'ZUTATO',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'ionic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#fbbf24",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#fbbf24"
    },
    Keyboard: {
      resize: "ionic",
      style: "dark",
      resizeOnFullScreen: true
    },
    App: {
      launchUrl: "https://zutato.app"
    }
  },
  ios: {
    scheme: "ZUTATO",
    contentInset: "automatic"
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
