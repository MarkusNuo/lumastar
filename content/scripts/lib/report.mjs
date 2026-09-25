/** Collects errors and warnings per content file and prints a per-file report with optional summaries. */
export class Report {
  #files = new Map();
  #fileSummaries = new Map();
  #totals = [];

  /** Registers a checked file so it shows up as OK even without findings. */
  addFile(file) {
    if (!this.#files.has(file)) this.#files.set(file, []);
  }

  error(file, location, message) {
    this.#add(file, 'error', location, message);
  }

  warn(file, location, message) {
    this.#add(file, 'warning', location, message);
  }

  /** Adds an informational line to a file's status line (not a finding). */
  summarize(file, text) {
    this.addFile(file);
    this.#fileSummaries.set(file, [...(this.#fileSummaries.get(file) ?? []), text]);
  }

  /** Adds an informational line printed below the error and warning totals. */
  summarizeTotal(text) {
    this.#totals.push(text);
  }

  get errorCount() {
    return this.#count('error');
  }

  get warningCount() {
    return this.#count('warning');
  }

  print(write = console.log) {
    const nameWidth = Math.max(0, ...[...this.#files.keys()].map((file) => file.length));
    for (const [file, findings] of [...this.#files].sort(([a], [b]) => a.localeCompare(b))) {
      const summaries = this.#fileSummaries.get(file) ?? [];
      const name = summaries.length > 0 ? file.padEnd(nameWidth) : file;
      write([`${statusOf(findings).padEnd(6)} ${name}`, ...summaries].join('  '));
      for (const { severity, location, message } of findings) {
        write(`         ${severity.padEnd(7)} ${location ? `${location}  ` : ''}${message}`);
      }
    }
    write('');
    write(`${this.#files.size} files checked: ${plural(this.errorCount, 'error')}, ${plural(this.warningCount, 'warning')}.`);
    for (const text of this.#totals) write(text);
  }

  #add(file, severity, location, message) {
    this.addFile(file);
    this.#files.get(file).push({ severity, location, message });
  }

  #count(severity) {
    return [...this.#files.values()].flat().filter((finding) => finding.severity === severity).length;
  }
}

/** Formats a finding location as "<id> <json pointer>". */
export function at(pointer, id) {
  return [id, pointer].filter(Boolean).join(' ');
}

function statusOf(findings) {
  if (findings.some((finding) => finding.severity === 'error')) return 'FAIL';
  return findings.length > 0 ? 'WARN' : 'OK';
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
