import { makeId } from "./idGen";
import type { DesignVersion, Edge, Floor, Room } from "./types";

export function createDesignVersion(name = "Original"): DesignVersion {
  return {
    id: makeId(),
    name,
    furniture: [],
    wallColors: {},
    floorColor: "#d8cdbc",
    notes: "",
  };
}

export function createEdgesForPoints(pointCount: number): Edge[] {
  return Array.from({ length: pointCount }, () => ({ id: makeId(), openings: [] }));
}

export function createRoom(name = "New Room"): Room {
  // default: a 12ft x 10ft rectangle
  const points = [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 10 },
    { x: 0, y: 10 },
  ];
  const initialVersion = createDesignVersion("Original");
  return {
    id: makeId(),
    name,
    points,
    edges: createEdgesForPoints(points.length),
    wallHeight: 9,
    wallThickness: 0.4,
    color: "#3b4a5a",
    designVersions: [initialVersion],
    activeDesignVersionId: initialVersion.id,
  };
}

export function createFloor(name = "Floor 1", elevation = 0): Floor {
  return {
    id: makeId(),
    name,
    elevation,
    rooms: [],
  };
}
