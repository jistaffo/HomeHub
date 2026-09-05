import type { DesignVersion, FurniturePlacement, Room } from "../types";
import { findFurniture } from "../furnitureCatalog";

interface Props {
  room: Room;
  version: DesignVersion;
  selectedItem: FurniturePlacement | null;
  onSelectVersion: (id: string) => void;
  onAddVersion: () => void;
  onDuplicateVersion: () => void;
  onDeleteVersion: () => void;
  onRenameVersion: (name: string) => void;
  onUpdateItem: (id: string, patch: Partial<FurniturePlacement>) => void;
  onRemoveItem: (id: string) => void;
  onSetWallColor: (edgeId: string, color: string) => void;
  onSetFloorColor: (color: string) => void;
}

export default function RoomDesignPanel({
  room,
  version,
  selectedItem,
  onSelectVersion,
  onAddVersion,
  onDuplicateVersion,
  onDeleteVersion,
  onRenameVersion,
  onUpdateItem,
  onRemoveItem,
  onSetWallColor,
  onSetFloorColor,
}: Props) {
  const catalog = selectedItem ? findFurniture(selectedItem.catalogId) : null;

  return (
    <div className="flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4">
      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Design versions</h3>
        <div className="flex flex-wrap gap-1">
          {room.designVersions.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelectVersion(v.id)}
              className={`rounded px-2 py-1 text-xs ${
                v.id === version.id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 text-xs">
          <button onClick={onAddVersion} className="text-sky-400 hover:text-sky-300">
            + Blank
          </button>
          <button onClick={onDuplicateVersion} className="text-sky-400 hover:text-sky-300">
            Duplicate current
          </button>
          {room.designVersions.length > 1 && (
            <button onClick={onDeleteVersion} className="text-red-400 hover:text-red-300">
              Delete current
            </button>
          )}
        </div>
        <input
          className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
          value={version.name}
          onChange={(e) => onRenameVersion(e.target.value)}
        />
      </div>

      {selectedItem ? (
        <div className="rounded border border-slate-800 p-3">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            {catalog?.name ?? "Item"}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="col-span-2">
              Rotation ({Math.round(selectedItem.rotation)}°)
              <input
                type="range"
                min={0}
                max={359}
                value={selectedItem.rotation}
                onChange={(e) => onUpdateItem(selectedItem.id, { rotation: parseFloat(e.target.value) })}
                className="w-full"
              />
            </label>
            <label>
              Width (ft)
              <input
                type="number"
                step={0.1}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                value={selectedItem.width}
                onChange={(e) => onUpdateItem(selectedItem.id, { width: parseFloat(e.target.value) || 0.1 })}
              />
            </label>
            <label>
              Depth (ft)
              <input
                type="number"
                step={0.1}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                value={selectedItem.depth}
                onChange={(e) => onUpdateItem(selectedItem.id, { depth: parseFloat(e.target.value) || 0.1 })}
              />
            </label>
            <label>
              Height (ft)
              <input
                type="number"
                step={0.1}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                value={selectedItem.height}
                onChange={(e) => onUpdateItem(selectedItem.id, { height: parseFloat(e.target.value) || 0.1 })}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                className="block h-8 w-full rounded border border-slate-700 bg-slate-950"
                value={selectedItem.color}
                onChange={(e) => onUpdateItem(selectedItem.id, { color: e.target.value })}
              />
            </label>
          </div>
          <button
            onClick={() => onRemoveItem(selectedItem.id)}
            className="mt-3 text-sm text-red-400 hover:text-red-300"
          >
            Remove item
          </button>
        </div>
      ) : (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">Materials</h3>
          <div className="mb-3">
            <label className="mb-1 block text-sm text-slate-300">Floor color</label>
            <input
              type="color"
              className="h-8 w-16 rounded border border-slate-700 bg-slate-950"
              value={version.floorColor}
              onChange={(e) => onSetFloorColor(e.target.value)}
            />
          </div>
          <label className="mb-1 block text-sm text-slate-300">Wall colors</label>
          <div className="space-y-1">
            {room.edges.map((edge, i) => (
              <div key={edge.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Wall {i + 1}</span>
                <input
                  type="color"
                  className="h-7 w-12 rounded border border-slate-700 bg-slate-950"
                  value={version.wallColors[edge.id] || "#e5e1d8"}
                  onChange={(e) => onSetWallColor(edge.id, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Select a furniture item in the 2D view to edit its size, rotation, or color.
          </p>
        </div>
      )}
    </div>
  );
}
