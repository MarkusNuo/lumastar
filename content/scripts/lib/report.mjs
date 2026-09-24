/** Collects errors and warnings per content file and prints a per-file report. */
export class Report {
  #files = new Map();

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

  get errorCount() {
    return this.#count('error');
  }

  get warningCount() {
    return this.#count('warning');
  }

  print(write = console.log) {
    for (const [file, findings] of [...this.#files].sort(([a], [b]) => a.localeCompare(b))) {
      write(`${statusOf(findings).padEnd(6)} ${file}`);
      for (const { severity, location, message } of findings) {
        write(`         ${severity.padEnd(7)} ${location ? `${location}  ` : ''}${message}`);
      }
    }
    write('');
    write(`${this.#files.size} files checked: ${plural(this.errorCount, 'error')}, ${plural(this.warningCount, 'warning')}.`);
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
