"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    electron?: { isElectron: boolean };
  }
}

export function useIsElectron(): boolean {
  const [isElectron, setIsElectron] = useState(false);
  useEffect(() => {
    setIsElectron(Boolean(typeof window !== "undefined" && window.electron?.isElectron));
  }, []);
  return isElectron;
}
