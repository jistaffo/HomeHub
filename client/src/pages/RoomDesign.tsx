import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useHouseStore } from "../store";
import { findFurniture } from "../furnitureCatalog";
import { createDesignVersion } from "../factories";
import { makeId } from "../idGen";
import { polygonCentroid } from "../geometry";
import FurnitureCatalogPanel from "../components/FurnitureCatalogPanel";
import FurniturePlanCanvas from "../components/FurniturePlanCanvas";
import Room3DView from "../components/Room3DView";
import RoomDesignPanel from "../components/RoomDesignPanel";
import type { FurniturePlacement, Room } from "../types";

export default function RoomDesign() {
  const { houseId, roomId } = useParams<{ houseId: string; roomId: string }>();
  const { house, loading, loadHouse, mutate, saveState } = useHouseStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (houseId) loadHouse(houseId);
  }, [houseId, loadHouse]);

  if (loading || !house) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }

  let room: Room | null = null;
  for (const f of house.data.floors) {
    const found = f.rooms.find((r) => r.id === roomId);
    if (found) {
      room = found;
      break;
    }
  }

  if (!room) {
    return (
      <div className="p-8 text-slate-400">
        Room not found. <Link to={`/house/${houseId}`} className="text-sky-400">Back to house</Link>
      </div>
    );
  }

  const version =
    room.designVersions.find((v) => v.id === room.activeDesignVersionId) ?? room.designVersions[0];
  const selectedItem = version.furniture.find((f) => f.id === selectedItemId) ?? null;

  function withRoom(fn: (r: any) => void) {
    if (!roomId) return;
    mutate((data) => {
      for (const f of data.floors) {
        const r = f.rooms.find((rm) => rm.id === roomId);
        if (r) {
          fn(r);
          return;
        }
      }
    });
  }

  function withVersion(fn: (v: any) => void) {
    withRoom((r) => {
      const v = r.designVersions.find((dv: any) => dv.id === r.activeDesignVersionId);
      if (v) fn(v);
    });
  }

  function addFurniture(catalogId: string) {
    const item = findFurniture(catalogId);
    if (!item || !room) return;
    const center = polygonCentroid(room.points);
    const placement: FurniturePlacement = {
      id: makeId(),
      catalogId,
      x: center.x,
      y: center.y,
      rotation: 0,
      width: item.width,
      depth: item.depth,
      height: item.height,
      color: item.color,
      label: item.name,
    };
    withVersion((v) => v.furniture.push(placement));
    setSelectedItemId(placement.id);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to={`/house/${houseId}`} className="text-slate-400 hover:text-white">
            ← {house.name}
          </Link>
          <span className="text-lg font-semibold">{room.name}</span>
          <span className="text-xs text-slate-500">designing: {version.name}</span>
        </div>
        <span className="text-xs text-slate-500">
          {saveState === "saving" && "Saving…"}
          {saveState === "pending" && "Unsaved changes…"}
          {saveState === "idle" && "Saved"}
          {saveState === "error" && "Save failed"}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FurnitureCatalogPanel onAdd={addFurniture} />

        <div className="flex flex-1 flex-col">
          <div className="flex-1 border-b border-slate-800">
            <FurniturePlanCanvas
              room={room}
              version={version}
              selectedId={selectedItemId}
              onSelect={setSelectedItemId}
              onMove={(id, x, y) => withVersion((v) => {
                const item = v.furniture.find((f: any) => f.id === id);
                if (item) {
                  item.x = x;
                  item.y = y;
                }
              })}
            />
          </div>
          <div className="flex-1">
            <Room3DView room={room} version={version} />
          </div>
        </div>

        <RoomDesignPanel
          room={room}
          version={version}
          selectedItem={selectedItem}
          onSelectVersion={(id) => withRoom((r) => (r.activeDesignVersionId = id))}
          onAddVersion={() => {
            const v = createDesignVersion(`Version ${room!.designVersions.length + 1}`);
            withRoom((r) => {
              r.designVersions.push(v);
              r.activeDesignVersionId = v.id;
            });
            setSelectedItemId(null);
          }}
          onDuplicateVersion={() => {
            const clone = structuredClone(version);
            clone.id = makeId();
            clone.name = `${version.name} copy`;
            clone.furniture = clone.furniture.map((f: FurniturePlacement) => ({
              ...f,
              id: makeId(),
            }));
            withRoom((r) => {
              r.designVersions.push(clone);
              r.activeDesignVersionId = clone.id;
            });
            setSelectedItemId(null);
          }}
          onDeleteVersion={() => {
            withRoom((r) => {
              if (r.designVersions.length <= 1) return;
              r.designVersions = r.designVersions.filter((v: any) => v.id !== r.activeDesignVersionId);
              r.activeDesignVersionId = r.designVersions[0].id;
            });
            setSelectedItemId(null);
          }}
          onRenameVersion={(name) => withVersion((v) => (v.name = name))}
          onUpdateItem={(id, patch) =>
            withVersion((v) => {
              const item = v.furniture.find((f: any) => f.id === id);
              if (item) Object.assign(item, patch);
            })
          }
          onRemoveItem={(id) => {
            withVersion((v) => {
              v.furniture = v.furniture.filter((f: any) => f.id !== id);
            });
            setSelectedItemId(null);
          }}
          onSetWallColor={(edgeId, color) =>
            withVersion((v) => {
              v.wallColors[edgeId] = color;
            })
          }
          onSetFloorColor={(color) => withVersion((v) => (v.floorColor = color))}
        />
      </div>
    </div>
  );
}
