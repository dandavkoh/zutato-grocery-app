// Utility to reliably show the iOS keyboard when navigating to a route
// where an input should be focused. On iOS, focusing programmatically
// outside of a direct user gesture does not open the keyboard. We work
// around this by briefly focusing a tiny, nearly invisible input in the
// same click handler that triggers navigation, then transfer focus to the
// real input on the destination route.

let primerInputElement: HTMLInputElement | null = null;

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isIPhoneIPadIPod = /iPad|iPhone|iPod/.test(userAgent);
  const isIOS13PlusIPad =
    navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
  return isIPhoneIPadIPod || isIOS13PlusIPad;
}

export function primeKeyboard(): void {
  if (!isIOS()) return;
  try {
    // If already primed, do nothing
    if (primerInputElement && document.body.contains(primerInputElement)) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'search';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.id = 'keyboard-primer';

    // The element must be in the viewport and not display:none for iOS to open the keyboard.
    // Keep it 1px sized and almost transparent.
    Object.assign(input.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '1px',
      height: '1px',
      opacity: '0.01',
      border: '0',
      padding: '0',
      margin: '0',
      background: 'transparent',
      color: 'transparent',
      zIndex: '999999',
    } as CSSStyleDeclaration);

    document.body.appendChild(input);
    primerInputElement = input;

    // Focus and select to trigger keyboard
    input.focus();
    try {
      input.setSelectionRange(0, 0);
    } catch {
      // Some browsers may throw; ignore.
    }
  } catch {
    // Ignore any errors; worst case the primer won't be set.
  }
}

export function releaseKeyboardPrimer(): void {
  try {
    if (primerInputElement) {
      // Blur first to avoid leaving the fake input focused
      try {
        primerInputElement.blur();
      } catch {
        // ignore
      }
      if (primerInputElement.parentNode) {
        primerInputElement.parentNode.removeChild(primerInputElement);
      }
      primerInputElement = null;
    }
  } catch {
    // ignore
  }
}

