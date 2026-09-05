import type { ChangeEvent } from "react";
import type { Floor } from "../types";

interface Props {
  floor: Floor;
  calibrating: boolean;
  moving: boolean;
  onUpload: (dataUrl: string) => void;
  onSetOpacity: (v: number) => void;
  onStartCalibrate: () => void;
  onStartMove: () => void;
  onClear: () => void;
}

function resizeImageFile(file: File, maxDim = 1800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas context"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function BlueprintControls({
  floor,
  calibrating,
  moving,
  onUpload,
  onSetOpacity,
  onStartCalibrate,
  onStartMove,
  onClear,
}: Props) {
  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageFile(file);
    onUpload(dataUrl);
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">Blueprint</span>
      <label className="cursor-pointer rounded bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700">
        {floor.blueprint ? "Replace image" : "Upload image"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {floor.blueprint && (
        <>
          <button
            onClick={onStartMove}
            className={`rounded px-3 py-1 ${
              moving ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {moving ? "Drag image…" : "Move image"}
          </button>
          <button
            onClick={onStartCalibrate}
            className={`rounded px-3 py-1 ${
              calibrating ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {calibrating ? "Click 2 points…" : "Calibrate scale"}
          </button>
          <label className="flex items-center gap-2 text-slate-400">
            Opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={floor.blueprint.opacity}
              onChange={(e) => onSetOpacity(parseFloat(e.target.value))}
            />
          </label>
          <button onClick={onClear} className="text-red-400 hover:text-red-300">
            Remove
          </button>
        </>
      )}
    </div>
  );
}
