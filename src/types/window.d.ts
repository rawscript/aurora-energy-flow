// Extend the Window interface to include custom properties
declare global {
  interface Window {
    authSuccessTimeout?: NodeJS.Timeout;
  }
}

export {};