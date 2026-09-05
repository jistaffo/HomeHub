import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "..", "client", "dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

function rowToHouse(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: JSON.parse(row.data),
  };
}

app.get("/api/houses", (req, res) => {
  const rows = db
    .prepare("SELECT id, name, created_at, updated_at FROM houses ORDER BY updated_at DESC")
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
});

app.post("/api/houses", (req, res) => {
  const { name, data } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  const id = nanoid();
  const now = new Date().toISOString();
  const initialData = data ?? { floors: [] };
  db.prepare(
    "INSERT INTO houses (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, JSON.stringify(initialData), now, now);
  res.status(201).json({ id, name, createdAt: now, updatedAt: now, data: initialData });
});

app.get("/api/houses/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM houses WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(rowToHouse(row));
});

app.put("/api/houses/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM houses WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  const { name, data } = req.body;
  const now = new Date().toISOString();
  if (name !== undefined) {
    db.prepare("UPDATE houses SET name = ?, data = ?, updated_at = ? WHERE id = ?").run(
      name,
      JSON.stringify(data),
      now,
      req.params.id
    );
  } else {
    db.prepare("UPDATE houses SET data = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify(data),
      now,
      req.params.id
    );
  }
  const row = db.prepare("SELECT * FROM houses WHERE id = ?").get(req.params.id);
  res.json(rowToHouse(row));
});

app.delete("/api/houses/:id", (req, res) => {
  db.prepare("DELETE FROM houses WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DWLLNG server listening on http://localhost:${PORT}`);
});
