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

export function score({ rubric, tokens, captures = [], judged = {}, options = {} }) {
  const {
    targetType = 'site',
    targetName = '(unnamed target)',
    targetUrl = null,
    na: naList = [],
    allowUnassessed = false,
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
    const nums = (s) => (String(s).match(/-?\d*\.?\d+/g) || []).map(Number);
    let matched = 0;
    const offenders = [];
    for (const r of rows) {
      const a = nums(r.value);
      const hit = tokenShadows.some(([, v]) => {
        const b = nums(v);
        if (a.length !== b.length) return false;
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

  const darkCaptures = captures.filter((c) => c.colorScheme === 'dark' || c.documentDark);
  const lightOnly = (c) => !(c.colorScheme === 'dark' || c.documentDark);
  const darkOnly = (c) => c.colorScheme === 'dark' || c.documentDark;

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
    const fams = mergedTally('fontFamily');
    const allowed = [...(tokens.typography?.families?.latin || []), ...(tokens.typography?.families?.arabic || [])];
    auto.T1 = setCoverage(fams, allowed, 'T1', 'Font family', (x) => String(x).toLowerCase().replace(/["']/g, '').trim());

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
          found: `${css.physical} physical vs ${css.logical} logical`,
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
        where: [f.selector],
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
        where: [f.selector],
        fix: 'An input whose border disappears against its background is not usable at low vision or in sunlight.',
      });
    }

    if (targetType === 'site') {
      const f = captures.reduce((a, x) => {
        a.probed += x.focus?.probed || 0;
        a.visible += x.focus?.visible || 0;
        a.missing.push(...(x.focus?.missing || []));
        return a;
      }, { probed: 0, visible: 0, missing: [] });
      auto.A3 = { ratio: f.probed ? f.visible / f.probed : null, matched: f.visible, total: f.probed };
      if (f.missing.length) {
        // Count from probed-minus-visible, never from missing.length — the probe caps
        // its missing[] sample at 20 per capture, so that array understates the failure
        // on any page with more than 20 unfocusable controls.
        finding('A3', 'major', `${f.probed - f.visible} of ${f.probed} probed controls show no focus indicator`, {
          found: `${f.probed - f.visible} controls unchanged on focus`,
          expected: 'a visible indicator on every interactive element',
          where: f.missing.slice(0, 8).map((m) => m.selector),
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
        where: [f.selector],
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
  const categories = [];
  let earnedTotal = 0, availableTotal = 0, checksPassed = 0, checksCounted = 0;
  const failedBlockers = [];

  for (const cat of rubric.categories) {
    const outChecks = [];
    let earned = 0, available = 0;
    for (const chk of cat.checks) {
      const applies = chk.applies_to === 'both' || chk.applies_to === targetType;
      const forcedNa = naList.includes(chk.id);
      const result = chk.method === 'auto' ? auto[chk.id] : judged[chk.id];

      if (!applies || forcedNa) {
        outChecks.push({ ...meta(chk), status: 'n/a', reason: forcedNa ? 'marked N/A for this audit' : `only applies to ${chk.applies_to} targets` });
        continue;
      }
      if (chk.method === 'judged' && (!result || typeof result.ratio !== 'number')) {
        unassessed.push(chk.id);
        outChecks.push({ ...meta(chk), status: 'unassessed' });
        continue;
      }
      if (!result || result.na || result.ratio == null) {
        outChecks.push({ ...meta(chk), status: 'n/a', reason: result?.reason || 'nothing of this kind present to measure' });
        continue;
      }

      const ratio = Math.max(0, Math.min(1, result.ratio));
      const pts = chk.scoring === 'binary' ? (ratio >= 1 ? chk.weight : 0) : chk.weight * ratio;
      earned += pts;
      available += chk.weight;
      checksCounted++;
      const passAt = chk.blocker ? PASS_BLOCKER : PASS_DEFAULT;
      const passed = chk.scoring === 'binary' ? ratio >= 1 : ratio >= passAt;
      if (passed) checksPassed++;
      else if (chk.blocker) failedBlockers.push({ id: chk.id, title: chk.title, ratio: round2(ratio) });

      outChecks.push({
        ...meta(chk),
        status: passed ? 'pass' : 'fail',
        ratio: round2(ratio),
        earned: round2(pts),
        available: chk.weight,
        measured: result.total != null ? { matched: result.matched, total: result.total } : undefined,
        notes: result.notes,
      });
    }
    earnedTotal += earned;
    availableTotal += available;
    categories.push({ id: cat.id, label: cat.label, weight: cat.weight, earned: round2(earned), available, checks: outChecks });
  }

  if (unassessed.length && !allowUnassessed) {
    throw new DgaError(
      'UNASSESSED_JUDGED',
      `${unassessed.length} judged check(s) were never assessed: ${unassessed.join(', ')}. ` +
        'Assess them and pass them in, or set allowUnassessed. Refusing by default, because ' +
        'silently dropping the component checks is how a rebuild scores as compliant.',
      { unassessed }
    );
  }

  const finalScore = availableTotal > 0 ? round2((earnedTotal / availableTotal) * 100) : 0;

  let band = rubric.bands.find((b) => finalScore >= b.min) || rubric.bands[rubric.bands.length - 1];
  const capIndex = rubric.bands.findIndex((b) => b.id === rubric.blockerCapBand);
  const bandIndex = rubric.bands.findIndex((b) => b.id === band.id);
  let cappedFrom = null;
  if (failedBlockers.length && bandIndex < capIndex) {
    cappedFrom = band.label;
    band = rubric.bands[capIndex];
  }

  const severityRank = { blocker: 0, major: 1, minor: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (b.occurrences || 0) - (a.occurrences || 0));

  return {
    schema: 'dga-score/1',
    standard: rubric.standard,
    target: {
      name: targetName,
      url: targetUrl,
      type: targetType,
      captures: captures.map((c) => ({ label: c.label, viewport: c.viewport, colorScheme: c.colorScheme, url: c.url })),
    },
    ledger: { synced: tokens.synced, source: tokens.source },
    scoredAt: new Date().toISOString(),
    score: finalScore,
    earned: round2(earnedTotal),
    available: availableTotal,
    checksPassed,
    checksCounted,
    checksTotal: rubric.categories.reduce((a, c) => a + c.checks.length, 0),
    band: { id: band.id, label: band.label },
    cappedFrom,
    failedBlockers,
    unassessed,
    categories,
    findings,
  };
}

/* ------------------------------------------------------------- inline out */

/** Compact markdown for a chat reply — the default result format. */
export function inlineReport(v, { maxFindings = 3 } = {}) {
  const L = [];
  L.push(`**${v.target.name} — ${v.score}/100 · ${v.checksPassed} of ${v.checksCounted} checks met · ${v.band.label}**`);
  if (v.cappedFrom) {
    L.push(`> Capped from **${v.cappedFrom}** by ${v.failedBlockers.map((b) => `\`${b.id}\` ${b.title}`).join(', ')}. ` +
      `A service cannot be reported as compliant while failing these.`);
  }
  L.push('');
  L.push('| Category | Points |');
  L.push('| --- | --- |');
  for (const c of v.categories) {
    const graded = c.checks.filter((k) => k.status === 'pass' || k.status === 'fail');
    L.push(`| ${c.label} | ${graded.length ? `${c.earned}/${c.available}` : 'n/a'} |`);
  }
  const top = v.findings.filter((f) => f.severity !== 'minor').slice(0, maxFindings);
  if (top.length) {
    L.push('');
    L.push(`**Top ${top.length} to fix**`);
    top.forEach((f, i) => L.push(`${i + 1}. \`${f.checkId}\` ${f.summary} — ${f.fix}`));
  }
  const na = v.categories.flatMap((c) => c.checks).filter((k) => k.status === 'n/a');
  if (na.length) L.push('', `_Not applicable: ${na.map((k) => k.id).join(', ')} — these leave the denominator rather than counting as failures._`);
  return L.join('\n');
}
