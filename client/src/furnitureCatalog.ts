import type { FurnitureCatalogItem } from "./types";

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  { id: "bed-queen", name: "Queen Bed", category: "Bedroom", width: 5, depth: 6.6, height: 2, color: "#9c8465" },
  { id: "bed-twin", name: "Twin Bed", category: "Bedroom", width: 3.2, depth: 6.3, height: 2, color: "#9c8465" },
  { id: "nightstand", name: "Nightstand", category: "Bedroom", width: 1.5, depth: 1.5, height: 2, color: "#7a6248" },
  { id: "dresser", name: "Dresser", category: "Bedroom", width: 4, depth: 1.6, height: 2.7, color: "#7a6248" },
  { id: "sofa", name: "Sofa", category: "Living Room", width: 7, depth: 3, height: 2.8, color: "#5b7a8c" },
  { id: "loveseat", name: "Loveseat", category: "Living Room", width: 5, depth: 3, height: 2.8, color: "#5b7a8c" },
  { id: "coffee-table", name: "Coffee Table", category: "Living Room", width: 4, depth: 2, height: 1.4, color: "#7a6248" },
  { id: "tv-stand", name: "TV Stand", category: "Living Room", width: 5, depth: 1.4, height: 1.8, color: "#4a4a4a" },
  { id: "bookshelf", name: "Bookshelf", category: "Living Room", width: 3, depth: 1, height: 6, color: "#7a6248" },
  { id: "dining-table-4", name: "Dining Table (4)", category: "Dining Room", width: 4, depth: 3, height: 2.5, color: "#7a6248" },
  { id: "dining-table-6", name: "Dining Table (6)", category: "Dining Room", width: 6, depth: 3.5, height: 2.5, color: "#7a6248" },
  { id: "chair", name: "Chair", category: "Dining Room", width: 1.6, depth: 1.6, height: 3, color: "#8c6f52" },
  { id: "desk", name: "Desk", category: "Office", width: 4.5, depth: 2.2, height: 2.5, color: "#5f5f5f" },
  { id: "office-chair", name: "Office Chair", category: "Office", width: 2, depth: 2, height: 3.5, color: "#2f2f2f" },
  { id: "fridge", name: "Refrigerator", category: "Kitchen", width: 3, depth: 2.8, height: 5.8, color: "#c9c9c9" },
  { id: "stove", name: "Stove/Range", category: "Kitchen", width: 2.5, depth: 2.2, height: 3, color: "#3a3a3a" },
  { id: "kitchen-island", name: "Kitchen Island", category: "Kitchen", width: 5, depth: 3, height: 3, color: "#a3a3a3" },
  { id: "toilet", name: "Toilet", category: "Bathroom", width: 1.6, depth: 2.4, height: 2.6, color: "#e8e8e8" },
  { id: "bathtub", name: "Bathtub", category: "Bathroom", width: 5, depth: 2.6, height: 1.6, color: "#e8e8e8" },
  { id: "vanity", name: "Vanity/Sink", category: "Bathroom", width: 3, depth: 2, height: 2.8, color: "#e8e8e8" },
];

export function findFurniture(catalogId: string): FurnitureCatalogItem | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === catalogId);
}
