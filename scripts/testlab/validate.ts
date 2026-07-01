import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';

type TestLabFeatureKind = 'feature' | 'bugfix' | 'refactor' | 'chore';

type TestLabFeature = {
  id: string;
  name: string;
  kind: TestLabFeatureKind;
  required: boolean;
  paths?: string[];
  tests: {
    playwright: string[];
    userJourneys: string[];
    regression: string[];
    aurora: string[];
    akb: string[];
  };
  testJustification?: string;
};

type TestLabUserJourney = {
  id: string;
  name: string;
  required: boolean;
  tests: string[];
};

type TestLabManifest = {
  schemaVersion: number;
  project: { id: string; name: string; defaultBranch: string };
  features: TestLabFeature[];
  userJourneys: TestLabUserJourney[];
};

function fail(message: string) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((x) => String(x || '').trim()).filter(Boolean) : [];
}

function readManifest(): TestLabManifest {
  const filePath = path.join(process.cwd(), 'testlab', 'lek-biens-vokter.manifest.json');
  if (!fs.existsSync(filePath)) fail(`Mangler TestLab-manifest: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  return json as TestLabManifest;
}

function walk(dirPath: string, collected: string[] = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(full, collected);
      continue;
    }
    collected.push(full);
  }
  return collected;
}

function getAppFeatureFiles() {
  const appRoot = path.join(process.cwd(), 'src', 'app');
  const ignored = new Set([
    path.join(appRoot, 'layout.tsx'),
    path.join(appRoot, 'error.tsx'),
    path.join(appRoot, 'global-error.tsx'),
  ]);

  return walk(appRoot)
    .filter((filePath) => {
      const base = path.basename(filePath);
      return base === 'page.tsx' || base === 'route.ts' || base === 'route.tsx';
    })
    .filter((filePath) => !ignored.has(filePath))
    .map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, '/'));
}

function validateManifest(manifest: TestLabManifest) {
  if (!manifest || typeof manifest !== 'object') fail('Ugyldig manifest: ikke et objekt.');
  if (manifest.schemaVersion !== 1) fail(`Ugyldig schemaVersion: ${String((manifest as any).schemaVersion)}`);
  if (!manifest.project?.id || !manifest.project?.name) fail('Manifest mangler project.id eller project.name.');

  const featureIds = new Set<string>();
  const journeyIds = new Set<string>();
  const journeyRefs = new Map<string, number>();

  for (const journey of Array.isArray(manifest.userJourneys) ? manifest.userJourneys : []) {
    const id = String((journey as any)?.id || '').trim();
    const name = String((journey as any)?.name || '').trim();
    if (!id || !name) fail('UserJourney mangler id eller name.');
    if (journeyIds.has(id)) fail(`Duplikat UserJourney id: ${id}`);
    journeyIds.add(id);
    journeyRefs.set(id, 0);
  }

  const allowedKinds: TestLabFeatureKind[] = ['feature', 'bugfix', 'refactor', 'chore'];

  for (const feature of Array.isArray(manifest.features) ? manifest.features : []) {
    const id = String((feature as any)?.id || '').trim();
    const name = String((feature as any)?.name || '').trim();
    const kind = String((feature as any)?.kind || '').trim() as TestLabFeatureKind;
    if (!id || !name) fail('Feature mangler id eller name.');
    if (!allowedKinds.includes(kind)) fail(`Ugyldig feature.kind for ${id}: ${String((feature as any)?.kind)}`);
    if (featureIds.has(id)) fail(`Duplikat feature id: ${id}`);
    featureIds.add(id);

    const tests = (feature as any)?.tests || {};
    const normalized = {
      playwright: asStringArray(tests.playwright),
      userJourneys: asStringArray(tests.userJourneys),
      regression: asStringArray(tests.regression),
      aurora: asStringArray(tests.aurora),
      akb: asStringArray(tests.akb),
    };

    for (const uj of normalized.userJourneys) {
      if (!journeyIds.has(uj)) fail(`Feature ${id} refererer til ukjent userJourney: ${uj}`);
      journeyRefs.set(uj, (journeyRefs.get(uj) || 0) + 1);
    }

    const allTests = [
      ...normalized.playwright,
      ...normalized.regression,
      ...normalized.aurora,
      ...normalized.akb,
      ...normalized.userJourneys.map((uj) => `journey:${uj}`),
    ];

    const hasAnyTests = allTests.length > 0;
    const justification = String((feature as any)?.testJustification || '').trim();
    if (!hasAnyTests && !justification) {
      fail(`Feature ${id} mangler tests og mangler testJustification.`);
    }

    if ((feature as any)?.required === true && !hasAnyTests && !justification) {
      fail(`Feature ${id} er required men mangler tests eller begrunnelse.`);
    }

    const anyPaths = asStringArray((feature as any)?.paths);
    if (anyPaths.length === 0) {
      fail(`Feature ${id} mangler paths. Bruk glob-mønstre for å knytte endringer til feature.`);
    }
  }

  const coveragePatterns = manifest.features.flatMap((feature) => asStringArray(feature.paths));
  const uncoveredFiles = getAppFeatureFiles().filter(
    (filePath) => !coveragePatterns.some((pattern) => minimatch(filePath, pattern, { dot: true }))
  );

  if (uncoveredFiles.length > 0) {
    fail(
      `Manifestet dekker ikke alle app features. Mangler dekning for:\n${uncoveredFiles
        .map((filePath) => `- ${filePath}`)
        .join('\n')}`
    );
  }

  const orphanJourneys = Array.from(journeyRefs.entries())
    .filter(([, refCount]) => refCount === 0)
    .map(([id]) => id);

  if (orphanJourneys.length > 0) {
    fail(
      `Manifestet har user journeys uten feature-kobling. Mangler referanse for:\n${orphanJourneys
        .map((id) => `- ${id}`)
        .join('\n')}`
    );
  }
}

const manifest = readManifest();
validateManifest(manifest);
process.stdout.write(`OK: TestLab-manifest validert (${manifest.features.length} features, ${manifest.userJourneys.length} user journeys)\n`);
