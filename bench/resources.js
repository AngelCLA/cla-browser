"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function windowsProcessTree(pid) {
  const script = [
    `$items = Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize,UserModeTime,KernelModeTime`,
    `$seen = [System.Collections.Generic.HashSet[uint32]]::new()`,
    `$queue = [System.Collections.Generic.Queue[uint32]]::new()`,
    `$queue.Enqueue([uint32]${pid})`,
    `while ($queue.Count -gt 0) {`,
    `  $current = $queue.Dequeue()`,
    `  if (-not $seen.Add($current)) { continue }`,
    `  foreach ($item in $items) { if ($item.ParentProcessId -eq $current) { $queue.Enqueue([uint32]$item.ProcessId) } }`,
    `}`,
    `$items | Where-Object { $seen.Contains([uint32]$_.ProcessId) } | ConvertTo-Json -Compress`,
  ].join("; ");
  const { stdout } = await execFileAsync("pwsh", ["-NoProfile", "-Command", script], { timeout: 8000 });
  if (!stdout.trim()) return null;
  const processes = JSON.parse(stdout);
  return Array.isArray(processes) ? processes : [processes];
}

async function processTreeStats(pid) {
  if (process.platform !== "win32" || !Number.isInteger(pid)) return null;
  try {
    const processes = await windowsProcessTree(pid);
    if (!processes?.length) return null;
    return {
      processCount: processes.length,
      workingSetBytes: processes.reduce((total, process) => total + Number(process.WorkingSetSize || 0), 0),
      cpuSeconds: processes.reduce((total, process) => total + Number(process.UserModeTime || 0) / 1e7 + Number(process.KernelModeTime || 0) / 1e7, 0),
    };
  } catch {
    return null;
  }
}

class ResourceMonitor {
  constructor(pid) {
    this.pid = pid;
    this.samples = [];
    this.timer = undefined;
  }

  async sample() {
    const sample = await processTreeStats(this.pid);
    if (sample) this.samples.push(sample);
    return sample;
  }

  async start() {
    await this.sample();
    this.timer = setInterval(() => this.sample(), 500);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    await this.sample();
    if (this.samples.length < 2) return null;
    const first = this.samples[0];
    const last = this.samples.at(-1);
    return {
      cpuSeconds: Math.max(0, last.cpuSeconds - first.cpuSeconds),
      peakWorkingSetBytes: Math.max(...this.samples.map((sample) => sample.workingSetBytes)),
      processCount: Math.max(...this.samples.map((sample) => sample.processCount)),
    };
  }
}

module.exports = { ResourceMonitor };
