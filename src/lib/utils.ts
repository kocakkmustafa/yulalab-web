import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStatus(status: string) {
  switch (status) {
    case "live":
      return "Yayında";
    case "beta":
      return "Beta";
    case "pre-launch":
      return "Yakında";
    case "in-development":
      return "Geliştiriliyor";
    default:
      return status;
  }
}
