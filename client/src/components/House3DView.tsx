import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import type { Floor } from "../types";
import SceneRoom from "./three/SceneRoom";

interface Props {
  floor: Floor;
}

export default function House3DView({ floor }: Props) {
  const { center, cameraPos } = useMemo(() => {
    const allPoints = floor.rooms.flatMap((r) => r.points);
    const maxWallHeight = Math.max(9, ...floor.rooms.map((r) => r.wallHeight));
    if (allPoints.length === 0) {
      return { center: { x: 0, y: 0 }, cameraPos: [25, 22, 25] as [number, number, number] };
    }
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const c = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const radius = Math.max(8, Math.hypot(maxX - minX, maxY - minY) / 2);
    // Steep, dollhouse-style angle so exterior walls don't hide the interior.
    const horizontal = radius * 1.3;
    const height = radius * 2.2 + maxWallHeight * 0.3;
    return {
      center: c,
      cameraPos: [c.x + horizontal, height, c.y + horizontal] as [number, number, number],
    };
  }, [floor.rooms]);

  return (
    <div className="h-full w-full bg-slate-950">
      <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[30, 40, 20]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <Grid args={[200, 200]} position={[0, floor.elevation - 0.01, 0]} cellColor="#334155" sectionColor="#475569" />
          {floor.rooms.map((room) => {
            const version =
              room.designVersions.find((v) => v.id === room.activeDesignVersionId) ??
              room.designVersions[0];
            if (!version) return null;
            return (
              <SceneRoom
                key={room.id}
                room={room}
                version={version}
                elevation={floor.elevation}
              />
            );
          })}
          <OrbitControls target={[center.x, floor.elevation + 3, center.y]} makeDefault />
        </Suspense>
      </Canvas>
    </div>
  );
}
