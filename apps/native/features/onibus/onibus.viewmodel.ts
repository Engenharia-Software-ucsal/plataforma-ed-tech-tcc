import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { busStopFilterAtom, type BusStopFilter } from "@/state/busStopFilter";
import { favoriteBusTimesAtom } from "@/state/favoriteBusTimes";
import { BUS_DEPARTURES, type BusStop } from "@/features/onibus/onibus.model";

const FILTER_TO_STOP: Record<Exclude<BusStopFilter, "Todos">, BusStop> = {
  UCSAL: "UCSAL",
  "Pituaçu": "PITUACU",
};

export function useOnibusViewModel() {
  const [filter, setFilter] = useAtom(busStopFilterAtom);
  const [favorites, setFavorites] = useAtom(favoriteBusTimesAtom);

  const filtered = useMemo(() => {
    if (filter === "Todos") {
      return BUS_DEPARTURES;
    }
    const stop = FILTER_TO_STOP[filter];
    return BUS_DEPARTURES.filter((departure) => departure.stop === stop);
  }, [filter]);

  const next = filtered[0] ?? BUS_DEPARTURES[0];

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [setFavorites],
  );

  return { next, filtered, filter, setFilter, isFavorite, toggleFavorite } as const;
}
