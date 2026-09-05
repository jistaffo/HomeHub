import type { Point } from "./types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function edgeAngleDeg(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Resize an edge by moving point `b` so the segment a->b has the given length, keeping direction. */
export function setEdgeLength(a: Point, b: Point, length: number): Point {
  const currentLength = distance(a, b) || 1;
  const scale = length / currentLength;
  return {
    x: a.x + (b.x - a.x) * scale,
    y: a.y + (b.y - a.y) * scale,
  };
}

export function polygonCentroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Shoelace formula. Returns square feet. */
export function polygonArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonPerimeter(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += distance(points[i], points[(i + 1) % points.length]);
  }
  return sum;
}

export interface SegmentProjection {
  t: number;
  distance: number;
  point: Point;
}

/** Projects point p onto segment a->b, clamped to [0,1]. */
export function projectPointOnSegment(p: Point, a: Point, b: Point): SegmentProjection {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + abx * t, y: a.y + aby * t };
  return { t, distance: distance(p, point), point };
}
