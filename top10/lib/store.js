import fs from 'node:fs';
import path from 'node:path';

// A tiny JSON-file database. For a group of ~6 people this is plenty, has no
// native dependencies, and the whole thing can be backed up by copying one
// file. Writes are atomic (write temp file, then rename) and debounced.
export class Store {
  constructor(file) {
    this.file = file;
    this.data = { users: [], sessions: [], lists: [], movies: {} };
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
}
