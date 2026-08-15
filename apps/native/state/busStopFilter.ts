import { atom } from "jotai";

export type BusStopFilter = "Todos" | "UCSAL" | "Pituaçu";

export const busStopFilterAtom = atom<BusStopFilter>("Todos");
