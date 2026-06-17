import { toast } from "sonner";
import { getFunctionErrorMessage } from "@repo/api-client/supabase/client";

/**
 * One place to turn any thrown value into a human message. Handles plain
 * Errors, Supabase PostgrestError shapes, and Edge Function error envelopes.
 */
export async function toMessage(error: unknown, fallback = "Something went wrong"): Promise<string> {
  if (!error) return fallback;

  // Supabase Edge Function errors carry the real message in the response body.
  const maybeFnMessage = await getFunctionErrorMessage(error).catch(() => null);
  if (maybeFnMessage) return maybeFnMessage;

  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  const anyErr = error as { message?: string; error?: string; details?: string };
  return anyErr.message || anyErr.error || anyErr.details || fallback;
}

/** Surface an error to the operator as a toast and return the resolved message. */
export async function toastError(error: unknown, fallback?: string): Promise<string> {
  const message = await toMessage(error, fallback);
  toast.error(message);
  return message;
}
