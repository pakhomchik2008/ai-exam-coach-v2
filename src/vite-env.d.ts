/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ONESIGNAL_APP_ID?: string;
}

// The OneSignal SDK (index.html <script>) creates this queue itself; typed
// loosely here since we don't ship the SDK's own type definitions.
interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- OneSignal ships no types
  OneSignalDeferred?: Array<(oneSignal: any) => void>;
}
