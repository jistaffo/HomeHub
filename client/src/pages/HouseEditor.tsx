import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useHouseStore } from "../store";
import { createFloor, createRoom } from "../factories";
import { makeId } from "../idGen";
import { setEdgeLength } from "../geometry";
import FloorPlanCanvas, { type EdgeSelection, type Tool } from "../components/FloorPlanCanvas";
import RoomPropertiesPanel from "../components/RoomPropertiesPanel";
import BlueprintControls from "../components/BlueprintControls";
import House3DView from "../components/House3DView";
import type { Point } from "../types";

export default function HouseEditor() {
  const { houseId } = useParams<{ houseId: string }>();
  const { house, loading, loadHouse, mutate, selectedFloorId, selectFloor, saveState } =
    useHouseStore();

  const [tool, setTool] = useState<Tool>("select");
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeSelection | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  useEffect(() => {
    if (houseId) loadHouse(houseId);
  }, [houseId, loadHouse]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDraftPoints([]);
        setCalibrationPoints([]);
        setTool("select");
      }
      if (e.key === "Enter" && tool === "draw" && draftPoints.length >= 3) {
        finishDraft();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draftPoints]);

  if (loading || !house) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }

  const floor = house.data.floors.find((f) => f.id === selectedFloorId) ?? house.data.floors[0];
  const room = floor?.rooms.find((r) => r.id === selectedRoomId) ?? null;

  function finishDraft() {
    if (!floor || draftPoints.length < 3) return;
    mutate((data) => {
      const f = data.floors.find((fl) => fl.id === floor.id);
      if (!f) return;
      const newRoom = createRoom(`Room ${f.rooms.length + 1}`);
      newRoom.points = draftPoints;
      newRoom.edges = draftPoints.map(() => ({ id: makeId(), openings: [] }));
      f.rooms.push(newRoom);
    });
    setDraftPoints([]);
    setTool("select");
  }

  function addFloor() {
    mutate((data) => {
      const newFloor = createFloor(`Floor ${data.floors.length + 1}`, data.floors.length * 10);
      data.floors.push(newFloor);
    });
  }

  function withFloorRoom(fn: (floorRef: any, roomRef: any) => void) {
    if (!floor || !room) return;
    mutate((data) => {
      const f = data.floors.find((fl) => fl.id === floor.id);
      const r = f?.rooms.find((rm) => rm.id === room.id);
      if (!f || !r) return;
      fn(f, r);
    });
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-white">
            ← DWLLNG
          </Link>
          <span className="text-lg font-semibold">{house.name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-xs text-slate-500">
            {saveState === "saving" && "Saving…"}
            {saveState === "pending" && "Unsaved changes…"}
            {saveState === "idle" && "Saved"}
            {saveState === "error" && "Save failed"}
          </span>
          <div className="flex overflow-hidden rounded border border-slate-700">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 ${viewMode === "2d" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300"}`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 ${viewMode === "3d" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300"}`}
            >
              3D
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2">
        {house.data.floors.map((f) => (
          <button
            key={f.id}
            onClick={() => selectFloor(f.id)}
            className={`rounded px-3 py-1 text-sm ${
              f.id === floor?.id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {f.name}
          </button>
        ))}
        <button onClick={addFloor} className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700">
          + Add floor
        </button>
      </div>

      {viewMode === "2d" && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm">
          <button
            onClick={() => {
              setTool("select");
              setDraftPoints([]);
            }}
            className={`rounded px-3 py-1 ${tool === "select" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Select
          </button>
          <button
            onClick={() => {
              setTool("draw");
              setSelectedRoomId(null);
              setSelectedEdge(null);
            }}
            className={`rounded px-3 py-1 ${tool === "draw" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Draw room
          </button>
          <button
            onClick={() => setTool("door")}
            className={`rounded px-3 py-1 ${tool === "door" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Add door
          </button>
          <button
            onClick={() => setTool("window")}
            className={`rounded px-3 py-1 ${tool === "window" ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            Add window
          </button>
          {tool === "draw" && draftPoints.length >= 3 && (
            <button onClick={finishDraft} className="rounded bg-emerald-600 px-3 py-1 text-white">
              Finish room ({draftPoints.length} pts)
            </button>
          )}
          {(draftPoints.length > 0 || tool !== "select") && (
            <button
              onClick={() => {
                setDraftPoints([]);
                setTool("select");
              }}
              className="rounded bg-slate-800 px-3 py-1 text-slate-300"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {viewMode === "2d" && floor && (
        <BlueprintControls
          floor={floor}
          calibrating={tool === "blueprint-calibrate"}
          moving={tool === "blueprint-move"}
          onStartCalibrate={() => {
            setCalibrationPoints([]);
            setTool("blueprint-calibrate");
          }}
          onStartMove={() => setTool(tool === "blueprint-move" ? "select" : "blueprint-move")}
          onUpload={(dataUrl) =>
            mutate((data) => {
              const f = data.floors.find((fl) => fl.id === floor.id);
              if (!f) return;
              f.blueprint = { dataUrl, scale: 0.05, offsetX: 0, offsetY: 0, opacity: 0.6 };
            })
          }
          onSetOpacity={(v) =>
            mutate((data) => {
              const f = data.floors.find((fl) => fl.id === floor.id);
              if (f?.blueprint) f.blueprint.opacity = v;
            })
          }
          onClear={() =>
            mutate((data) => {
              const f = data.floors.find((fl) => fl.id === floor.id);
              if (f) f.blueprint = undefined;
            })
          }
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          {!floor ? (
            <div className="p-8 text-slate-500">Add a floor to get started.</div>
          ) : viewMode === "3d" ? (
            <House3DView floor={floor} />
          ) : (
            <FloorPlanCanvas
              floor={floor}
              tool={tool}
              draftPoints={draftPoints}
              selectedRoomId={selectedRoomId}
              selectedEdge={selectedEdge}
              onSelectRoom={setSelectedRoomId}
              onSelectEdge={setSelectedEdge}
              onAddDraftPoint={(p) => setDraftPoints((pts) => [...pts, p])}
              onFinishDraft={finishDraft}
              onMoveVertex={(roomId, vertexIndex, p) =>
                mutate((data) => {
                  const f = data.floors.find((fl) => fl.id === floor.id);
                  const r = f?.rooms.find((rm) => rm.id === roomId);
                  if (r) r.points[vertexIndex] = p;
                })
              }
              onAddOpening={(roomId, edgeIndex, t, type) =>
                mutate((data) => {
                  const f = data.floors.find((fl) => fl.id === floor.id);
                  const r = f?.rooms.find((rm) => rm.id === roomId);
                  if (!r) return;
                  r.edges[edgeIndex].openings.push({
                    id: makeId(),
                    type,
                    t,
                    width: type === "door" ? 3 : 3,
                    height: type === "door" ? 6.8 : 3,
                    sillHeight: type === "door" ? 0 : 3,
                  });
                })
              }
              calibrationPoints={calibrationPoints}
              onCalibrationClick={(p) => {
                const next = [...calibrationPoints, p];
                if (next.length < 2) {
                  setCalibrationPoints(next);
                  return;
                }
                const [p1, p2] = next;
                const worldDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const realFeetStr = window.prompt(
                  "What is the real-world distance between those two points, in feet?"
                );
                setCalibrationPoints([]);
                setTool("select");
                const realFeet = parseFloat(realFeetStr || "");
                if (!realFeet || !floor.blueprint) return;
                const oldScale = floor.blueprint.scale;
                const imagePixelDist = worldDist / oldScale;
                const newScale = realFeet / imagePixelDist;
                mutate((data) => {
                  const f = data.floors.find((fl) => fl.id === floor.id);
                  if (f?.blueprint) f.blueprint.scale = newScale;
                });
              }}
              onMoveBlueprint={(offset) =>
                mutate((data) => {
                  const f = data.floors.find((fl) => fl.id === floor.id);
                  if (f?.blueprint) {
                    f.blueprint.offsetX = offset.x;
                    f.blueprint.offsetY = offset.y;
                  }
                })
              }
            />
          )}
        </div>

        {room && viewMode === "2d" && (
          <RoomPropertiesPanel
            houseId={house.id}
            room={room}
            onRename={(name) => withFloorRoom((_f, r) => (r.name = name))}
            onSetWallHeight={(v) => withFloorRoom((_f, r) => (r.wallHeight = v))}
            onSetWallThickness={(v) => withFloorRoom((_f, r) => (r.wallThickness = v))}
            onSetColor={(v) => withFloorRoom((_f, r) => (r.color = v))}
            onSetEdgeLength={(edgeIndex, length) =>
              withFloorRoom((_f, r) => {
                const a = r.points[edgeIndex];
                const bIndex = (edgeIndex + 1) % r.points.length;
                r.points[bIndex] = setEdgeLength(a, r.points[bIndex], length);
              })
            }
            onDeleteOpening={(edgeIndex, openingId) =>
              withFloorRoom((_f, r) => {
                r.edges[edgeIndex].openings = r.edges[edgeIndex].openings.filter(
                  (o: any) => o.id !== openingId
                );
              })
            }
            onSetOpeningWidth={(edgeIndex, openingId, width) =>
              withFloorRoom((_f, r) => {
                const op = r.edges[edgeIndex].openings.find((o: any) => o.id === openingId);
                if (op) op.width = width;
              })
            }
            onDeleteRoom={() => {
              withFloorRoom((f) => {
                f.rooms = f.rooms.filter((rm: any) => rm.id !== room.id);
              });
              setSelectedRoomId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
