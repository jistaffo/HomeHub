import fs from 'node:fs';
import path from 'node:path';

// A tiny JSON-file database. For a group of ~6 people this is plenty, has no
// native dependencies, and the whole thing can be backed up by copying one
// file. Writes are atomic (write temp file, then rename) and debounced.
export class Store {
  constructor(file) {
    this.file = file;
    this.data = { users: [], sessions: [], lists: [], movies: {}, resets: [] };
    if (fs.existsSync(file)) {
      Object.assign(this.data, JSON.parse(fs.readFileSync(file, 'utf8')));
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    this.timer = null;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 50);
  }

  flush() {
    clearTimeout(this.timer);
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  // One snapshot per day in <data dir>/backups, keeping the newest `keep`.
  backup(keep = 14) {
    const dir = path.join(path.dirname(this.file), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    this.flush();
    const day = new Date().toISOString().slice(0, 10);
    const base = path.basename(this.file, '.json');
    fs.copyFileSync(this.file, path.join(dir, `${base}-${day}.json`));
    const old = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${base}-`) && f.endsWith('.json'))
      .sort()
      .slice(0, -keep);
    for (const f of old) fs.unlinkSync(path.join(dir, f));
  }
}
