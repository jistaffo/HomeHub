import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { HouseSummary } from "../types";

export default function Dashboard() {
  const [houses, setHouses] = useState<HouseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function refresh() {
    setLoading(true);
    const list = await api.listHouses();
    setHouses(list);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const house = await api.createHouse(newName.trim(), { floors: [] });
    setCreating(false);
    setNewName("");
    navigate(`/house/${house.id}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this house? This cannot be undone.")) return;
    await api.deleteHouse(id);
    refresh();
  }

  return (
    <div className="min-h-screen mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white">DWLLNG</h1>
        <p className="mt-2 text-slate-400">
          Build an accurate virtual recreation of your house, then redesign any room while
          keeping the real architecture in place.
        </p>
      </header>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          placeholder="e.g. 123 Maple Street"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-md bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          {creating ? "Creating…" : "New House"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : houses.length === 0 ? (
        <p className="text-slate-500">No houses yet. Create one above to get started.</p>
      ) : (
        <ul className="space-y-2">
          {houses.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-4 py-3 hover:border-slate-700"
            >
              <button
                className="flex-1 text-left text-lg text-white"
                onClick={() => navigate(`/house/${h.id}`)}
              >
                {h.name}
                <span className="ml-3 text-xs text-slate-500">
                  updated {new Date(h.updatedAt).toLocaleString()}
                </span>
              </button>
              <button
                onClick={() => handleDelete(h.id)}
                className="ml-4 text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
