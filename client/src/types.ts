// All lengths are in feet. Angles are in degrees. Colors are CSS hex strings.

export interface Point {
  x: number;
  y: number;
}

export type OpeningType = "door" | "window";

export interface Opening {
  id: string;
  type: OpeningType;
  /** 0..1 position of the opening's center along the edge it sits on */
  t: number;
  /** width of the opening, in feet */
  width: number;
  /** height of the opening, in feet (door/window height, not sill) */
  height: number;
  /** distance from floor to bottom of opening, in feet (0 for doors) */
  sillHeight: number;
}

export interface Edge {
  id: string;
  /** openings placed along this edge (doors/windows), ordered by t */
  openings: Opening[];
}

export interface Room {
  id: string;
  name: string;
  /** ordered polygon vertices, in feet, floor-plan (top-down) coordinates */
  points: Point[];
  /** one Edge entry per polygon edge, points[i] -> points[i+1] */
  edges: Edge[];
  wallHeight: number;
  wallThickness: number;
  color: string;
  designVersions: DesignVersion[];
  activeDesignVersionId: string;
}

export interface FurniturePlacement {
  id: string;
  catalogId: string;
  /** position of item center, in feet, floor coordinates */
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  label: string;
}

export interface DesignVersion {
  id: string;
  name: string;
  furniture: FurniturePlacement[];
  /** wall paint color per edge id */
  wallColors: Record<string, string>;
  floorColor: string;
  notes: string;
}

export interface BlueprintImage {
  dataUrl: string;
  /** feet per pixel, computed from calibration */
  scale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface Floor {
  id: string;
  name: string;
  /** vertical elevation of this floor's finished floor level, in feet */
  elevation: number;
  rooms: Room[];
  blueprint?: BlueprintImage;
}

export interface HouseData {
  floors: Floor[];
}

export interface HouseSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface House extends HouseSummary {
  data: HouseData;
}

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}
