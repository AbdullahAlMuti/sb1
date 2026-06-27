import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "./errors";

interface AdminMutationOptions<TVars, TData> {
  /** Query keys to invalidate on success. */
  invalidate?: QueryKey[];
  /** Toast shown on success. Pass a function for a per-result message. */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
}

/**
 * The one mutation hook for the admin app. Runs the mutation, invalidates the
 * affected query namespaces, and routes success/error through the shared toast
 * helpers so every mutation behaves identically.
 *
 * Audit note: mutations should go through admin RPCs (which write
 * `admin_audit_logs` atomically) or through `resource` table writes paired with
 * an explicit audit insert. This hook does not fabricate audit rows — it assumes
 * the underlying call is responsible for them.
 */
export function useAdminMutation<TVars = void, TData = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options: AdminMutationOptions<TVars, TData> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVars>({
    mutationFn,
    onSuccess: (data, vars) => {
      for (const key of options.invalidate ?? []) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      if (options.successMessage) {
        const msg =
          typeof options.successMessage === "function"
            ? options.successMessage(data, vars)
            : options.successMessage;
        if (msg) toast.success(msg);
      }
      options.onSuccess?.(data, vars);
    },
    onError: (error) => {
      void toastError(error);
    },
  });
}
