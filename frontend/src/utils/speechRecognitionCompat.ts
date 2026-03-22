/**
 * Speech Recognition Compatibility Utils
 * Handles browser-specific differences in Web Speech API availability
 * including privacy-focused browsers like Brave
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSpeechRecognitionAPI(): any {
  // Standard API (Chrome, Edge, Opera, Safari)
  if (typeof (window as any).SpeechRecognition !== 'undefined') {
    return (window as any).SpeechRecognition;
  }

  // Webkit prefix (older Safari, some Chromium browsers)
  if (typeof (window as any).webkitSpeechRecognition !== 'undefined') {
    return (window as any).webkitSpeechRecognition;
  }

  // Moz prefix (Firefox doesn't support, but including for completeness)
  if (typeof (window as any).mozSpeechRecognition !== 'undefined') {
    return (window as any).mozSpeechRecognition;
  }

  // MS prefix (older Edge)
  if (typeof (window as any).msSpeechRecognition !== 'undefined') {
    return (window as any).msSpeechRecognition;
  }

  return null;
}

/**
 * Check if browser supports Web Speech API
 * Note: Brave browser might report support but then fail with permission errors
 */
export function isSpeechRecognitionSupported(): boolean {
  try {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      return false;
    }

    // Some browsers report support but don't actually work
    // Try to instantiate to verify
    try {
      new SpeechRecognitionAPI();
      return true;
    } catch {
      // Instantiation failed - not truly supported
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Detect if browser is Brave
 * Brave has enhanced privacy and may block microphone access more aggressively
 */
export function isBraveBrowser(): boolean {
  try {
    // Brave exposes a property to detect itself
    return (navigator as any).brave !== undefined;
  } catch {
    return false;
  }
}

/**
 * Detect browser type for better error messaging
 */
export function detectBrowser(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/edg/.test(ua)) return 'Edge';
  if (/chrome/.test(ua) && /google/.test(ua)) {
    if (isBraveBrowser()) return 'Brave';
    return 'Chrome';
  }
  if (/firefox/.test(ua)) return 'Firefox';
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'Safari';
  if (/opera|opr/.test(ua)) return 'Opera';
  
  return 'Unknown';
}

/**
 * Get browser-specific error handling instructions
 */
export function getBrowserSpecificInstructions(): string {
  const browser = detectBrowser();

  switch (browser) {
    case 'Brave':
      return `Brave Browser detected. To use live transcription, please ensure:
1. Microphone permissions are granted for this site
2. Go to Settings → Privacy and Security → Site Settings → Microphone
3. Make sure this site is allowed to use the microphone
4. If still not working, try disabling Brave Shields for this site`;

    case 'Firefox':
      return `Firefox doesn't support browser-based live transcription. 
Your recording will be transcribed automatically after each segment is saved. 
This provides the same transcription quality.`;

    case 'Safari':
      return `Safari detected. To use live transcription, ensure microphone permissions are granted.`;

    case 'Chrome':
      return `Chrome detected. To use live transcription, ensure microphone permissions are granted.`;

    case 'Edge':
      return `Edge detected. To use live transcription, ensure microphone permissions are granted.`;

    default:
      return `To use live transcription, ensure your browser supports the Web Speech API 
and microphone permissions are granted.`;
  }
}

/**
 * Get battery status (helps with optimization for battery-powered devices)
 */
export async function getBatteryStatus(): Promise<{
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
} | null> {
  try {
    // Battery Status API - not all browsers support it
    if ((navigator as any).getBattery) {
      return await (navigator as any).getBattery();
    }
    return null;
  } catch {
    return null;
  }
}
