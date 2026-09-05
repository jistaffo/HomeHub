import { useMemo } from "react";
import * as THREE from "three";
import type { DesignVersion, FurniturePlacement, Room } from "../../types";
import { findFurniture } from "../../furnitureCatalog";

interface Props {
  room: Room;
  version: DesignVersion;
  elevation: number;
  showFurniture?: boolean;
}

/** Converts a plan-space (x, y in feet) point to 3D world (x, y=elevation, z). */
function toWorld(x: number, y: number, elevation: number): [number, number, number] {
  return [x, elevation, y];
}

function WallSegment({
  a,
  b,
  height,
  thickness,
  elevation,
  color,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
  height: number;
  thickness: number;
  elevation: number;
  color: string;
}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  return (
    <mesh
      position={toWorld(midX, midY, elevation + height / 2)}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function OpeningMarkers({
  room,
  elevation,
}: {
  room: Room;
  elevation: number;
}) {
  const markers = useMemo(() => {
    const out: JSX.Element[] = [];
    room.edges.forEach((edge, edgeIndex) => {
      const a = room.points[edgeIndex];
      const b = room.points[(edgeIndex + 1) % room.points.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx);
      edge.openings.forEach((op) => {
        const cx = a.x + dx * op.t;
        const cy = a.y + dy * op.t;
        const isDoor = op.type === "door";
        out.push(
          <mesh
            key={op.id}
            position={toWorld(cx, cy, elevation + op.sillHeight + op.height / 2)}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[op.width, op.height, room.wallThickness + 0.05]} />
            <meshStandardMaterial
              color={isDoor ? "#7c4a1e" : "#bfe3f0"}
              transparent={!isDoor}
              opacity={isDoor ? 1 : 0.55}
            />
          </mesh>
        );
      });
    });
    return out;
  }, [room, elevation]);

  return <>{markers}</>;
}

function FurnitureItem({ item, elevation }: { item: FurniturePlacement; elevation: number }) {
  const catalog = findFurniture(item.catalogId);
  const color = item.color || catalog?.color || "#888888";
  return (
    <mesh
      position={toWorld(item.x, item.y, elevation + item.height / 2)}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[item.width, item.height, item.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default function SceneRoom({ room, version, elevation, showFurniture = true }: Props) {
  const floorShape = useMemo(() => {
    const shape = new THREE.Shape();
    room.points.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });
    shape.closePath();
    return shape;
  }, [room.points]);

  return (
    <group>
      <mesh
        position={[0, elevation, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial color={version.floorColor} side={THREE.DoubleSide} />
      </mesh>

      {room.points.map((a, i) => {
        const b = room.points[(i + 1) % room.points.length];
        const edge = room.edges[i];
        const color = version.wallColors[edge.id] || "#e5e1d8";
        return (
          <WallSegment
            key={edge.id}
            a={a}
            b={b}
            height={room.wallHeight}
            thickness={room.wallThickness}
            elevation={elevation}
            color={color}
          />
        );
      })}

      <OpeningMarkers room={room} elevation={elevation} />

      {showFurniture &&
        version.furniture.map((item) => (
          <FurnitureItem key={item.id} item={item} elevation={elevation} />
        ))}
    </group>
  );
}
