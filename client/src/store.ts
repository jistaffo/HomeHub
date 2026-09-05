import { create } from "zustand";
import { api } from "./api";
import type { House, HouseData } from "./types";

interface HouseStore {
  house: House | null;
  loading: boolean;
  error: string | null;
  saveState: "idle" | "pending" | "saving" | "error";
  selectedFloorId: string | null;
  loadHouse: (id: string) => Promise<void>;
  clearHouse: () => void;
  renameHouse: (name: string) => void;
  mutate: (fn: (data: HouseData) => void) => void;
  selectFloor: (floorId: string | null) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => HouseStore, set: (partial: Partial<HouseStore>) => void) {
  if (saveTimer) clearTimeout(saveTimer);
  set({ saveState: "pending" });
  saveTimer = setTimeout(async () => {
    const { house } = get();
    if (!house) return;
    set({ saveState: "saving" });
    try {
      const updated = await api.updateHouse(house.id, house.name, house.data);
      set({ house: updated, saveState: "idle" });
    } catch (e) {
      console.error(e);
      set({ saveState: "error" });
    }
  }, 700);
}

export const useHouseStore = create<HouseStore>((set, get) => ({
  house: null,
  loading: false,
  error: null,
  saveState: "idle",
  selectedFloorId: null,

  loadHouse: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const house = await api.getHouse(id);
      set({
        house,
        loading: false,
        selectedFloorId: house.data.floors[0]?.id ?? null,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  clearHouse: () => set({ house: null, selectedFloorId: null, saveState: "idle" }),

  renameHouse: (name: string) => {
    const { house } = get();
    if (!house) return;
    set({ house: { ...house, name } });
    scheduleSave(get, set);
  },

  mutate: (fn: (data: HouseData) => void) => {
    const { house } = get();
    if (!house) return;
    const nextData: HouseData = structuredClone(house.data);
    fn(nextData);
    set({ house: { ...house, data: nextData } });
    scheduleSave(get, set);
  },

  selectFloor: (floorId: string | null) => set({ selectedFloorId: floorId }),
}));
