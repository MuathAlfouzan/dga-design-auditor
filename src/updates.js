/*
 * updates.js — is the ledger still current?
 *
 * Pure parsing and comparison. No network: DGA's changelog is a client-rendered
 * SPA and Figma's community pages return 403 to anything that is not a browser,
 * so fetching is the agent's job (see AGENTS.md). This file only turns the text
 * those pages yield into a verdict, which keeps the part that can be wrong
 * testable.
 *
 * Two sources, doing different jobs:
 *   - design.dga.gov.sa/updates/change-log gives the SYSTEM version (1.0.3) and
 *     its release date. Authoritative, coarse.
 *   - Each Figma community file's description carries an "---- Updates ----"
 *     block naming what changed in THAT file. Finer, and the only thing that
 *     says whether a release touched something you actually synced.
 */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // The DGA site publishes its changelog in Arabic only.
  يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, مايو: 5, يونيو: 6,
  يوليو: 7, أغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
};

/** "3 Nov 2025" or "4 نوفمبر 2025" -> "2025-11-03". Null if unparseable. */
export function parseDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/(\d{1,2})\s+([^\s\d]+)\s+(\d{4})/);
  if (!m) return null;
  const key = m[2].toLowerCase().slice(0, m[2].match(/[a-z]/i) ? 3 : undefined);
  const month = MONTHS[key] ?? MONTHS[m[2]];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
}

/**
 * The DGA changelog page text -> [{ version, date, href }], newest first.
 * Lines look like "الإصدار 1.0.3 - 4 نوفمبر 2025".
 */
export function parseChangelog(text) {
  const out = [];
  const re = /(?:الإصدار|version|v)\s*(\d+\.\d+(?:\.\d+)?)\s*[-–—]\s*([^\n]+)/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const date = parseDate(m[2]);
    out.push({ version: m[1], date, href: `/updates/change-log/version-history-${m[1].replace(/\./g, '-')}` });
  }
  return out.sort((a, b) => cmpVersion(b.version, a.version));
}

/** Semver-ish compare on dotted numbers. */
export function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * A Figma community file description -> { latest, entries[], notice }.
 * The block is delimited by "---- Updates ----" and entries are "<date>:" followed
 * by free text. A file with no block has simply never been amended.
 */
export function parseFileUpdates(description) {
  const text = String(description || '');
  const start = text.search(/-{2,}\s*Updates\s*-{2,}/i);
  if (start < 0) return { latest: null, entries: [], notice: null, hasLog: false };
  const body = text.slice(start).replace(/-{2,}\s*Updates\s*-{2,}/i, '');
  const entries = [];
  const re = /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\s*:\s*([\s\S]*?)(?=\n\s*\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}\s*:|\n\s*Suggestions|\n\s*Email us|$)/g;
  let m;
  while ((m = re.exec(body))) {
    const note = m[2].replace(/-{3,}/g, ' ').replace(/\s+/g, ' ').trim();
    entries.push({ date: parseDate(m[1]), raw: m[1], note: note.slice(0, 400) });
  }
  entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // DGA sometimes uses the log to warn that a file is mid-rewrite. That is a
  // reason NOT to sync, so surface it rather than treating it as just another entry.
  const notice = entries.find((e) => /being updated|temporarily unavailable|coming soon|available soon/i.test(e.note)) || null;
  return { latest: entries[0]?.date ?? null, entries, notice, hasLog: true };
}

/**
 * Compare what is published against what the ledger recorded.
 *
 *   sources   — data/sources.json
 *   changelog — parseChangelog() output, or []
 *   published — { <sourceId>: parseFileUpdates() output }
 *   syncedAt  — tokens.synced (ISO date)
 */
export function compareFreshness({ sources, changelog = [], published = {}, syncedAt = null, dgaVersion = null }) {
  const latestRelease = changelog[0] || null;
  const files = [];

  for (const src of sources.sources || []) {
    if (src.tier !== 'system') continue;
    const pub = published[src.id];
    const lastPublished = pub?.latest ?? null;
    const stale = !!(src.synced && lastPublished && lastPublished > src.synced);
    files.push({
      id: src.id,
      name: src.name,
      synced: src.synced ?? null,
      deferred: !!src.deferred,
      lastPublished,
      hasLog: pub?.hasLog ?? null,
      stale,
      notice: pub?.notice ?? null,
      newEntries: stale ? (pub.entries || []).filter((e) => e.date && e.date > src.synced) : [],
    });
  }

  const staleFiles = files.filter((f) => f.stale && !f.deferred);
  const versionBehind = !!(latestRelease && dgaVersion && cmpVersion(latestRelease.version, dgaVersion) > 0);
  const notices = files.filter((f) => f.notice);

  return {
    current: staleFiles.length === 0 && !versionBehind,
    syncedAt,
    ledgerVersion: dgaVersion,
    latestRelease,
    versionBehind,
    files,
    staleFiles,
    notices,
    summary: staleFiles.length === 0 && !versionBehind
      ? `Ledger is current${dgaVersion ? ` at DGA ${dgaVersion}` : ''}${syncedAt ? `, synced ${syncedAt}` : ''}.`
      : versionBehind
        ? `DGA published ${latestRelease.version}${latestRelease.date ? ` on ${latestRelease.date}` : ''}; the ledger records ${dgaVersion || 'no version'}.`
        : `${staleFiles.length} file${staleFiles.length > 1 ? 's have' : ' has'} changed since the last sync: ${staleFiles.map((f) => f.name).join(', ')}.`,
  };
}

/** One line for the top of an audit report. */
export function freshnessLine(f) {
  if (!f) return '';
  if (f.current) return `Ledger current${f.ledgerVersion ? ` at DGA ${f.ledgerVersion}` : ''}${f.syncedAt ? `, synced ${f.syncedAt}` : ''}.`;
  return `⚠ ${f.summary} Re-sync before relying on this score.`;
}
