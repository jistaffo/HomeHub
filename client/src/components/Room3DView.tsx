import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { DesignVersion, Room } from "../types";
import SceneRoom from "./three/SceneRoom";

interface Props {
  room: Room;
  version: DesignVersion;
}

export default function Room3DView({ room, version }: Props) {
  const { center, cameraPos } = useMemo(() => {
    const xs = room.points.map((p) => p.x);
    const ys = room.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const c = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const radius = Math.max(6, Math.hypot(maxX - minX, maxY - minY) / 2);
    // Steep, dollhouse-style angle so short walls don't hide furniture on the floor.
    const horizontal = radius * 1.3;
    const height = radius * 2.5 + room.wallHeight * 0.3;
    return {
      center: c,
      cameraPos: [
        c.x + horizontal,
        height,
        c.y + horizontal,
      ] as [number, number, number],
    };
  }, [room.points, room.wallHeight]);

  return (
    <div className="h-full w-full bg-slate-950">
      <Canvas shadows camera={{ position: cameraPos, fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[15, 20, 10]} intensity={1} castShadow />
          <SceneRoom room={room} version={version} elevation={0} />
          <OrbitControls target={[center.x, room.wallHeight / 3, center.y]} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  );
}
