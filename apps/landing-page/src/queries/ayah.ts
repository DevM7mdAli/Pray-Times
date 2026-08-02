import { queryOptions } from "@tanstack/react-query";
import { fetchAyah } from "@pray-times/core";

/**
 * The provider picks the verse, so there is nothing to key on. It is held for
 * the whole visit and only replaced when the reader asks for another one —
 * a background refetch swapping the verse mid-read would be startling.
 */
export function ayahQuery() {
  return queryOptions({
    queryKey: ["ayah"],
    queryFn: () => fetchAyah(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
