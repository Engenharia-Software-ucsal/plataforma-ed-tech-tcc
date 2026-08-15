import { atom } from "jotai";

export const favoriteBusTimesAtom = atom<Set<string>>(new Set<string>());
