import { FURNITURE_CATALOG } from "../furnitureCatalog";

interface Props {
  onAdd: (catalogId: string) => void;
}

export default function FurnitureCatalogPanel({ onAdd }: Props) {
  const categories = Array.from(new Set(FURNITURE_CATALOG.map((f) => f.category)));

  return (
    <div className="flex h-full w-64 flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-slate-900 p-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-500">Furniture catalog</h3>
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="mb-1 text-sm font-medium text-slate-300">{cat}</h4>
          <div className="space-y-1">
            {FURNITURE_CATALOG.filter((f) => f.category === cat).map((item) => (
              <button
                key={item.id}
                onClick={() => onAdd(item.id)}
                className="flex w-full items-center justify-between rounded border border-slate-800 px-2 py-1 text-left text-sm hover:border-sky-600 hover:bg-slate-800"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <span className="text-xs text-slate-500">
                  {item.width}×{item.depth}ft
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
