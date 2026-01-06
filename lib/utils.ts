import { clsx, type ClassValue } from "clsx";
import { PostgrestError } from "@supabase/supabase-js";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const hasEnvVars = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
);

/**
 * Type guard to check if an error is a PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

/**
 * Type guard to check if an error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isPostgrestError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
