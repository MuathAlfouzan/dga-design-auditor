#!/usr/bin/env node
/*
 * updates.test.mjs — the freshness check, against text captured from the real
 * pages on 18 Aug 2026.
 *
 * The fixtures are verbatim: DGA's changelog is Arabic-only and Figma's update
 * blocks are hand-typed by whoever edited the file, so both are full of the small
 * irregularities that break a parser written against an imagined format.
 */

import {
  parseDate, parseChangelog, parseFileUpdates, cmpVersion, compareFreshness, freshnessLine,
} from '../src/updates.js';

let bad = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
  if (!ok) bad++;
};
const ok = (name, cond, detail = '') => eq(name, !!cond || detail, true);

console.log('\n  Freshness check\n  ' + '─'.repeat(52));

/* ---- dates, both scripts ------------------------------------------------ */
eq('English date', parseDate('3 Nov 2025'), '2025-11-03');
eq('English long month', parseDate('20 February 2025'), '2025-02-20');
eq('Arabic date', parseDate('4 نوفمبر 2025'), '2025-11-04');
eq('Arabic date, single digit', parseDate('1 سبتمبر 2025'), '2025-09-01');
eq('junk is null, not a guess', parseDate('coming soon'), null);

/* ---- the DGA changelog, verbatim ---------------------------------------- */
const CHANGELOG = `سجل التحديثات
سجل التحديثات هو سجل يحتوي على جميع التحديثات التي تم إجراؤها على النظام، بما فيها التعديلات، الإضافات، الحذف والتصحيح.
الإصدار 1.0.3 - 4 نوفمبر 2025
الإصدار 1.0.2 - 1 سبتمبر 2025
الإصدار 1.0.1 - 20 مايو 2025
الإصدار 1.0.0 - 20 فبراير 2025`;

const releases = parseChangelog(CHANGELOG);
eq('four releases parsed', releases.length, 4);
eq('newest first', releases[0], { version: '1.0.3', date: '2025-11-04', href: '/updates/change-log/version-history-1-0-3' });
eq('oldest last', releases[3].version, '1.0.0');

eq('version compare', [cmpVersion('1.0.4', '1.0.3'), cmpVersion('1.0.3', '1.0.3'), cmpVersion('1.0.3', '1.1.0')], [1, 0, -1]);
eq('version compare handles differing depth', cmpVersion('1.1', '1.0.9'), 1);

/* ---- Figma descriptions, verbatim --------------------------------------- */
const COMPONENTS = `Introducing (Platforms Code) the National Design System of Saudi Arabia

Suggestions or feedback on the design kit?
Email us: DS-DGA@dga.gov.sa

---- Updates ----

3 Nov 2025:

🛠️Fixes & Updates:
- Digital Stamp:
Update digital stamp text.
------------------

18 Sep 2025:

🛠️Fixes & Updates:
- Digital Stamp:
Update digital stamp text.
------------------

2 Jul 2025:

🛠️Fixes & Updates:
- Accordion:
Fixed accordion icon.`;

const comp = parseFileUpdates(COMPONENTS);
eq('components: latest date', comp.latest, '2025-11-03');
eq('components: three entries', comp.entries.length, 3);
ok('components: note text kept', /digital stamp/i.test(comp.entries[0].note));
eq('components: no mid-rewrite notice', comp.notice, null);

const ICONS = `Platforms Code icons.

---- Updates ----

11 Jan 2026:
The icon library is currently being updated, Icons may be temporarily unavailable, The updated version will be available soon.
2 Jul 2025:
Fixed feedback icon ring color.Fixed saudi riyal icon name.
28 May 2025:
New icons added.Saudi Riyal icon added.
Suggestions or feedback on this file?
Email us: DS-DGA@dga.gov.sa`;

const icons = parseFileUpdates(ICONS);
eq('icons: latest date', icons.latest, '2026-01-11');
ok('icons: mid-rewrite notice caught', icons.notice && /temporarily unavailable/i.test(icons.notice.note));
ok('icons: trailing contact block not parsed as an entry', icons.entries.length === 3, `got ${icons.entries.length}`);

const MOBILE = parseFileUpdates('Platforms Code mobile components.');
eq('a file with no log is not an error', [MOBILE.hasLog, MOBILE.latest, MOBILE.entries.length], [false, null, 0]);

/* ---- the comparison ------------------------------------------------------ */
const sources = {
  sources: [
    { id: 'A', name: 'Foundations', tier: 'system', synced: '2026-08-17' },
    { id: 'B', name: 'Components Library', tier: 'system', synced: '2026-08-17' },
    { id: 'C', name: 'Icons', tier: 'system', synced: null, deferred: true },
    { id: 'T', name: 'Home Page Template', tier: 'template', synced: null },
  ],
};
const published = {
  A: parseFileUpdates('x\n---- Updates ----\n2 Jul 2025:\nAdded icon ring color.'),
  B: comp,
  C: icons,
};

const fresh = compareFreshness({ sources, changelog: releases, published, syncedAt: '2026-08-17', dgaVersion: '1.0.3' });
eq('current when everything predates the sync', fresh.current, true);
eq('templates are not checked', fresh.files.map((f) => f.id), ['A', 'B', 'C']);
ok('summary says current', /current/i.test(fresh.summary), fresh.summary);
ok('freshness line is one line', freshnessLine(fresh).split('\n').length === 1);

const stale = compareFreshness({
  sources, changelog: [{ version: '1.1.0', date: '2026-09-01' }, ...releases],
  published, syncedAt: '2026-08-17', dgaVersion: '1.0.3',
});
eq('a newer release marks the ledger behind', [stale.current, stale.versionBehind], [false, true]);
ok('and names the version', /1\.1\.0/.test(stale.summary), stale.summary);
ok('the warning line asks for a re-sync', /re-sync/i.test(freshnessLine(stale)));

const fileMoved = compareFreshness({
  sources,
  changelog: releases,
  published: { ...published, B: parseFileUpdates('x\n---- Updates ----\n9 Sep 2026:\nChanged button padding.') },
  syncedAt: '2026-08-17', dgaVersion: '1.0.3',
});
eq('a file published after the sync is stale', fileMoved.staleFiles.map((f) => f.name), ['Components Library']);
ok('and the new entry is carried through', /button padding/i.test(fileMoved.staleFiles[0].newEntries[0].note));

const deferredMoved = compareFreshness({
  sources, changelog: releases,
  published: { ...published, C: parseFileUpdates('x\n---- Updates ----\n9 Sep 2026:\nIcons republished.') },
  syncedAt: '2026-08-17', dgaVersion: '1.0.3',
});
eq('a deferred file moving does not make the ledger stale', deferredMoved.current, true);

console.log('\n  ' + '─'.repeat(52));
console.log(bad ? `\x1b[31m  ${bad} failing\x1b[0m\n` : '\x1b[32m  all passing\x1b[0m\n');
process.exit(bad ? 1 : 0);
