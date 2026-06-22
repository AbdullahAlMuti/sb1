import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";

/**
 * Resolves dynamic sidebar badge counts keyed by `NavBadge.countKey`.
 *
 * Replaces the previously hardcoded literal badges (`6 / 4 / 12`) with real,
 * cached counts. Keys with no real source simply stay `undefined` and render
 * nothing — the sidebar never shows an invented number again.
 */
export type NavBadgeCounts = Record<string, number | undefined>;

export function useNavBadges(): NavBadgeCounts {
  const { data } = useQuery<NavBadgeCounts>({
    queryKey: ["admin-nav-badges"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notices")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return { notices: count ?? undefined };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return data ?? {};
}
