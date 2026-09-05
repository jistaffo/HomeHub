import { useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import type Konva from "konva";
import type { Floor, OpeningType, Point } from "../types";
import { PIXELS_PER_FOOT } from "../config";
import { projectPointOnSegment } from "../geometry";

export type Tool = "select" | "draw" | "door" | "window" | "blueprint-calibrate" | "blueprint-move";

export interface EdgeSelection {
  roomId: string;
  edgeIndex: number;
}

interface Props {
  floor: Floor;
  tool: Tool;
  draftPoints: Point[];
  selectedRoomId: string | null;
  selectedEdge: EdgeSelection | null;
  onSelectRoom: (roomId: string | null) => void;
  onSelectEdge: (sel: EdgeSelection | null) => void;
  onAddDraftPoint: (p: Point) => void;
  onFinishDraft: () => void;
  onMoveVertex: (roomId: string, vertexIndex: number, p: Point) => void;
  onAddOpening: (roomId: string, edgeIndex: number, t: number, type: OpeningType) => void;
  onCalibrationClick: (p: Point) => void;
  calibrationPoints: Point[];
  onMoveBlueprint: (offset: Point) => void;
}

function feetToPx(p: Point) {
  return { x: p.x * PIXELS_PER_FOOT, y: p.y * PIXELS_PER_FOOT };
}

function GridLines() {
  const range = 80;
  const lines = [];
  for (let i = -range; i <= range; i++) {
    const isMajor = i % 5 === 0;
    const pos = i * PIXELS_PER_FOOT;
    lines.push(
      <Line
        key={`v${i}`}
        points={[pos, -range * PIXELS_PER_FOOT, pos, range * PIXELS_PER_FOOT]}
        stroke={isMajor ? "#334155" : "#1e293b"}
        strokeWidth={isMajor ? 1 : 0.5}
        listening={false}
      />
    );
    lines.push(
      <Line
        key={`h${i}`}
        points={[-range * PIXELS_PER_FOOT, pos, range * PIXELS_PER_FOOT, pos]}
        stroke={isMajor ? "#334155" : "#1e293b"}
        strokeWidth={isMajor ? 1 : 0.5}
        listening={false}
      />
    );
  }
  return <>{lines}</>;
}

export default function FloorPlanCanvas({
  floor,
  tool,
  draftPoints,
  selectedRoomId,
  selectedEdge,
  onSelectRoom,
  onSelectEdge,
  onAddDraftPoint,
  onFinishDraft,
  onMoveVertex,
  onAddOpening,
  onCalibrationClick,
  calibrationPoints,
  onMoveBlueprint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 400, y: 300 });
  const [scale, setScale] = useState(1);
  const [blueprintImg, setBlueprintImg] = useState<HTMLImageElement | null>(null);

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
    if (!floor.blueprint) {
      setBlueprintImg(null);
      return;
    }
    const img = new window.Image();
    img.src = floor.blueprint.dataUrl;
    img.onload = () => setBlueprintImg(img);
  }, [floor.blueprint?.dataUrl]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.2, Math.min(4, oldScale * (direction > 0 ? 1.1 : 1 / 1.1)));
    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  function relativePoint(stage: Konva.Stage): Point | null {
    const pos = stage.getRelativePointerPosition();
    if (!pos) return null;
    return { x: pos.x / PIXELS_PER_FOOT, y: pos.y / PIXELS_PER_FOOT };
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    const clickedOnEmpty = e.target === stage;

    if (tool === "blueprint-calibrate") {
      const p = relativePoint(stage);
      if (p) onCalibrationClick(p);
      return;
    }

    if (tool === "draw") {
      const p = relativePoint(stage);
      if (p) onAddDraftPoint(p);
      return;
    }

    if (clickedOnEmpty && tool === "select") {
      onSelectRoom(null);
      onSelectEdge(null);
    }
  }

  function handleStageDblClick() {
    if (tool === "draw" && draftPoints.length >= 3) {
      onFinishDraft();
    }
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-950">
      <Stage
        width={size.width}
        height={size.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={tool === "select"}
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
      >
        <Layer>
          <GridLines />
          <Circle x={0} y={0} radius={4} fill="#f43f5e" listening={false} />

          {blueprintImg && floor.blueprint && (
            <KonvaImage
              image={blueprintImg}
              x={floor.blueprint.offsetX * PIXELS_PER_FOOT}
              y={floor.blueprint.offsetY * PIXELS_PER_FOOT}
              scaleX={floor.blueprint.scale * PIXELS_PER_FOOT}
              scaleY={floor.blueprint.scale * PIXELS_PER_FOOT}
              opacity={floor.blueprint.opacity}
              listening={tool === "blueprint-move"}
              draggable={tool === "blueprint-move"}
              onDragEnd={(e) =>
                onMoveBlueprint({
                  x: e.target.x() / PIXELS_PER_FOOT,
                  y: e.target.y() / PIXELS_PER_FOOT,
                })
              }
            />
          )}

          {floor.rooms.map((room) => {
            const px = room.points.map(feetToPx);
            const flat = px.flatMap((p) => [p.x, p.y]);
            const isSelected = room.id === selectedRoomId;
            return (
              <Line
                key={room.id}
                points={flat}
                closed
                fill={room.color}
                opacity={0.35}
                stroke={isSelected ? "#38bdf8" : "#94a3b8"}
                strokeWidth={isSelected ? 3 : 1.5}
                onClick={(e) => {
                  if (tool !== "select") return;
                  e.cancelBubble = true;
                  onSelectRoom(room.id);
                  onSelectEdge(null);
                }}
              />
            );
          })}

          {floor.rooms.map((room) =>
            room.points.map((a, i) => {
              const b = room.points[(i + 1) % room.points.length];
              const pa = feetToPx(a);
              const pb = feetToPx(b);
              const isSelectedEdge =
                selectedEdge?.roomId === room.id && selectedEdge.edgeIndex === i;
              return (
                <Line
                  key={`${room.id}-edge-${i}`}
                  points={[pa.x, pa.y, pb.x, pb.y]}
                  stroke={isSelectedEdge ? "#facc15" : "transparent"}
                  strokeWidth={isSelectedEdge ? 4 : 10}
                  hitStrokeWidth={14}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    if (!stage) return;
                    if (tool === "select") {
                      onSelectRoom(room.id);
                      onSelectEdge({ roomId: room.id, edgeIndex: i });
                    } else if (tool === "door" || tool === "window") {
                      const p = relativePoint(stage);
                      if (!p) return;
                      const proj = projectPointOnSegment(p, a, b);
                      onAddOpening(room.id, i, proj.t, tool === "door" ? "door" : "window");
                    }
                  }}
                />
              );
            })
          )}

          {floor.rooms.map((room) =>
            room.edges.flatMap((edge, edgeIndex) => {
              const a = room.points[edgeIndex];
              const b = room.points[(edgeIndex + 1) % room.points.length];
              return edge.openings.map((op) => {
                const center = {
                  x: a.x + (b.x - a.x) * op.t,
                  y: a.y + (b.y - a.y) * op.t,
                };
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const half = op.width / 2;
                const p1 = feetToPx({ x: center.x - ux * half, y: center.y - uy * half });
                const p2 = feetToPx({ x: center.x + ux * half, y: center.y + uy * half });
                return (
                  <Line
                    key={op.id}
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke={op.type === "door" ? "#d97706" : "#38bdf8"}
                    strokeWidth={6}
                    listening={false}
                  />
                );
              });
            })
          )}

          {selectedRoomId &&
            tool === "select" &&
            floor.rooms
              .find((r) => r.id === selectedRoomId)
              ?.points.map((pt, i) => {
                const p = feetToPx(pt);
                return (
                  <Circle
                    key={i}
                    x={p.x}
                    y={p.y}
                    radius={6}
                    fill="#38bdf8"
                    draggable
                    onDragMove={(e) => {
                      onMoveVertex(selectedRoomId, i, {
                        x: e.target.x() / PIXELS_PER_FOOT,
                        y: e.target.y() / PIXELS_PER_FOOT,
                      });
                    }}
                  />
                );
              })}

          {draftPoints.length > 0 && (
            <>
              <Line
                points={draftPoints.flatMap((p) => [p.x * PIXELS_PER_FOOT, p.y * PIXELS_PER_FOOT])}
                stroke="#22c55e"
                strokeWidth={2}
                dash={[6, 4]}
                listening={false}
              />
              {draftPoints.map((p, i) => (
                <Circle
                  key={i}
                  x={p.x * PIXELS_PER_FOOT}
                  y={p.y * PIXELS_PER_FOOT}
                  radius={5}
                  fill="#22c55e"
                  listening={false}
                />
              ))}
            </>
          )}

          {calibrationPoints.map((p, i) => (
            <Circle
              key={i}
              x={p.x * PIXELS_PER_FOOT}
              y={p.y * PIXELS_PER_FOOT}
              radius={6}
              fill="#f43f5e"
              listening={false}
            />
          ))}
        </Layer>
      </Stage>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
        {tool === "draw" && "Click to add corners, double-click (or Finish button) to close the room."}
        {tool === "door" && "Click a wall to place a door."}
        {tool === "window" && "Click a wall to place a window."}
        {tool === "blueprint-calibrate" && "Click two points on the image, then enter the real distance."}
        {tool === "blueprint-move" && "Drag the blueprint image into position."}
        {tool === "select" && "Click a room to select it. Drag corners to reshape. Scroll to zoom."}
      </div>
    </div>
  );
}
