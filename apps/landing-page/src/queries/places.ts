import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { searchPlaces } from "@pray-times/core";

export const MIN_SEARCH_LENGTH = 2;

/**
 * The search term is the key, so a slow response for an older term can never
 * overwrite a newer one — the race guard this used to need is gone. Previous
 * results stay on screen while the next term loads, so the list does not blink
 * empty between keystrokes.
 */
export function placesQuery(term: string) {
  return queryOptions({
    queryKey: ["places", term],
    queryFn: () => searchPlaces(term, { limit: 6 }),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
