"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IOS_SOURCE_COOKIE } from "@/lib/ios-source-constants";

const STORAGE_KEY = "auro_ios_src";

function persistFlag() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore storage errors
  }
  try {
    document.cookie = `${IOS_SOURCE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

export function useIosSourceFlag(): boolean {
  const searchParams = useSearchParams();
  const [isIosSource, setIsIosSource] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sourceParam = searchParams?.get("src");
    if (sourceParam === "ios") {
      persistFlag();
      setIsIosSource(true);
      return;
    }
    const stored = window.localStorage?.getItem(STORAGE_KEY) === "1";
    const cookieMatch = document.cookie
      .split(";")
      .some((entry) => entry.trim().startsWith(`${IOS_SOURCE_COOKIE}=1`));
    setIsIosSource(stored || cookieMatch);
  }, [searchParams]);

  return isIosSource;
}


