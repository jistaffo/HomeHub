import { useNavigate } from "react-router-dom";
import type { Room } from "../types";
import { distance } from "../geometry";

interface Props {
  houseId: string;
  room: Room;
  onRename: (name: string) => void;
  onSetWallHeight: (v: number) => void;
  onSetWallThickness: (v: number) => void;
  onSetColor: (v: string) => void;
  onSetEdgeLength: (edgeIndex: number, length: number) => void;
  onDeleteOpening: (edgeIndex: number, openingId: string) => void;
  onSetOpeningWidth: (edgeIndex: number, openingId: string, width: number) => void;
  onDeleteRoom: () => void;
}

export default function RoomPropertiesPanel({
  houseId,
  room,
  onRename,
  onSetWallHeight,
  onSetWallThickness,
  onSetColor,
  onSetEdgeLength,
  onDeleteOpening,
  onSetOpeningWidth,
  onDeleteRoom,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Room name</label>
        <input
          className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
          value={room.name}
          onChange={(e) => onRename(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Wall height (ft)
          </label>
          <input
            type="number"
            step={0.1}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
            value={room.wallHeight}
            onChange={(e) => onSetWallHeight(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Wall thickness (ft)
          </label>
          <input
            type="number"
            step={0.05}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
            value={room.wallThickness}
            onChange={(e) => onSetWallThickness(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Highlight color
        </label>
        <input
          type="color"
          className="h-8 w-16 rounded border border-slate-700 bg-slate-950"
          value={room.color}
          onChange={(e) => onSetColor(e.target.value)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Walls</h3>
        <div className="space-y-2">
          {room.edges.map((edge, i) => {
            const a = room.points[i];
            const b = room.points[(i + 1) % room.points.length];
            const length = distance(a, b);
            return (
              <div key={edge.id} className="rounded border border-slate-800 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-400">Wall {i + 1}</span>
                  <input
                    type="number"
                    step={0.1}
                    className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-right text-white"
                    value={Math.round(length * 100) / 100}
                    onChange={(e) => onSetEdgeLength(i, parseFloat(e.target.value) || 0.1)}
                  />
                  <span className="text-xs text-slate-500">ft</span>
                </div>
                {edge.openings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {edge.openings.map((op) => (
                      <div key={op.id} className="flex items-center justify-between text-xs">
                        <span className={op.type === "door" ? "text-amber-400" : "text-sky-400"}>
                          {op.type}
                        </span>
                        <input
                          type="number"
                          step={0.1}
                          className="w-14 rounded border border-slate-700 bg-slate-950 px-1 text-right text-white"
                          value={op.width}
                          onChange={(e) =>
                            onSetOpeningWidth(i, op.id, parseFloat(e.target.value) || 0.1)
                          }
                        />
                        <button
                          className="text-red-400 hover:text-red-300"
                          onClick={() => onDeleteOpening(i, op.id)}
                        >
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => navigate(`/house/${houseId}/room/${room.id}`)}
        className="mt-2 rounded bg-sky-600 px-3 py-2 font-medium text-white hover:bg-sky-500"
      >
        Design this room →
      </button>

      <button onClick={onDeleteRoom} className="text-sm text-red-400 hover:text-red-300">
        Delete room
      </button>
    </div>
  );
}
