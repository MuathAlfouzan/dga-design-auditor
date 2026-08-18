/*
 * score.js — the scoring core. Pure: no filesystem, no process, no console.
 *
 * Same arithmetic as the original Node script it was extracted from; only the
 * edges changed. That matters because a compliance score that moves between
 * refactors is not a compliance score — test/parity.mjs re-scores a real saved
 * audit and requires the number to come back byte-identical.
 *
 *   const verdict = score({ rubric, tokens, captures, judged, options });
 *
 * Runs unchanged in a browser tab and in Node.
 */

export class DgaError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'DgaError';
    this.code = code;
    this.detail = detail;
  }
}

/* ---------------------------------------------------------------- colour */

// sRGB -> OKLab, then Euclidean distance x100 (CSS Color 4's deltaEOK).
// ~2.0 is about one just-noticeable difference, which is why the match
// threshold sits there: a designer cannot see a pass, and can see a fail.
export function srgbToOklab(r, g, b) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = f(r), G = f(g), B = f(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function parseHex(h) {
  if (typeof h !== 'string') return null;
  let s = h.trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s.slice(0, 6))) return null;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

export function deltaEOK(hexA, hexB) {
  const A = parseHex(hexA), B = parseHex(hexB);
  if (!A || !B) return Infinity;
  const x = srgbToOklab(A.r, A.g, A.b), y = srgbToOklab(B.r, B.g, B.b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b) * 100;
}

function nearestToken(hexValue, palette) {
  let best = null, bestD = Infinity;
  for (const [name, value] of Object.entries(palette)) {
    const d = deltaEOK(hexValue, value);
    if (d < bestD) { bestD = d; best = name; }
  }
  return { token: best, delta: Math.round(bestD * 100) / 100 };
}

/* ------------------------------------------------------------------ main */

export function score({ rubric, tokens, benchmarks = null, captures = [], judged = {}, options = {} }) {
  const {
    targetType = 'site',
    targetName = '(unnamed target)',
    targetUrl = null,
    na: naList = [],
    benchmarkViewport = 'web',
    benchmarkId = null,
    allowUnassessed = false,
    allowUncountedJudged = false,
    allowLowCoverage = false,
  } = options;

  if (!tokens || !tokens.synced) {
    throw new DgaError(
      'LEDGER_UNSYNCED',
      'The DGA token ledger has never been synced. Run the sync with your copy of the ' +
        'Platforms Code library open in Figma desktop. Refusing to score against an empty ' +
        'baseline — a made-up ledger produces a made-up number.'
    );
  }
  if (!captures.length && targetType === 'site') {
    throw new DgaError('NO_CAPTURES', 'A site audit needs at least one capture.');
  }

  const TH = rubric.thresholds;
  const round2 = (n) => Math.round(n * 100) / 100;
  const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
  const onScale = (v, scale, tol = 0.5) => scale.some((s) => near(Number(v), Number(s), tol));

  function mergedTally(key, filter = () => true) {
    const map = new Map();
    for (const c of captures) {
      if (!filter(c)) continue;
      const t = c.tallies?.[key];
      if (!t) continue;
      for (const e of t.values) {
        const cur = map.get(e.value) || { value: e.value, count: 0, samples: [] };
        cur.count += e.count;
        for (const s of e.samples || []) if (cur.samples.length < 3 && !cur.samples.includes(s)) cur.samples.push(s);
        map.set(e.value, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }
  const sum = (rows) => rows.reduce((a, r) => a + r.count, 0);

  const findings = [];
  function finding(checkId, severity, summary, detail) {
    findings.push({ checkId, severity, summary, ...detail });
  }

  const palette = (scheme) => ({ ...(tokens.color?.[scheme] || {}) });
  const lightPalette = palette('light');
  const darkPalette = palette('dark');
  const anyPalette = { ...lightPalette, ...darkPalette };

  /* ------------------------------------------------- coverage evaluators */

  function colorCoverage(rows, pal, checkId, what) {
    const total = sum(rows);
    if (!total) return { ratio: null, matched: 0, total: 0, offenders: [] };
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const { token, delta } = nearestToken(r.value, pal);
      if (delta <= TH.colorMatchDeltaE) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, nearestToken: token, delta, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} ${o.value} is not a DGA token`, {
        found: o.value,
        expected: o.nearestToken ? `${o.nearestToken} (ΔE ${o.delta})` : 'a DGA colour token',
        occurrences: o.count,
        where: o.samples,
        fix: o.delta <= TH.colorNearMissDeltaE
          ? `Almost certainly meant to be \`${o.nearestToken}\` — swap the literal for the token.`
          : 'Not close to any DGA colour. Either replace it or get the addition approved into the library.',
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function scaleCoverage(rows, scale, checkId, what, unit = 'px', tol = 0.5) {
    const total = sum(rows);
    if (!total || !scale?.length) return { ratio: null, matched: 0, total, offenders: [] };
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const v = r.value === 'pill' ? 'pill' : Number(r.value);
      const ok = v === 'pill' ? true : onScale(v, scale, tol);
      if (ok) matched += r.count;
      else {
        const nearest = scale.reduce((a, s) => (Math.abs(s - v) < Math.abs(a - v) ? s : a), scale[0]);
        offenders.push({ value: r.value, count: r.count, nearest, samples: r.samples });
      }
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} ${o.value}${unit} is off the DGA scale`, {
        found: `${o.value}${unit}`,
        expected: `${o.nearest}${unit}`,
        occurrences: o.count,
        where: o.samples,
        fix: `Snap to ${o.nearest}${unit}.`,
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function setCoverage(rows, allowed, checkId, what, normalise = (x) => String(x)) {
    const total = sum(rows);
    if (!total || !allowed?.length) return { ratio: null, matched: 0, total, offenders: [] };
    const set = new Set(allowed.map(normalise));
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      if (set.has(normalise(r.value))) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    // Dedupe for display: T1 concatenates the Latin and Arabic stacks, and when one
    // family serves both scripts — as it does in Platforms Code — the raw list reads
    // "IBM Plex Sans Arabic, IBM Plex Sans Arabic".
    const shown = [...new Set(allowed.map(String))];
    for (const o of offenders.slice(0, 12)) {
      finding(checkId, o.count >= 20 ? 'major' : 'minor', `${what} "${o.value}" is not in the DGA set`, {
        found: String(o.value),
        expected: shown.slice(0, 8).join(', ') + (shown.length > 8 ? ', …' : ''),
        occurrences: o.count,
        where: o.samples,
        fix: `Use one of the defined values.`,
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  function shadowCoverage(rows, levels, checkId) {
    const total = sum(rows);
    const tokenShadows = Object.entries(levels || {});
    if (!total || !tokenShadows.length) return { ratio: null, matched: 0, total, offenders: [] };
    // The probe reports shadows already normalised to "x y blur spread / r g b a".
    // The ledger stores CSS text, so normalise that the same way before comparing.
    // Scraping numbers out of the raw strings — as this did — read `#1018280d` as
    // the integer 1018280 while the browser gave four rgba components, so the arrays
    // were never even the same length and E3 could not pass on any page, ever.
    const normLedger = (css) =>
      String(css)
        .split(/,(?![^(]*\))/)
        .map((layer) => {
          const inset = /\binset\b/.test(layer);
          let rest = layer.replace(/\binset\b/, '');
          let colour = null;
          const fn = rest.match(/(rgba?|hsla?)\([^)]*\)/i);
          if (fn) { colour = fn[0]; rest = rest.replace(fn[0], ''); }
          else {
            const h = rest.match(/#[0-9a-f]{3,8}\b/i);
            if (h) { colour = h[0]; rest = rest.replace(h[0], ''); }
          }
          const lens = (rest.match(/-?\d*\.?\d+(px|rem|em)?/g) || [])
            .map((n) => Math.round(parseFloat(n) * 100) / 100)
            .filter((n) => Number.isFinite(n));
          while (lens.length < 4) lens.push(0);
          let rgba = [0, 0, 0, 1];
          if (colour) {
            const hx = colour.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
            if (hx) {
              const n = parseInt(hx[1], 16);
              rgba = [(n >> 16) & 255, (n >> 8) & 255, n & 255, hx[2] ? Math.round((parseInt(hx[2], 16) / 255) * 100) / 100 : 1];
            } else {
              const m = colour.match(/\(([^)]+)\)/);
              if (m) {
                const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
                rgba = [p[0] | 0, p[1] | 0, p[2] | 0, p.length > 3 ? Math.round(p[3] * 100) / 100 : 1];
              }
            }
          }
          return (inset ? 'inset ' : '') + lens.slice(0, 4).join(' ') + ' / ' + rgba.join(' ');
        })
        .join(', ');

    // The probe now reports shadows already normalised ("x y blur spread / r g b a").
    // Captures taken before that change carry the browser's raw string, so normalise
    // anything that is not already in the normalised shape.
    const isNormalised = (s) => / \/ /.test(String(s));
    const nums = (s) => (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const observed = isNormalised(r.value) ? r.value : normLedger(r.value);
      const a = nums(observed);
      const hit = tokenShadows.some(([, v]) => {
        const nv = normLedger(v);
        if (observed === nv) return true;           // normalised forms agree exactly
        const b = nums(nv);
        if (a.length !== b.length) return false;    // fall back to a tolerant compare
        return a.every((n, i) => Math.abs(n - b[i]) <= 1.5);
      });
      if (hit) matched += r.count;
      else offenders.push({ value: r.value, count: r.count, samples: r.samples });
    }
    offenders.sort((a, b) => b.count - a.count);
    for (const o of offenders.slice(0, 8)) {
      finding(checkId, 'minor', 'Shadow is not a DGA elevation level', {
        found: o.value,
        expected: Object.keys(levels).join(' | '),
        occurrences: o.count,
        where: o.samples,
        fix: 'Use the named elevation level so depth ordering stays consistent.',
      });
    }
    return { ratio: matched / total, matched, total, offenders };
  }

  /* ------------------------------------------------------------ checks */

  // Bucket on what the page RENDERED, not on what the viewer prefers. A site
  // with no dark theme still renders light on a machine set to dark, and
  // bucketing on the media query empties the light set — which silently voids
  // the whole 18-point colour category and reports it as "nothing to measure".
  // Captures predating renderedScheme fall back to the theme class, then the
  // preference.
  const schemeOf = (c) => c.renderedScheme || (c.documentDark ? 'dark' : c.colorScheme) || 'light';
  const darkCaptures = captures.filter((c) => schemeOf(c) === 'dark');
  const lightOnly = (c) => schemeOf(c) !== 'dark';
  const darkOnly = (c) => schemeOf(c) === 'dark';

  const auto = {};

  /* colour */
  {
    const rows = [
      ...mergedTally('textColor', lightOnly),
      ...mergedTally('bgColor', lightOnly),
      ...mergedTally('borderColor', lightOnly),
      ...mergedTally('svgFill', lightOnly),
    ];
    auto.C1 = colorCoverage(rows, lightPalette, 'C1', 'Colour');

    const far = (auto.C1.offenders || []).filter(
      (o) => o.delta > TH.colorNearMissDeltaE && o.count >= TH.offPaletteMinOccurrences
    );
    const totalC = auto.C1.total || 0;
    const farCount = far.reduce((a, o) => a + o.count, 0);
    auto.C2 = { ratio: totalC ? 1 - farCount / totalC : null, matched: totalC - farCount, total: totalC, offenders: far };
    for (const o of far.slice(0, 8)) {
      finding('C2', 'blocker', `Off-palette colour ${o.value} used ${o.count}×`, {
        found: o.value,
        expected: 'a colour from the DGA palette',
        occurrences: o.count,
        where: o.samples,
        fix: 'An unrecognisable brand colour is an identity violation, not a styling preference. Replace it, or get the addition approved into the DGA library.',
      });
    }

    if (darkCaptures.length && Object.keys(darkPalette).length) {
      const drows = [
        ...mergedTally('textColor', darkOnly),
        ...mergedTally('bgColor', darkOnly),
        ...mergedTally('borderColor', darkOnly),
      ];
      auto.C4 = colorCoverage(drows, darkPalette, 'C4', 'Dark-theme colour');
    } else {
      auto.C4 = { ratio: null, na: true, reason: darkCaptures.length ? 'ledger has no dark token set' : 'target ships no dark theme' };
    }
  }

  /* typography */
  {
    // Resolve local aliases before judging. A site may serve exactly the right
    // typeface under its own family name — @font-face { font-family: regularFont;
    // src: url(IBMPlexSansArabic-Regular.ttf) } — and matching the declared name
    // against the ledger would score the correct face as a total failure. The
    // probe records which file each declared family loads; this follows it.
    const faceMap = {};
    for (const c of captures) Object.assign(faceMap, c.fontFaceMap || {});
    const norm = (x) => String(x).toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]/g, '').trim();
    const resolveFamily = (declared) => {
      const hit = Object.keys(faceMap).find((k) => norm(k) === norm(declared));
      return hit ? faceMap[hit] : declared;
    };
    const fams = mergedTally('fontFamily').map((r) => ({ ...r, declared: r.value, value: resolveFamily(r.value) }));
    const allowed = [...(tokens.typography?.families?.latin || []), ...(tokens.typography?.families?.arabic || [])];
    auto.T1 = setCoverage(fams, allowed, 'T1', 'Font family', norm);

    const ramp = tokens.typography?.ramp || [];
    auto.T2 = scaleCoverage(mergedTally('fontSize'), ramp.map((r) => r.size), 'T2', 'Font size');
    auto.T3 = setCoverage(mergedTally('fontWeight'), tokens.typography?.weights || [], 'T3', 'Font weight', (x) => String(Number(x)));

    const lhRows = mergedTally('lineHeight');
    const sizes = new Set(ramp.map((r) => r.size));
    const legalLH = new Set(ramp.map((r) => r.lineHeight).filter((n) => Number.isFinite(n)));
    const lhTotal = sum(lhRows);
    let lhMatched = 0;
    for (const r of lhRows) {
      if (r.value === 'normal') continue;
      if ([...legalLH].some((l) => near(Number(r.value), l, 1))) lhMatched += r.count;
    }
    // A ramp step is a size AND its paired leading AND its tracking. Testing leading
    // against a flat list let a 14px body carry 72px display leading and pass, which
    // is exactly the mismatch this check exists to catch. Where the probe reports the
    // triple, match on it; fall back to the old leading-only test for older captures.
    const pairRows = mergedTally('typePair');
    if (sum(pairRows) > 0) {
      const pairTotal = sum(pairRows);
      let pairMatched = 0;
      const pairOff = [];
      for (const r of pairRows) {
        const [szS, lhS, lsS] = String(r.value).split('|');
        const sz = Number(szS);
        const step = ramp.find((s) => near(s.size, sz, 0.6));
        const lhOk = step
          ? (lhS === 'normal' ? false : near(Number(lhS), step.lineHeight, 1))
          : false;
        const lsOk = step ? near(Number(lsS || 0), step.letterSpacing ?? 0, 0.3) : false;
        if (step && lhOk && lsOk) pairMatched += r.count;
        else pairOff.push({ value: r.value, count: r.count, samples: r.samples, size: sz, step });
      }
      auto.T4 = { ratio: pairTotal ? pairMatched / pairTotal : null, matched: pairMatched, total: pairTotal, offenders: pairOff };
      pairOff.sort((a, b) => b.count - a.count);
      for (const o of pairOff.slice(0, 6)) {
        const [sz, lh, ls] = String(o.value).split('|');
        finding('T4', o.count >= 20 ? 'major' : 'minor', `Type step ${sz}px is not paired with its ramp leading`, {
          found: `${sz}px / ${lh} leading / ${ls} tracking`,
          expected: o.step
            ? `${o.step.name}: ${o.step.size}px / ${o.step.lineHeight} / ${o.step.letterSpacing ?? 0}`
            : `${sz}px is not a ramp size at all`,
          occurrences: o.count,
          where: o.samples,
          fix: 'Set the ramp step’s paired leading rather than a global multiplier — Arabic needs the extra room and a multiplier will not give it.',
        });
      }
    } else {
      auto.T4 = { ratio: lhTotal ? lhMatched / lhTotal : null, matched: lhMatched, total: lhTotal, offenders: [] };
      if (lhTotal && lhMatched / lhTotal < 0.9) {
        finding('T4', 'minor', 'Line heights do not match the DGA ramp', {
          found: `${lhTotal - lhMatched} of ${lhTotal} text runs`,
          expected: [...legalLH].sort((a, b) => a - b).join(', ') + ' px',
          where: lhRows.filter((r) => r.value !== 'normal' && ![...legalLH].some((l) => near(Number(r.value), l, 1))).slice(0, 5).flatMap((r) => r.samples),
          fix: 'Set the ramp step’s paired leading rather than a global multiplier — Arabic needs the extra room and a multiplier will not give it.',
          note: `Ramp sizes present: ${[...sizes].sort((a, b) => a - b).join(', ')}`,
        });
      }
    }
  }

  /* spacing */
  {
    const scale = tokens.spacing?.scale || [];
    auto.S1 = scaleCoverage([...mergedTally('spacing'), ...mergedTally('gap')], scale, 'S1', 'Spacing');

    const bps = tokens.breakpoints?.list || [];
    if (targetType === 'site' && bps.length && captures.length) {
      let hit = 0, checked = 0;
      for (const c of captures) {
        const w = c.viewport?.width;
        if (!w) continue;
        const bp = bps.filter((b) => w >= (b.min ?? 0)).sort((a, b) => (b.min ?? 0) - (a.min ?? 0))[0];
        if (!bp) continue;
        checked++;
        const containerOk = bp.container ? Math.abs((c.layout?.container ?? 0) - bp.container) <= Math.max(8, bp.container * 0.02) : true;
        const gutterOk = bp.gutter != null ? near(c.layout?.gutter ?? 0, bp.gutter, 4) : true;
        if (containerOk && gutterOk) hit++;
        else {
          finding('S2', 'minor', `Container at ${w}px viewport does not match the ${bp.name} breakpoint`, {
            found: `container ${c.layout?.container}px, gutter ${c.layout?.gutter}px`,
            expected: `container ${bp.container}px, gutter ${bp.gutter}px`,
            where: [c.label],
            viewport: c.label,
            fix: 'Match the DGA container so content lines up across linked government services.',
          });
        }
        if (c.layout?.horizontalOverflow) {
          finding('S2', 'major', `Page overflows horizontally at ${w}px`, {
            found: `document ${c.layout.documentWidth}px wide in a ${w}px viewport`,
            expected: 'no horizontal scroll',
            where: [c.label],
            viewport: c.label,
            fix: 'Something is wider than its container — usually a fixed width or an unwrapped table.',
          });
        }
      }
      auto.S2 = { ratio: checked ? hit / checked : null, matched: hit, total: checked };
    } else {
      auto.S2 = { ratio: null, na: true, reason: targetType !== 'site' ? 'not measurable on a Figma frame' : 'ledger has no breakpoints' };
    }

    const rhythm = tokens.spacing?.rhythm || [];
    if (rhythm.length) {
      auto.S3 = scaleCoverage(mergedTally('spacing').filter((r) => Number(r.value) >= Math.min(...rhythm)), rhythm, 'S3', 'Section spacing', 'px', 2);
    } else {
      auto.S3 = { ratio: null, na: true, reason: 'ledger defines no rhythm steps' };
    }
  }

  /* shape */
  {
    auto.E1 = scaleCoverage(mergedTally('radius'), tokens.radius?.scale || [], 'E1', 'Radius');

    const widths = scaleCoverage(mergedTally('borderWidth'), tokens.border?.widths || [], 'E2', 'Border width');
    const borderTokenNames = tokens.color?.roles?.border || [];
    const borderPal = Object.fromEntries(borderTokenNames.map((n) => [n, anyPalette[n]]).filter(([, v]) => v));
    const colors = Object.keys(borderPal).length
      ? colorCoverage(mergedTally('borderColor'), borderPal, 'E2', 'Border colour')
      : { ratio: null };
    const parts = [widths.ratio, colors.ratio].filter((r) => r != null);
    auto.E2 = { ratio: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null, detail: { widths, colors } };

    auto.E3 = shadowCoverage(mergedTally('shadow'), tokens.elevation?.levels, 'E3');
  }

  /* rtl */
  {
    const r = captures.reduce(
      (a, c) => {
        const x = c.rtl || {};
        a.arabicRuns += x.arabicRuns || 0;
        a.arabicInFace += x.arabicRunsInArabicFace || 0;
        a.rtlElements += x.rtlElements || 0;
        a.ltrElements += x.ltrElements || 0;
        a.arabicIndic += x.arabicIndicNumerals || 0;
        a.western += x.westernNumerals || 0;
        a.unmirrored += x.unmirroredDirectionalIcons || 0;
        return a;
      },
      { arabicRuns: 0, arabicInFace: 0, rtlElements: 0, ltrElements: 0, arabicIndic: 0, western: 0, unmirrored: 0 }
    );

    const anyArabic = r.arabicRuns > 0;
    const docDirs = captures.map((c) => c.document?.dir);
    if (!anyArabic) {
      auto.R1 = { ratio: null, na: true, reason: 'no Arabic content in the captures' };
      auto.R3 = { ratio: null, na: true, reason: 'no Arabic content in the captures' };
    } else {
      const dirOk = docDirs.some((d) => d === 'rtl');
      const mirrored = r.rtlElements > r.ltrElements;
      auto.R1 = { ratio: (dirOk ? 0.5 : 0) + (mirrored ? 0.5 : 0), detail: { docDirs, ...r } };
      if (!dirOk) {
        finding('R1', 'major', 'Arabic content renders without dir="rtl"', {
          found: `document dir = ${docDirs.join(', ') || 'unset'}`,
          expected: 'dir="rtl" on the document for Arabic',
          where: captures.map((c) => c.label),
          fix: 'Set dir on the document and let logical properties carry the mirroring.',
        });
      } else if (!mirrored) {
        finding('R1', 'major', 'dir is rtl but most of the layout still computes ltr', {
          found: `${r.rtlElements} rtl vs ${r.ltrElements} ltr elements`,
          expected: 'the layout mirrors, not just the text',
          where: captures.map((c) => c.label),
          fix: 'Something is pinning direction back to ltr on subtrees — usually a component-level override.',
        });
      }

      const faceRatio = r.arabicRuns ? r.arabicInFace / r.arabicRuns : 1;
      const numeralsMixed = r.arabicIndic > 0 && r.western > 0;
      const iconsOk = r.unmirrored === 0;
      auto.R3 = { ratio: faceRatio * 0.5 + (numeralsMixed ? 0 : 0.3) + (iconsOk ? 0.2 : 0), detail: r };
      if (faceRatio < 1) {
        finding('R3', 'major', 'Arabic text is not rendering in an Arabic face', {
          found: `${r.arabicRuns - r.arabicInFace} of ${r.arabicRuns} Arabic runs`,
          expected: (tokens.typography?.families?.arabic || []).join(', ') || 'the DGA Arabic face',
          fix: 'Put the Arabic face ahead of the Latin one in the stack; the browser falls through per glyph.',
        });
      }
      if (numeralsMixed) {
        finding('R3', 'minor', 'Arabic-Indic and Western numerals both appear', {
          found: `${r.arabicIndic} runs with ٠١٢, ${r.western} with 012`,
          expected: `one system throughout (ledger says: ${tokens.numerals || 'unspecified'})`,
          fix: 'Pick one numeral system and apply it everywhere — this is the most common bilingual defect and the easiest to fix.',
        });
      }
      if (!iconsOk) {
        finding('R3', 'minor', 'Directional icons did not mirror under RTL', {
          found: `${r.unmirrored} chevron/arrow icons unmirrored`,
          expected: 'directional icons flip with the layout',
          fix: 'Mirror them with a transform driven off [dir=rtl], or use the RTL-aware icon variants.',
        });
      }
    }

    if (targetType === 'site') {
      const css = captures.reduce((a, c) => {
        a.logical += c.css?.logicalDecls || 0;
        a.physical += c.css?.physicalDecls || 0;
        a.inaccessible += c.css?.inaccessibleSheets || 0;
        a.samples.push(...(c.css?.physicalSamples || []));
        return a;
      }, { logical: 0, physical: 0, inaccessible: 0, samples: [] });
      const tot = css.logical + css.physical;
      auto.R2 = { ratio: tot ? css.logical / tot : null, detail: css };
      if (tot && css.physical > 0) {
        finding('R2', css.physical > css.logical ? 'major' : 'minor', `${css.physical} directional declarations are physical, not logical`, {
          found: `${css.physical} physical vs ${css.logical} logical in first-party CSS` +
          (css.vendorSheets ? ` (plus ${css.vendorPhysical} physical in ${css.vendorSheets} vendor stylesheet${css.vendorSheets > 1 ? 's' : ''}, not scored)` : ''),
          expected: 'inline/block logical properties throughout',
          where: [...new Set(css.samples.map((s) => `${s.selector} { ${s.property} }`))].slice(0, 8),
          fix: 'margin-inline-start over margin-left. Physical properties are why an RTL layout needs a second stylesheet, and then diverges from the first.',
        });
      }
      if (css.inaccessible) {
        finding('R2', 'minor', `${css.inaccessible} stylesheet(s) were cross-origin and could not be read`, {
          found: `${css.inaccessible} unreadable sheets`,
          expected: 'same-origin stylesheets, or accept reduced confidence',
          fix: 'This lowers confidence in R2 and M2 only. Self-host the stylesheet to measure it.',
        });
      }
    } else {
      auto.R2 = { ratio: null, na: true, reason: 'authored CSS does not exist on a Figma frame' };
    }
  }

  /* accessibility */
  {
    const c = captures.reduce((a, x) => {
      a.runs += x.contrast?.textRuns || 0;
      a.pass += x.contrast?.passing || 0;
      a.ind += x.contrast?.indeterminate || 0;
      a.find.push(...(x.contrast?.findings || []));
      return a;
    }, { runs: 0, pass: 0, ind: 0, find: [] });
    const measurable = c.runs - c.ind;
    auto.A1 = { ratio: measurable > 0 ? c.pass / measurable : null, matched: c.pass, total: measurable, indeterminate: c.ind };
    for (const f of c.find.sort((a, b) => a.ratio - b.ratio).slice(0, 15)) {
      finding('A1', 'blocker', `Text contrast ${f.ratio}:1 is below the required ${f.required}:1`, {
        found: `${f.fg} on ${f.bg} at ${f.fontSize}px/${f.fontWeight} → ${f.ratio}:1`,
        expected: `${f.required}:1`,
        where: [f.loc || f.selector],
        sample: f.text,
        fix: `Needs about ${round2(f.required - f.ratio)} more contrast. Government services carry a statutory accessibility obligation — darken the text token or lighten the surface.`,
      });
    }
    if (c.ind) {
      finding('A1', 'minor', `${c.ind} text runs sit on an image or gradient and could not be measured`, {
        found: `${c.ind} of ${c.runs} runs`,
        expected: 'measurable contrast',
        fix: 'Excluded from the score rather than guessed. Check these by eye, or add a scrim so the ratio is determinate.',
      });
    }

    const n = captures.reduce((a, x) => {
      a.checked += x.nonTextContrast?.checked || 0;
      a.pass += x.nonTextContrast?.passing || 0;
      a.find.push(...(x.nonTextContrast?.findings || []));
      return a;
    }, { checked: 0, pass: 0, find: [] });
    auto.A2 = { ratio: n.checked ? n.pass / n.checked : null, matched: n.pass, total: n.checked };
    for (const f of n.find.sort((a, b) => a.ratio - b.ratio).slice(0, 8)) {
      finding('A2', 'blocker', `Boundary contrast ${f.ratio}:1 is below 3:1`, {
        found: `${f.border} against ${f.against} → ${f.ratio}:1`,
        expected: '3:1',
        where: [f.loc || f.selector],
        fix: 'An input whose border disappears against its background is not usable at low vision or in sunlight.',
      });
    }

    if (targetType === 'site') {
      const f = captures.reduce((a, x) => {
        a.probed += x.focus?.probed || 0;
        a.visible += x.focus?.visible || 0;
        a.ring += x.focus?.ring || 0;
        a.colourOnly += x.focus?.colourOnly || 0;
        a.seeded = a.seeded && (x.focus?.seeded !== false);
        a.missing.push(...(x.focus?.missing || []));
        return a;
      }, { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: true, missing: [] });
      auto.A3 = { ratio: f.probed ? f.visible / f.probed : null, matched: f.visible, total: f.probed };
      // A capture taken before the focus-visible seeding fix cannot tell a removed
      // indicator from an unmatched pseudo-class, so it reports nothing rather than 0.
      if (f.probed && !f.seeded) {
        auto.A3 = { ratio: null, na: true, reason: 'browser would not enter :focus-visible, so focus styling could not be observed' };
      } else if (f.colourOnly) {
        finding('A3', 'minor', `${f.colourOnly} of ${f.probed} controls signal focus by colour change alone`, {
          found: `${f.colourOnly} colour-only, ${f.ring} with a ring`,
          expected: 'an indicator with its own shape, not colour alone',
          fix: 'A colour swap meets SC 2.4.7 but fails SC 2.4.13 Focus Appearance. Add an outline so the indicator survives low vision and greyscale.',
        });
      }
      if (f.missing.length && f.seeded) {
        // Count from probed-minus-visible, never from missing.length — the probe caps
        // its missing[] sample at 20 per capture, so that array understates the failure
        // on any page with more than 20 unfocusable controls.
        finding('A3', 'major', `${f.probed - f.visible} of ${f.probed} probed controls show no focus indicator`, {
          found: `${f.probed - f.visible} controls unchanged on focus`,
          expected: 'a visible indicator on every interactive element',
          where: f.missing.slice(0, 8).map((m) => m.loc || m.selector),
          fix: 'Never remove the outline without replacing it. Keyboard-only users navigate the whole service through this one affordance.',
        });
      }
    } else {
      auto.A3 = { ratio: null, na: true, reason: 'focus state does not exist on a static frame' };
    }

    // A4 is viewport-aware: the probe already measured against the threshold its own
    // viewport called for (mobile guidance is larger than the 24px WCAG floor), so the
    // aggregation just sums. The per-capture threshold is echoed into the finding.
    const t = captures.reduce((a, x) => {
      a.i += x.targets?.interactive || 0;
      a.p += x.targets?.passing || 0;
      a.find.push(...(x.targets?.findings || []).map((f) => ({ ...f, viewport: x.label })));
      a.thresholds.add(x.targets?.minTargetPx ?? TH.minTargetPx);
      return a;
    }, { i: 0, p: 0, find: [], thresholds: new Set() });
    auto.A4 = { ratio: t.i ? t.p / t.i : null, matched: t.p, total: t.i, thresholds: [...t.thresholds] };
    for (const f of t.find.sort((a, b) => a.width * a.height - b.width * b.height).slice(0, 8)) {
      finding('A4', 'major', `Target ${f.width}×${f.height}px is below the ${f.required}×${f.required}px minimum`, {
        found: `${f.width}×${f.height}px`,
        expected: `${f.required}×${f.required}px`,
        where: [f.loc || f.selector],
        sample: f.label,
        viewport: f.viewport,
        fix: 'Grow the control or its padding. Icon-only buttons are the usual offenders.',
      });
    }
  }

  /* motion */
  {
    const durs = mergedTally('duration');
    const eases = mergedTally('easing');
    const dCov = scaleCoverage(durs, tokens.motion?.durations || [], 'M1', 'Transition duration', 'ms', 10);
    const eCov = setCoverage(eases, tokens.motion?.easings || [], 'M1', 'Easing', (x) => String(x).replace(/\s+/g, ''));
    const parts = [dCov.ratio, eCov.ratio].filter((r) => r != null);
    auto.M1 = { ratio: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null, detail: { dCov, eCov } };

    if (targetType === 'site') {
      const rm = captures.reduce((a, c) => a + (c.css?.reducedMotionRules || 0), 0);
      auto.M2 = { ratio: rm > 0 ? 1 : 0, detail: { reducedMotionRules: rm } };
      if (!rm) {
        finding('M2', 'major', 'No prefers-reduced-motion rule found', {
          found: '0 reduced-motion blocks in the readable stylesheets',
          expected: 'motion suppressed under the preference',
          fix: 'Add a reduced-motion block that skips the motion rather than shortening it.',
        });
      }
    } else {
      auto.M2 = { ratio: null, na: true, reason: 'runtime preference does not apply to a static frame' };
    }
  }

  /* ------------------------------------------------------------ assemble */

  function meta(chk) {
    return { id: chk.id, title: chk.title, description: chk.description, weight: chk.weight, blocker: !!chk.blocker, method: chk.method, fix: chk.fix };
  }

  // A check is "met" for the X-of-N headline at this much compliance. Blockers are
  // held to 100%: one text run below 4.5:1 means the page does not conform, however
  // good the other ninety-nine are.
  const PASS_DEFAULT = rubric.passThreshold?.default ?? 0.9;
  const PASS_BLOCKER = rubric.passThreshold?.blocker ?? 1.0;

  const unassessed = [];
  const dropped = [];
  const categories = [];
  let earnedTotal = 0, availableTotal = 0, applicableTotal = 0, checksPassed = 0, checksCounted = 0;
  const failedBlockers = [];

  /**
   * Evaluate one check. Extracted so CORE and EXTENDED checks go through identical
   * arithmetic — the only difference between them is which total they land in, and
   * that difference must not be able to hide a second implementation.
   *
   * Returns { row } always, plus { pts, weight } when the check was actually graded.
   */
  function evaluate(chk, { countCoverage }) {
    const applies = chk.applies_to === 'both' || chk.applies_to === targetType;
    const forcedNa = naList.includes(chk.id);
    const result = chk.method === 'auto' ? auto[chk.id] : judged[chk.id];

    // A check that does not apply to this KIND of target was never in scope, so it is
    // not a coverage gap — a Figma frame has no runtime motion preference.
    if (!applies) {
      return { row: { ...meta(chk), status: 'n/a', reason: `only applies to ${chk.applies_to} targets` } };
    }
    // Everything past this point could have been measured. Whether it was is the
    // coverage question, and every miss is recorded with its weight and its reason.
    if (countCoverage) applicableTotal += chk.weight;

    const miss = (kind, reason) => {
      if (countCoverage) dropped.push({ id: chk.id, weight: chk.weight, kind, reason });
      return { row: { ...meta(chk), status: kind === 'unassessed' ? 'unassessed' : 'n/a', reason } };
    };

    if (forcedNa) return miss('forced', 'marked N/A for this audit');
    if (chk.method === 'judged' && (!result || typeof result.ratio !== 'number')) {
      unassessed.push(chk.id);
      return miss('unassessed', 'judged check was never assessed');
    }
    if (!result || result.na || result.ratio == null) {
      return miss('unmeasurable', result?.reason || 'nothing of this kind present to measure');
    }

    // A judgement without a count is unfalsifiable: nobody can check 0.51 against
    // anything. Requiring the count is what let the button reading be challenged.
    let raw = result.ratio;
    if (chk.method === 'judged' && !allowUncountedJudged) {
      const c = result.counted;
      if (!c || !Number.isFinite(c.matched) || !Number.isFinite(c.total) || c.total <= 0) {
        throw new DgaError(
          'JUDGED_WITHOUT_COUNT',
          `${chk.id} was given a bare ratio (${result.ratio}) with no count. Supply ` +
            `counted: { matched, total } so the number can be checked, or set allowUncountedJudged.`,
          { checkId: chk.id }
        );
      }
      const implied = c.matched / c.total;
      if (Math.abs(implied - result.ratio) > 0.01) {
        throw new DgaError(
          'JUDGED_COUNT_MISMATCH',
          `${chk.id} states ratio ${result.ratio} but its count says ${c.matched}/${c.total} = ` +
            `${implied.toFixed(4)}. The number and the evidence for it have drifted apart.`,
          { checkId: chk.id, stated: result.ratio, implied }
        );
      }
      raw = implied;   // the count is the source of truth, not the rounded restatement
    }

    // Out of range means a counting bug upstream. Clamping it silently turns that
    // bug into a free perfect score, which is precisely how it would stay hidden.
    if (!Number.isFinite(raw) || raw < -1e-9 || raw > 1 + 1e-9) {
      throw new DgaError(
        'RATIO_OUT_OF_RANGE',
        `${chk.id} produced a ratio of ${raw}, which is not a fraction between 0 and 1. ` +
          'Something counted wrong; refusing to clamp it into a score.',
        { checkId: chk.id, ratio: raw }
      );
    }
    const ratio = Math.max(0, Math.min(1, raw));
    const pts = chk.scoring === 'binary' ? (ratio >= 1 ? chk.weight : 0) : chk.weight * ratio;
    const passAt = chk.blocker ? PASS_BLOCKER : PASS_DEFAULT;
    const passed = chk.scoring === 'binary' ? ratio >= 1 : ratio >= passAt;

    return {
      pts,
      weight: chk.weight,
      passed,
      row: {
        ...meta(chk),
        status: passed ? 'pass' : 'fail',
        ratio: round2(ratio),
        earned: round2(pts),
        available: chk.weight,
        measured: result.total != null ? { matched: result.matched, total: result.total } : undefined,
        notes: result.notes,
      },
    };
  }

  for (const cat of rubric.categories) {
    const outChecks = [];
    let earned = 0, available = 0;
    for (const chk of cat.checks) {
      // Extended checks measure practices nobody published. They are scored, but in
      // their own block — never in the 100, and never able to cap a band.
      if (chk.scope === 'extended') continue;
      const r = evaluate(chk, { countCoverage: true });
      outChecks.push(r.row);
      if (r.pts === undefined) continue;
      earned += r.pts;
      available += r.weight;
      checksCounted++;
      if (r.passed) checksPassed++;
      else if (chk.blocker) failedBlockers.push({ id: chk.id, title: chk.title, ratio: r.row.ratio });
    }
    earnedTotal += earned;
    availableTotal += available;
    categories.push({ id: cat.id, label: cat.label, weight: cat.weight, earned: round2(earned), available, checks: outChecks });
  }

  /* -------------------------------------------------------------- extended */

  // Scored the same way, reported apart. R2 (CSS logical properties) and M2
  // (prefers-reduced-motion) are good practice that DGA has never published in any
  // form — Figma cannot express either. Carrying them inside a government compliance
  // score meant 5 of the 100 points traced to nothing but my own opinion.
  const extRows = [];
  let extEarned = 0, extAvailable = 0, extPassed = 0;
  for (const cat of rubric.categories) {
    for (const chk of cat.checks) {
      if (chk.scope !== 'extended') continue;
      const r = evaluate(chk, { countCoverage: false });
      extRows.push({ ...r.row, category: cat.id });
      if (r.pts === undefined) continue;
      extEarned += r.pts;
      extAvailable += r.weight;
      if (r.passed) extPassed++;
    }
  }
  const extended = {
    label: 'Extended practice',
    note: 'Measured, but outside the 100: nothing here is published by DGA, so it carries no compliance weight and never caps a band.',
    earned: round2(extEarned),
    available: round2(extAvailable),
    score: extAvailable > 0 ? round2((extEarned / extAvailable) * 100) : null,
    checksPassed: extPassed,
    checksCounted: extRows.filter((r) => r.status === 'pass' || r.status === 'fail').length,
    checks: extRows,
  };

  if (unassessed.length && !allowUnassessed) {
    throw new DgaError(
      'UNASSESSED_JUDGED',
      `${unassessed.length} judged check(s) were never assessed: ${unassessed.join(', ')}. ` +
        'Assess them and pass them in, or set allowUnassessed. Refusing by default, because ' +
        'silently dropping the component checks is how a rebuild scores as compliant.',
      { unassessed }
    );
  }

  /* -------------------------------------------------------------- coverage */

  // The score is earned/available, so every check that drops out of `available`
  // makes the remaining ones count for more. Measuring LESS therefore raises the
  // number. That is not hypothetical: a capture once filed itself under the wrong
  // colour scheme, the entire 18-point colour category went n/a, and the site
  // scored HIGHER for never having been measured. Nothing warned, because nothing
  // was looking at the denominator.
  //
  // So the denominator is now part of the verdict, itemised, and there is a floor
  // under it. A number computed from a third of the rubric is not a lower-confidence
  // score — it is a different measurement wearing the same units.
  // Two kinds of gap, and they are not the same risk.
  //
  //   acknowledged — someone passed --na, or left a judged check unassessed. A
  //                  deliberate scope decision. An automated-only audit legitimately
  //                  skips all 27 points of judged checks; that is a real mode, not
  //                  an error, and it must stay possible.
  //   silent       — the engine could not measure something it expected to. Nobody
  //                  chose this and nobody will notice it. THIS is the dark-mode bug:
  //                  18 points of colour quietly became unmeasurable and the score
  //                  went UP. A budget on it turns that class of failure into a stop.
  //
  // So: refuse what nobody chose; label what someone did.
  const coveragePct = applicableTotal > 0 ? availableTotal / applicableTotal : 0;
  const minCoverage = rubric.thresholds?.minCoverage ?? 0.75;
  const maxSilent = rubric.thresholds?.maxSilentDropWeight ?? 15;
  const silent = dropped.filter((d) => d.kind === 'unmeasurable');
  const silentWeight = silent.reduce((a, d) => a + d.weight, 0);

  const coverage = {
    measuredWeight: round2(availableTotal),
    applicableWeight: round2(applicableTotal),
    pct: round2(coveragePct * 100),
    floor: round2(minCoverage * 100),
    silentWeight: round2(silentWeight),
    silentBudget: maxSilent,
    dropped: dropped.sort((a, b) => b.weight - a.weight),
  };

  if (silentWeight > maxSilent && !allowLowCoverage) {
    throw new DgaError(
      'SILENT_COVERAGE_LOSS',
      `${round2(silentWeight)} points of the rubric could not be measured at all, over a budget of ` +
        `${maxSilent}: ` + silent.map((d) => `${d.id} (${d.weight}pt, ${d.reason})`).join('; ') +
        '. Nobody asked for these to be skipped, so this is a broken capture rather than a ' +
        'scoping decision — and because the score is earned/available, a broken capture reads ' +
        'as a better site. Fix the capture, or set allowLowCoverage to score it anyway.',
      { coverage }
    );
  }

  const finalScore = availableTotal > 0 ? round2((earnedTotal / availableTotal) * 100) : 0;

  let band = rubric.bands.find((b) => finalScore >= b.min) || rubric.bands[rubric.bands.length - 1];
  const capIndex = rubric.bands.findIndex((b) => b.id === rubric.blockerCapBand);
  let cappedFrom = null;
  const capReasons = [];
  const capTo = (why) => {
    const at = rubric.bands.findIndex((b) => b.id === band.id);
    capReasons.push(why);
    if (at < capIndex) { cappedFrom = cappedFrom ?? band.label; band = rubric.bands[capIndex]; }
  };
  if (failedBlockers.length) capTo(`${failedBlockers.length} blocker check(s) failed`);
  // Thin evidence caps the band too. Either gate counts: coverage below the floor, or
  // a silent loss that was forced through. A verdict standing on 60% of the rubric
  // cannot claim a band the other 40% never had a chance to disprove.
  if (coveragePct < minCoverage) capTo(`only ${coverage.pct}% of the rubric was measured`);
  if (silentWeight > maxSilent) capTo(`${round2(silentWeight)} points could not be measured at all`);
  const provisional = coveragePct < minCoverage || silentWeight > maxSilent;

  // R2 and M2 still produce real observations, but they are not compliance failures.
  // Stamping the scope onto each finding is what stops a renderer presenting an
  // extended note beside a WCAG blocker as though they carried the same authority.
  const scopeOf = new Map();
  for (const cat of rubric.categories) for (const chk of cat.checks) scopeOf.set(chk.id, chk.scope || 'core');
  for (const f of findings) f.scope = scopeOf.get(f.checkId) || 'core';

  const severityRank = { blocker: 0, major: 1, minor: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (b.occurrences || 0) - (a.occurrences || 0));

  const verdict = {
    schema: 'dga-score/1',
    standard: rubric.standard,
    target: {
      name: targetName,
      url: targetUrl,
      type: targetType,
      captures: captures.map((c) => ({ label: c.label, viewport: c.viewport, colorScheme: c.colorScheme, url: c.url })),
    },
    ledger: { synced: tokens.synced, source: tokens.source, dgaVersion: tokens.dgaVersion || null },
    scoredAt: new Date().toISOString(),
    score: finalScore,
    earned: round2(earnedTotal),
    available: availableTotal,
    checksPassed,
    checksCounted,
    checksTotal: rubric.categories.reduce((a, c) => a + c.checks.length, 0),
    band: { id: band.id, label: band.label },
    cappedFrom,
    capReasons,
    coverage,
    provisional,
    failedBlockers,
    unassessed,
    parts: rollUpParts(rubric, categories, findings, round2),
    extended,
    categories,
    findings,
  };

  // A reference reading, so the number has something to be read against. Attached
  // last because it is computed FROM the finished verdict. Context only: the band
  // still comes from the absolute score against the ledger.
  verdict.reference = benchmarks ? compareToBenchmark(verdict, benchmarks, { id: benchmarkId, viewport: benchmarkViewport }) : null;
  return verdict;
}

/* ---------------------------------------------------------------- parts */

/**
 * Roll the nine categories up into the parts DGA actually publishes, so a score
 * can be read against the part of the system it belongs to.
 *
 * Each part is normalised to 100 within its own available weight. That makes
 * them comparable to each other and to the overall — 40/58 and 12/24 are hard to
 * weigh by eye, 69 and 50 are not. `weightedShare` keeps the raw points, because
 * that is what says which part is actually costing the most.
 */
export function rollUpParts(rubric, categories, findings, round2 = (n) => Math.round(n * 100) / 100) {
  const defs = rubric.parts || [];
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const findingsByCheck = new Map();
  for (const f of findings) {
    if (!findingsByCheck.has(f.checkId)) findingsByCheck.set(f.checkId, []);
    findingsByCheck.get(f.checkId).push(f);
  }

  return defs.map((def) => {
    const cats = rubric.categories.filter((c) => c.part === def.id).map((c) => byId[c.id]).filter(Boolean);
    const earned = cats.reduce((a, c) => a + c.earned, 0);
    const available = cats.reduce((a, c) => a + c.available, 0);
    const checks = cats.flatMap((c) => c.checks);
    const graded = checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    const failed = graded.filter((k) => k.status === 'fail');
    return {
      id: def.id,
      label: def.label,
      source: def.source,
      covers: def.covers,
      weight: def.weight,
      earned: round2(earned),
      available: round2(available),
      // null, not 0, when nothing in the part could be measured — a part with no
      // applicable checks has no score, and 0 would read as total failure.
      score: available > 0 ? round2((earned / available) * 100) : null,
      weightedShare: round2(earned),
      checksPassed: graded.filter((k) => k.status === 'pass').length,
      checksCounted: graded.length,
      categories: cats.map((c) => c.id),
      // What it would take to make this part whole, biggest win first.
      recoverable: failed
        .map((k) => ({
          checkId: k.id,
          title: k.title,
          points: round2((k.available ?? k.weight) - (k.earned ?? 0)),
          ratio: k.ratio ?? null,
          blocker: !!k.blocker,
          fix: k.fix,
          findings: (findingsByCheck.get(k.id) || []).length,
        }))
        .sort((a, b) => b.points - a.points),
      failedBlockers: failed.filter((k) => k.blocker).map((k) => k.id),
    };
  });
}

/* ---------------------------------------------------------------- region */

/**
 * A location can arrive as a bare CSS path (older captures, and the parity fixture) or
 * as a full locator. Normalising both here is what lets the region view work without
 * invalidating a single stored capture.
 */
export function asLocator(x) {
  if (!x) return null;
  if (typeof x === 'string') return { sel: x, region: null, section: null, name: null, at: null };
  return { sel: x.sel ?? x.selector ?? null, region: x.region ?? null, section: x.section ?? null,
           name: x.name ?? null, at: x.at ?? null };
}

/**
 * Where on the page did the points go?
 *
 * "P1 lost 4.84" is true and unusable. This groups every finding by the part of the page
 * it sits in — header, navigation, main, footer, and the named section within it — so the
 * answer becomes "the service cards in «الخدمات الأكثر استخداماً»".
 *
 * IMPORTANT, and stated in the output as well as here: the per-row points are an
 * APPORTIONMENT, not a measurement. Points are computed per check across the whole page;
 * a check that lost X points over findings totalling M occurrences contributes
 * X x (occurrences / M) to each. That is a reasonable split, but it is arithmetic laid on
 * top of a measurement, and printing it as though it were measured would be exactly the
 * proxy-for-the-real-thing mistake this rubric has been cleaned of. Hence `pointsApprox`,
 * and the ~ in every renderer.
 */
export function byRegion(verdict, { maxRowsPerSection = 8 } = {}) {
  if (!verdict || !Array.isArray(verdict.categories)) return [];
  const round2 = (n) => Math.round(n * 100) / 100;

  const lostFor = new Map();
  for (const k of verdict.categories.flatMap((c) => c.checks)) {
    if (k.status === 'fail') lostFor.set(k.id, (k.available ?? k.weight ?? 0) - (k.earned ?? 0));
  }
  const occFor = new Map();
  for (const f of verdict.findings || []) {
    if (!lostFor.has(f.checkId)) continue;
    occFor.set(f.checkId, (occFor.get(f.checkId) || 0) + (f.occurrences || 1));
  }

  const groups = new Map();
  for (const f of verdict.findings || []) {
    const lost = lostFor.get(f.checkId);
    if (lost === undefined) continue;
    const locs = (f.where || []).map(asLocator).filter(Boolean);
    const head = locs[0] || {};
    const occ = f.occurrences || 1;
    // Three states, not two. "unplaced" is only honest when NOTHING resolved; an
    // element that sits outside every landmark but under a heading is on the page and
    // findable, and filing it as unplaced throws away the section that was found.
    const section = head.section || null;
    const region = head.region || (section ? 'page' : 'unplaced');
    const key = region + '\u0000' + (section || '');
    if (!groups.has(key)) groups.set(key, { region, section, points: 0, rows: [] });
    const g = groups.get(key);
    const pts = round2(lost * (occ / (occFor.get(f.checkId) || 1)));
    g.points = round2(g.points + pts);
    g.rows.push({
      checkId: f.checkId, severity: f.severity, summary: f.summary,
      found: f.found ?? null, expected: f.expected ?? null,
      occurrences: occ, pointsApprox: pts,
      elements: locs.slice(0, 4).map((l) => ({ name: l.name, sel: l.sel, at: l.at })),
      fix: f.fix ?? null,
    });
  }

  const ORDER = ['header', 'navigation', 'search', 'main', 'form', 'aside', 'footer', 'page', 'unplaced'];
  return [...groups.values()]
    .map((g) => ({ ...g, rows: g.rows.sort((a, b) => b.pointsApprox - a.pointsApprox).slice(0, maxRowsPerSection) }))
    .sort((a, b) => {
      const d = ORDER.indexOf(a.region) - ORDER.indexOf(b.region);
      return d !== 0 ? d : b.points - a.points;
    });
}

/**
 * A reference reading from data/benchmarks.json, so a score has something to be read
 * against. dga.gov.sa is the publisher's own site: useful context, and explicitly NOT a
 * definition of compliance — the band still comes from the absolute score against the
 * ledger. A comparison is only drawn where BOTH sides measured the check; showing a real
 * reading against a blank would invent a win.
 */
export function compareToBenchmark(verdict, benchmarks, { id = null, viewport = 'web' } = {}) {
  const site = (benchmarks?.sites || []).find((x) => (id ? x.id === id : true));
  if (!site) return null;
  const ref = site.viewports?.[viewport] || null;
  if (!ref) return null;
  const mine = new Map();
  for (const k of verdict.categories.flatMap((c) => c.checks)) {
    if (k.ratio != null && (k.status === 'pass' || k.status === 'fail')) mine.set(k.id, k.ratio);
  }
  const checks = [];
  for (const [cid, ratio] of mine) {
    const theirs = ref.checks?.[cid];
    checks.push({
      id: cid, mine: ratio,
      reference: typeof theirs === 'number' ? theirs : null,
      comparable: typeof theirs === 'number',
      whyNot: typeof theirs === 'number' ? null
        : (site.notMeasured || []).includes(cid) ? 'the reference site has no reading for this check' : 'not present in the reference',
    });
  }
  return {
    id: site.id, label: site.label, auditedAt: site.auditedAt,
    dgaVersion: site.dgaVersion ?? null, viewport,
    score: ref.score ?? null,
    delta: ref.score == null ? null : round2delta(verdict.score - ref.score),
    caveats: site.caveats || [],
    checks: checks.sort((a, b) => (a.comparable === b.comparable ? 0 : a.comparable ? -1 : 1)),
    basis: 'context, not a threshold — the band still comes from the absolute score against the ledger',
  };
}
const round2delta = (n) => Math.round(n * 100) / 100;

/* --------------------------------------------------------------- explain */

/**
 * Why is this score what it is, and what would raise it?
 *
 * Answers a question about the whole verdict, one part, or one check, always in
 * the same shape: what was lost, why, and what recovers it. Points are the
 * ordering, because "fix this and gain 5" is actionable in a way that "this
 * failed" is not.
 *
 *   explain(verdict)                    -> the whole thing, worst first
 *   explain(verdict, { part: 'foundations' })
 *   explain(verdict, { check: 'T1' })
 */
export function explain(verdict, { part = null, check = null, maxFindings = 6 } = {}) {
  if (verdict && verdict.schema === 'dga-score-split/1') {
    return {
      scope: 'split',
      viewports: verdict.viewports
        .filter((v) => v.captured)
        .map((v) => ({ id: v.id, label: v.label, ...explain(v.verdict, { part, check, maxFindings }) })),
    };
  }

  const allChecks = verdict.categories.flatMap((c) => c.checks);
  const byCheck = (id) => allChecks.find((k) => k.id === id);

  if (check) {
    const k = byCheck(check);
    if (!k) return { scope: 'check', checkId: check, error: `No check ${check} in this rubric.` };
    const fs = verdict.findings.filter((f) => f.checkId === check);
    return {
      scope: 'check', checkId: k.id, title: k.title, status: k.status,
      description: k.description,
      lost: k.status === 'fail' ? Math.round(((k.available ?? k.weight) - (k.earned ?? 0)) * 100) / 100 : 0,
      of: k.available ?? k.weight,
      ratio: k.ratio ?? null,
      measured: k.measured ?? null,
      reason: k.reason ?? null,
      notes: k.notes ?? null,
      blocker: !!k.blocker,
      why: fs.length
        ? fs.slice(0, maxFindings).map((f) => ({
            summary: f.summary, found: f.found, expected: f.expected,
            occurrences: f.occurrences ?? 1, where: (f.where || []).slice(0, 3),
          }))
        : (k.notes ? [{ summary: k.notes, assessed: true }] : []),
      moreFindings: Math.max(0, fs.length - maxFindings),
      fix: k.fix,
    };
  }

  const parts = verdict.parts || [];
  const scope = part ? parts.filter((p) => p.id === part) : parts;
  if (part && !scope.length) return { scope: 'part', part, error: `No part "${part}". Try: ${parts.map((p) => p.id).join(', ')}.` };

  return {
    scope: part ? 'part' : 'verdict',
    score: verdict.score,
    band: verdict.band,
    parts: scope.map((p) => ({
      id: p.id, label: p.label, score: p.score, earned: p.earned, available: p.available,
      checksPassed: p.checksPassed, checksCounted: p.checksCounted,
      lost: Math.round((p.available - p.earned) * 100) / 100,
      recoverable: p.recoverable.map((r) => {
        const fs = verdict.findings.filter((f) => f.checkId === r.checkId);
        const k = byCheck(r.checkId);
        return {
          ...r,
          // Judged checks produce a stated count in `notes` rather than findings,
          // so a "why" that only read findings came back empty on exactly the
          // checks a person is most likely to ask about.
          why: fs.length
            ? fs.slice(0, 3).map((f) => ({ summary: f.summary, found: f.found, expected: f.expected, occurrences: f.occurrences ?? 1 }))
            : (k?.notes ? [{ summary: k.notes, assessed: true }] : []),
        };
      }),
    })),
  };
}

/* --------------------------------------------------------- split by viewport */

/**
 * Score web and mobile SEPARATELY rather than as one blended number.
 *
 * Merging the two hides exactly what matters most. A4 target sizes and S2
 * containers are properties of a viewport, not of a site: a page can pass at
 * 1440 and fail at 390, and averaging the two produces a figure describing
 * neither. Two numbers say where the problem is; one says only that there is one.
 *
 * `score()` is untouched and still takes whatever captures it is given — this
 * groups and calls it twice, so every existing guarantee, including the
 * regression fixture, holds unchanged.
 */
export function scoreByViewport({ rubric, tokens, benchmarks = null, captures = [], judged = {}, options = {} }) {
  // The split point is the ledger's own desktop breakpoint, not a number picked
  // here — if DGA moves it, this moves with it.
  const bps = (tokens.breakpoints && tokens.breakpoints.list) || [];
  const webMin = bps.filter((b) => b.min > 0).map((b) => b.min).sort((a, b) => a - b)[0] ?? 768;

  // A capture with no width used to fall through `?? 0` and land silently in Mobile,
  // where it polluted a viewport it was never taken at. Same shape as the bug that
  // filed captures under the wrong colour scheme: a missing field quietly became a
  // real-looking value. Refuse it instead.
  const widthless = captures.filter((c) => !Number.isFinite(c.viewport?.width));
  if (widthless.length) {
    throw new DgaError(
      'CAPTURE_WITHOUT_VIEWPORT',
      `${widthless.length} capture(s) carry no viewport width: ` +
        `${widthless.map((c) => c.label || '(unlabelled)').join(', ')}. ` +
        'A viewport split cannot place them, and defaulting them to mobile would ' +
        'report findings against a width they were never taken at.',
      { labels: widthless.map((c) => c.label ?? null) }
    );
  }

  const groups = [
    { id: 'web', label: 'Web', match: (c) => c.viewport.width >= webMin },
    { id: 'mobile', label: 'Mobile', match: (c) => c.viewport.width < webMin },
  ];

  const viewports = groups.map((g) => {
    const caps = captures.filter(g.match);
    if (!caps.length) {
      return { id: g.id, label: g.label, captured: false, captures: [], verdict: null,
        note: `No ${g.label.toLowerCase()} capture was taken, so nothing is reported for it. This is a gap in the audit, not a pass.` };
    }
    return {
      id: g.id, label: g.label, captured: true,
      captures: caps.map((c) => ({ label: c.label, width: c.viewport?.width ?? null })),
      // benchmarkViewport is the group's own id, so a mobile reading is never compared
      // against a desktop reference.
      verdict: score({ rubric, tokens, benchmarks, captures: caps, judged, options: { ...options, benchmarkViewport: g.id } }),
    };
  });

  const scored = viewports.filter((v) => v.captured);

  // A site-level figure, taken as the WORST viewport rather than an average.
  // Averaging would let a strong desktop hide a failing phone, which is the
  // blur the split exists to remove; a gate takes the weakest reading. Named
  // `overall` because that is what it answers, and `basis` says how, so nobody
  // has to assume it is a mean.
  const worst = scored.length
    ? scored.reduce((a, b) => (b.verdict.score < a.verdict.score ? b : a))
    : null;

  // Part scores across the site follow the same rule, part by part: a part is
  // only as compliant as its weakest viewport.
  const partIds = (rubric.parts || []).map((p) => p.id);
  const overallParts = partIds.map((id) => {
    const rows = scored.map((v) => ({ v, p: (v.verdict.parts || []).find((x) => x.id === id) })).filter((r) => r.p && r.p.score != null);
    if (!rows.length) return { id, label: (rubric.parts.find((p) => p.id === id) || {}).label, score: null, note: 'not measurable in any captured viewport' };
    const w = rows.reduce((a, b) => (b.p.score < a.p.score ? b : a));
    return {
      id, label: w.p.label, score: w.p.score, from: w.v.id,
      byViewport: rows.map((r) => ({ viewport: r.v.id, score: r.p.score, earned: r.p.earned, available: r.p.available })),
    };
  });

  return {
    schema: 'dga-score-split/1',
    standard: rubric.standard,
    target: { name: options.targetName ?? '(unnamed target)', url: options.targetUrl ?? null, type: options.targetType ?? 'site' },
    ledger: { synced: tokens.synced, dgaVersion: tokens.dgaVersion || null },
    scoredAt: new Date().toISOString(),
    breakpoint: webMin,
    viewports,
    overall: worst
      ? {
          score: worst.verdict.score,
          band: worst.verdict.band,
          cappedFrom: worst.verdict.cappedFrom,
          from: worst.id,
          basis: 'worst viewport, not an average — a site is only as compliant as its weakest viewport',
          parts: overallParts,
          incomplete: scored.length < viewports.length
            ? `Only ${scored.map((v) => v.label.toLowerCase()).join(' and ')} was captured, so this is not a full site reading.`
            : null,
        }
      : null,
  };
}

/* ------------------------------------------------------------- inline out */

/** Compact markdown for a chat reply — the default result format. */
export function inlineReport(v, { maxFindings = 3 } = {}) {
  // A split carries no score of its own; report each viewport in turn.
  if (v && v.schema === 'dga-score-split/1') return inlineSplitReport(v, { maxFindings });
  const L = [];
  L.push(`**${v.target.name} — ${v.score}/100 · ${v.checksPassed} of ${v.checksCounted} checks met · ${v.band.label}**`);
  if (v.cappedFrom) {
    L.push(`> Capped from **${v.cappedFrom}** by ${(v.capReasons || []).join('; ') || v.failedBlockers.map((b) => `\`${b.id}\` ${b.title}`).join(', ')}. ` +
      `A service cannot be reported as compliant while failing these.`);
  }
  // The denominator, stated. A score off 60% of the rubric is a different measurement
  // from a score off all of it, and the reader cannot tell them apart from the number.
  const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  if (v.reference && v.reference.score != null) {
    const d = v.reference.delta;
    L.push(`> Reference: **${v.reference.label}** scores **${v.reference.score}** on the same rubric` +
      ` (${v.reference.viewport}${v.reference.dgaVersion ? `, DGA ${v.reference.dgaVersion}` : ''}) — ` +
      `you are **${d == null ? '?' : d >= 0 ? `+${d}` : d}**. ${v.reference.basis}.`);
  }
  if (v.extended && v.extended.score != null) {
    const failed = v.extended.checks.filter((k) => k.status === 'fail').map((k) => `\`${k.id}\` ${k.title}`);
    L.push(`> Extended practice, **outside the 100**: ${v.extended.score}/100` +
      `${failed.length ? ` — ${failed.join(', ')}` : ' — all clear'}. DGA publishes none of this, so it carries no compliance weight.`);
  }
  if (v.coverage && v.coverage.pct < 100) {
    const worst3 = v.coverage.dropped.slice(0, 3).map((d) => `\`${d.id}\` ${d.reason}`).join(', ');
    L.push(`> Measured **${v.coverage.pct}%** of the rubric (${v.coverage.measuredWeight} of ${v.coverage.applicableWeight} points).` +
      ` Not measured: ${worst3}${v.coverage.dropped.length > 3 ? `, +${v.coverage.dropped.length - 3} more` : ''}.` +
      (v.provisional ? ' **Provisional** — below the evidence floor.' : ''));
  }
  L.push('');
  if (v.parts?.length) {
    L.push('| Part | Score | Points | Checks met |');
    L.push('| --- | --- | --- | --- |');
    for (const p of v.parts) {
      L.push(`| **${p.label}** | ${p.score == null ? 'n/a' : `${p.score}/100`} | ${p.earned}/${p.available} | ${p.checksPassed} of ${p.checksCounted} |`);
    }
    L.push('');
  }
  L.push('| Category | Points |');
  L.push('| --- | --- |');
  for (const c of v.categories) {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    L.push(`| ${c.label} | ${graded.length ? `${c.earned}/${c.available}` : 'n/a'} |`);
  }
  /* ------------------------------------------- where the points went ---- */

  // The question the old report could not answer. "P1 lost 4.84" is true and useless;
  // this says which part of the page it happened in and what to look for there.
  const regions = byRegion(v, { maxRowsPerSection: 4 });
  if (regions.length) {
    L.push('');
    L.push('**Where the points went** — by where it sits on the page.');
    L.push('_Points are ≈apportioned across a check\'s findings by occurrence, not measured per element._');
    L.push('');
    L.push('| Where | What | Found → expected | ≈pts |');
    L.push('| --- | --- | --- | --: |');
    for (const g of regions.slice(0, 7)) {
      const place = g.section ? `${g.region} · ${g.section}` : g.region;
      L.push(`| **${cell(place)}** | | | **≈${g.points}** |`);
      for (const r of g.rows) {
        const named = r.elements.map((e) => e.name).filter(Boolean).slice(0, 2).map((n) => `«${cell(n)}»`).join(' ');
        const who = named || (r.elements[0]?.sel ? `\`${cell(r.elements[0].sel)}\`` : '—');
        const val = r.found
          ? `\`${cell(r.found)}\`${r.expected ? ` → \`${cell(r.expected)}\`` : ''}`
          : '';
        L.push(`| ${who} | \`${r.checkId}\` ${cell(r.summary)}${r.occurrences > 1 ? ` ×${r.occurrences}` : ''} | ${val} | ≈${r.pointsApprox} |`);
      }
    }
  }

  // One row per failing check, not per finding. A page with 40 invisible borders
  // produces 40 near-identical A2 findings, and listing the same sentence three
  // times is noise — the count is the useful part, and the fix is one fix.
  const byCheck = new Map();
  for (const f of v.findings) {
    if (f.severity === 'minor') continue;
    const e = byCheck.get(f.checkId);
    if (e) { e.n++; continue; }
    byCheck.set(f.checkId, { ...f, n: 1 });
  }
  // Rank by what would actually move the score: points still on the table.
  const lost = new Map();
  for (const c of v.categories) for (const k of c.checks) {
    if (k.status === 'fail') lost.set(k.id, (k.available ?? k.weight) - (k.earned ?? 0));
  }
  const top = [...byCheck.values()]
    .sort((a, b) => (lost.get(b.checkId) ?? 0) - (lost.get(a.checkId) ?? 0))
    .slice(0, maxFindings);
  if (top.length) {
    L.push('');
    L.push(`**Top ${top.length} to fix**`);
    top.forEach((f, i) => {
      const pts = lost.get(f.checkId);
      const worth = pts ? ` _(+${Math.round(pts * 10) / 10} pts)_` : '';
      const at = (f.where || []).map(asLocator).filter(Boolean)[0];
      const place = at && (at.region || at.section)
        ? ` _[${[at.region, at.section].filter(Boolean).join(' · ')}${at.name ? ` — «${at.name}»` : ''}]_`
        : '';
      L.push(`${i + 1}. \`${f.checkId}\`${f.n > 1 ? ` ×${f.n}` : ''} ${f.summary}${worth}${place} — ${f.fix}`);
    });
  }
  const na = v.categories.flatMap((c) => c.checks).filter((k) => k.status === 'n/a');
  if (na.length) L.push('', `_Not applicable: ${na.map((k) => k.id).join(', ')} — these leave the denominator rather than counting as failures._`);
  return L.join('\n');
}

/**
 * Two results, side by side. No combined figure: a single number across both
 * viewports is what this split exists to stop producing.
 */
export function inlineSplitReport(split, { maxFindings = 3 } = {}) {
  const L = [];
  L.push(`**${split.target.name}** — scored separately per viewport (split at ${split.breakpoint}px, the DGA desktop breakpoint).`);
  L.push('');

  const scored = split.viewports.filter((v) => v.captured);
  if (split.overall) {
    L.push(`**Overall ${split.overall.score}/100 · ${split.overall.band.label}** — the ${split.overall.from} reading, which is the weaker one. Not an average: a site is only as compliant as its weakest viewport.`);
    if (split.overall.incomplete) L.push(`> ⚠ ${split.overall.incomplete}`);
    L.push('');
  }
  if (scored.length) {
    // Parts across viewports, which is the table most questions are actually about.
    const partIds = (split.overall?.parts || []).map((p) => p.id);
    if (partIds.length) {
      L.push(`| Part | ${scored.map((v) => v.label).join(' | ')} | Overall |`);
      L.push(`| --- | ${scored.map(() => '---').join(' | ')} | --- |`);
      for (const op of split.overall.parts) {
        const cells = scored.map((v) => {
          const p = (v.verdict.parts || []).find((x) => x.id === op.id);
          return p && p.score != null ? `${p.score}` : 'n/a';
        });
        L.push(`| **${op.label}** | ${cells.join(' | ')} | ${op.score == null ? 'n/a' : `**${op.score}**`} |`);
      }
      L.push('');
    }
    L.push('| Viewport | Score | Checks met | Band |');
    L.push('| --- | --- | --- | --- |');
    for (const v of scored) {
      const d = v.verdict;
      L.push(`| **${v.label}** ${v.captures.map((c) => `${c.width}px`).join(', ')} | ${d.score}/100 | ${d.checksPassed} of ${d.checksCounted} | ${d.band.label}${d.cappedFrom ? ` _(capped from ${d.cappedFrom})_` : ''} |`);
    }
  }
  for (const v of split.viewports.filter((x) => !x.captured)) {
    L.push('', `⚠ **${v.label}** — ${v.note}`);
  }

  for (const v of scored) {
    L.push('', `### ${v.label}`, '', inlineReport(v.verdict, { maxFindings }));
  }
  L.push('', `_Ledger ${split.ledger.synced}${split.ledger.dgaVersion ? `, DGA ${split.ledger.dgaVersion}` : ''}._`);
  return L.join('\n');
}
