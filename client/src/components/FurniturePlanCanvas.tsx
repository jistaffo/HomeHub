import { useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { DesignVersion, Room } from "../types";
import { PIXELS_PER_FOOT } from "../config";
import { findFurniture } from "../furnitureCatalog";
import { polygonCentroid } from "../geometry";

interface Props {
  room: Room;
  version: DesignVersion;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export default function FurniturePlanCanvas({ room, version, selectedId, onSelect, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [stagePos, setStagePos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (stagePos !== null) return;
    const center = polygonCentroid(room.points);
    setStagePos({
      x: size.width / 2 - center.x * PIXELS_PER_FOOT,
      y: size.height / 2 - center.y * PIXELS_PER_FOOT,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, room.id]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage || !stagePos) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / scale,
      y: (pointer.y - stagePos.y) / scale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.3, Math.min(4, scale * (direction > 0 ? 1.1 : 1 / 1.1)));
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  const wallPoints = room.points.flatMap((p) => [p.x * PIXELS_PER_FOOT, p.y * PIXELS_PER_FOOT]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-950">
      {stagePos && (
        <Stage
          width={size.width}
          height={size.height}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={scale}
          scaleY={scale}
          draggable
          onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
          onWheel={handleWheel}
          onClick={(e) => {
            if (e.target.getStage() === e.target) onSelect(null);
          }}
        >
          <Layer>
            <Line points={wallPoints} closed stroke="#94a3b8" strokeWidth={3} fill="#1e293b" />

            {version.furniture.map((item) => {
              const catalog = findFurniture(item.catalogId);
              const w = item.width * PIXELS_PER_FOOT;
              const d = item.depth * PIXELS_PER_FOOT;
              const isSelected = item.id === selectedId;
              return (
                <Rect
                  key={item.id}
                  x={item.x * PIXELS_PER_FOOT}
                  y={item.y * PIXELS_PER_FOOT}
                  width={w}
                  height={d}
                  offsetX={w / 2}
                  offsetY={d / 2}
                  rotation={item.rotation}
                  fill={item.color || catalog?.color || "#888"}
                  stroke={isSelected ? "#facc15" : "#0f172a"}
                  strokeWidth={isSelected ? 3 : 1}
                  draggable
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelect(item.id);
                  }}
                  onDragMove={(e) => {
                    onMove(item.id, e.target.x() / PIXELS_PER_FOOT, e.target.y() / PIXELS_PER_FOOT);
                  }}
                />
              );
            })}

            {version.furniture.map((item) => (
              <Text
                key={`${item.id}-label`}
                text={item.label}
                x={item.x * PIXELS_PER_FOOT}
                y={item.y * PIXELS_PER_FOOT}
                offsetX={item.width * PIXELS_PER_FOOT * 0.4}
                fontSize={11}
                fill="#e2e8f0"
                listening={false}
              />
            ))}
          </Layer>
        </Stage>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
        Drag items to place them. Scroll to zoom. Click empty space to deselect.
      </div>
    </div>
  );
}
