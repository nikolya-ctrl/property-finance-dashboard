import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Demo exchange rate: 1 USD = 300 LKR */
export const USD_LKR = 300;

export const toLKR = (amount: number, currency: "LKR" | "USD") =>
  currency === "USD" ? amount * USD_LKR : amount;

export const fmtLKR = (n: number) =>
  "LKR " + Math.round(n).toLocaleString("en-US");

export const fmtLKRShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `LKR ${Math.round(n / 1_000)}k`;
  return fmtLKR(n);
};

export const fmtUSD = (lkr: number) =>
  "$" + Math.round(lkr / USD_LKR).toLocaleString("en-US");

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
