import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';

type Manifest = {
  features: Array<{
    id: string;
    name: string;
    kind: string;
    required: boolean;
    paths: string[];
    tests: {
      playwright: string[];
      userJourneys: string[];
      regression: string[];
      aurora: string[];
      akb: string[];
    };
    testJustification?: string;
  }>;
};

function readManifest(): Manifest {
  const filePath = path.join(process.cwd(), 'testlab', 'lek-biens-vokter.manifest.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as Manifest;
}

function getChangedFiles(): string[] {
  const commands = [
    'git diff --name-only --cached',
    'git diff --name-only HEAD~1..HEAD',
    'git diff --name-only',
  ];
  for (const cmd of commands) {
    try {
      const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
      const files = out
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);
      if (files.length > 0) return files;
    } catch {}
  }
  return [];
}

const manifest = readManifest();
const changedFiles = getChangedFiles();

const impacted = manifest.features
  .map((f) => {
    const patterns = Array.isArray(f.paths) ? f.paths : [];
    const hits = changedFiles.filter((file) => patterns.some((p) => minimatch(file, p, { dot: true })));
    return { feature: f, hits };
  })
  .filter((x) => x.hits.length > 0);

const matchedFiles = new Set(impacted.flatMap((x) => x.hits));
const unmatchedChangedFiles = changedFiles.filter((file) => !matchedFiles.has(file));

const output = {
  changedFiles,
  unmatchedChangedFiles,
  impactedFeatures: impacted.map((x) => ({
    id: x.feature.id,
    name: x.feature.name,
    kind: x.feature.kind,
    required: x.feature.required,
    matchedFiles: x.hits,
    tests: x.feature.tests,
    testJustification: x.feature.testJustification || null,
  })),
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
