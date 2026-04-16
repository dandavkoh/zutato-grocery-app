import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { logDebug, logError } from '../utils/logger'

class CapacitorService {
  private isNative = Capacitor.isNativePlatform()

  async initialize() {
    if (this.isNative) {
      await this.initializeNativeFeatures()
    }
  }

  private async initializeNativeFeatures() {
    try {
      // Status Bar konfigurieren
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#fbbf24' })

      // Splash Screen verstecken
      await SplashScreen.hide()

      // Keyboard-Einstellungen
      await Keyboard.setResizeMode({ mode: KeyboardResize.Ionic })
      await Keyboard.setScroll({ isDisabled: false })

      // App State Listener
      App.addListener('appStateChange', ({ isActive }) => {
        logDebug('App state changed. Is active?', isActive)
      })

      // Back Button Listener (Android)
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp()
        } else {
          window.history.back()
        }
      })

    } catch (error) {
      logError('Error initializing native features:', error)
    }
  }

  async hapticFeedback(style: ImpactStyle = ImpactStyle.Medium) {
    if (this.isNative) {
      try {
        await Haptics.impact({ style })
      } catch (error) {
        logError('Haptic feedback error:', error)
      }
    }
  }

  async showKeyboard() {
    if (this.isNative) {
      try {
        await Keyboard.show()
      } catch (error) {
        logError('Show keyboard error:', error)
      }
    }
  }

  async hideKeyboard() {
    if (this.isNative) {
      try {
        await Keyboard.hide()
      } catch (error) {
        logError('Hide keyboard error:', error)
      }
    }
  }

  isNativePlatform() {
    return this.isNative
  }

  getPlatform() {
    return Capacitor.getPlatform()
  }
}

export const capacitorService = new CapacitorService()
