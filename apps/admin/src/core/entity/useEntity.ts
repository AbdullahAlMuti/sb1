import { useQuery } from "@tanstack/react-query";
import { list } from "../data/resource";
import { type SortState } from "../ui/DataTable";
import { type EntityModule } from "./types";

interface UseEntityListArgs {
  sort: SortState;
  page: number;
}

/**
 * List query for an entity module. Fetches with server-side sort + pagination
 * using the descriptor's table/select. Returns rows + total count.
 */
export function useEntityList<T>(module: EntityModule<T>, { sort, page }: UseEntityListArgs) {
  const pageSize = module.pageSize ?? 20;

  return useQuery({
    queryKey: [module.key, "list", { sort, page }],
    queryFn: () =>
      list<T>(module.table, {
        select: module.select,
        order: { column: sort.column, ascending: sort.ascending },
        page,
        pageSize,
        withCount: true,
      }),
  });
}
