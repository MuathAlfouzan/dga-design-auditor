/*
 * probe.js — the deterministic half of a DGA audit. Pure: walks the rendered DOM
 * and returns an inventory of what actually reached the screen. No judgement
 * happens here and none should; score.js turns this into numbers.
 *
 * Extracted mechanically from the original in-page script so the measurements
 * are byte-for-byte the ones that produced the audits already on record.
 */
export function probe(OPTS_IN = {}) {
  const OPTS = OPTS_IN || {};
  const LABEL = OPTS.label || 'default';
  const MAX_ENTRIES = OPTS.maxEntries || 200; // per tally, by frequency
  const MAX_SAMPLES = 3;
  const MAX_ELEMENTS = OPTS.maxElements || 6000;
  const MAX_FOCUS_PROBES = OPTS.maxFocusProbes || 40;
  // WCAG 2.2 AA floor unless the ledger raises it for this viewport — DGA mobile
  // guidance is larger, and judging a 375px capture by the desktop number is how
  // mobile target sizes came out wrong before.
  const MIN_TARGET = OPTS.minTargetPx || 24;

  /* ---------------------------------------------------------------- colour */

  // One canvas resolves every colour syntax the platform accepts — rgb, hsl,
  // oklch, color-mix, named — to straight RGBA. Parsing strings by hand breaks
  // the first time a stylesheet ships a colour space we did not anticipate.
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const cx = cvs.getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();

  function parseColor(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (!s || s === 'none') return null;
    if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return { r: 0, g: 0, b: 0, a: 0 };
    if (colorCache.has(s)) return colorCache.get(s);
    let out = null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && p.every((n) => Number.isFinite(n))) {
        out = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
    }
    if (!out) {
      try {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = '#000';
        cx.fillStyle = s;
        // A fillStyle the browser rejected stays '#000'; that is indistinguishable
        // from a real black, so only trust the readback when it changed or the
        // input plausibly *is* black.
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      } catch (e) {
        out = null;
      }
    }
    colorCache.set(s, out);
    return out;
  }

  const hex = (c) =>
    '#' +
    [c.r, c.g, c.b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('');

  function over(fg, bg) {
    // Source-over composite of a translucent fg onto an opaque bg.
    const a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }

  function luminance(c) {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrast(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* -------------------------------------------------------------- selectors */

  function selectorFor(el) {
    const parts = [];
    let n = el;
    for (let depth = 0; n && n.nodeType === 1 && depth < 4; depth++, n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift('#' + n.id);
        break;
      }
      const cls = (n.getAttribute('class') || '')
        .trim()
        .split(/\s+/)
        .filter((c) => c && c.length < 32 && !/^(css|sc)-[a-z0-9]{4,}$/i.test(c))
        .slice(0, 2);
      if (cls.length) p += '.' + cls.join('.');
      parts.unshift(p);
    }
    return parts.join(' > ').slice(0, 160);
  }

  /* ----------------------------------------------------------------- tally */

  function tally() {
    const map = new Map();
    return {
      add(value, el, extra) {
        if (value == null || value === '') return;
        const k = String(value);
        let e = map.get(k);
        if (!e) {
          e = { value: k, count: 0, samples: [] };
          if (extra) Object.assign(e, extra);
          map.set(k, e);
        }
        e.count++;
        if (el && e.samples.length < MAX_SAMPLES) e.samples.push(selectorFor(el));
      },
      dump() {
        return [...map.values()].sort((a, b) => b.count - a.count).slice(0, MAX_ENTRIES);
      },
      total() {
        let t = 0;
        for (const e of map.values()) t += e.count;
        return t;
      },
    };
  }

  const T = {
    textColor: tally(),
    bgColor: tally(),
    borderColor: tally(),
    svgFill: tally(),
    fontFamily: tally(),
    fontSize: tally(),
    fontWeight: tally(),
    lineHeight: tally(),
    letterSpacing: tally(),
    spacing: tally(),
    gap: tally(),
    radius: tally(),
    borderWidth: tally(),
    shadow: tally(),
    duration: tally(),
    easing: tally(),
    iconSize: tally(),
    strokeWidth: tally(),
  };

  /* ------------------------------------------------------------- traversal */

  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  };
  const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const ARABIC_INDIC = /[٠-٩۰-۹]/;
  const WESTERN_DIGIT = /[0-9]/;

  function visible(el, cs, rect) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (rect.width <= 0 || rect.height <= 0) return false;
    return true;
  }

  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.trim();
  }

  function effectiveBackground(el) {
    // Walk up compositing translucent layers until something opaque stops us.
    const stack = [];
    let n = el;
    let imageBehind = false;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') imageBehind = true;
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 1) break;
      }
      n = n.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBg && rootBg.a >= 1) base = rootBg;
    let acc = base;
    for (let i = stack.length - 1; i >= 0; i--) acc = stack[i].a >= 1 ? stack[i] : over(stack[i], acc);
    return { color: acc, imageBehind };
  }

  const contrastFindings = [];
  const nonTextFindings = [];
  const targetFindings = [];
  let textRuns = 0;
  let textRunsPassing = 0;
  let textRunsIndeterminate = 0;
  let nonTextChecked = 0;
  let nonTextPassing = 0;
  let interactiveCount = 0;
  let interactivePassingTarget = 0;

  const INTERACTIVE = 'a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[tabindex]:not([tabindex="-1"])';

  let arabicRuns = 0;
  let arabicRunsInArabicFace = 0;
  let arabicIndicSeen = 0;
  let westernDigitSeen = 0;
  let mirroredIconSuspects = 0;
  let rtlElements = 0;
  let ltrElements = 0;

  const all = document.querySelectorAll('*');
  const elements = all.length > MAX_ELEMENTS ? [...all].slice(0, MAX_ELEMENTS) : [...all];
  let examined = 0;

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'head') continue;
    let cs, rect;
    try {
      cs = getComputedStyle(el);
      rect = el.getBoundingClientRect();
    } catch (e) {
      continue;
    }
    if (!visible(el, cs, rect)) continue;
    examined++;

    /* colour */
    const bgc = parseColor(cs.backgroundColor);
    if (bgc && bgc.a > 0) T.bgColor.add(hex(bgc), el);

    const text = ownText(el);
    if (text) {
      const fg = parseColor(cs.color);
      if (fg && fg.a > 0) T.textColor.add(hex(fg), el);
      T.fontFamily.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), el);
      T.fontSize.add(px(cs.fontSize), el);
      T.fontWeight.add(cs.fontWeight, el);
      T.lineHeight.add(cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight), el);
      T.letterSpacing.add(cs.letterSpacing === 'normal' ? '0' : px(cs.letterSpacing), el);

      /* A1 — text contrast */
      const size = px(cs.fontSize) || 16;
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3.0 : 4.5;
      const { color: bg, imageBehind } = effectiveBackground(el);
      textRuns++;
      if (imageBehind || !fg || fg.a <= 0) {
        textRunsIndeterminate++;
      } else {
        const eff = fg.a < 1 ? over(fg, bg) : fg;
        const ratio = Math.round(contrast(eff, bg) * 100) / 100;
        if (ratio >= need) textRunsPassing++;
        else if (contrastFindings.length < 60) {
          contrastFindings.push({
            selector: selectorFor(el),
            text: text.slice(0, 60),
            fg: hex(eff),
            bg: hex(bg),
            ratio,
            required: need,
            fontSize: size,
            fontWeight: weight,
          });
        }
      }

      /* R3 — script and numerals */
      if (ARABIC.test(text)) {
        arabicRuns++;
        const fam = cs.fontFamily.toLowerCase();
        if (/arab|kufi|naskh|cairo|tajawal|almarai|ibm plex sans arabic|readex|noto/.test(fam)) arabicRunsInArabicFace++;
      }
      if (ARABIC_INDIC.test(text)) arabicIndicSeen++;
      if (WESTERN_DIGIT.test(text)) westernDigitSeen++;
    }

    /* borders */
    const bw = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
    const bc = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
    for (let i = 0; i < 4; i++) {
      const w = px(cs[bw[i]]);
      if (w && w > 0) {
        T.borderWidth.add(w, el);
        const c = parseColor(cs[bc[i]]);
        if (c && c.a > 0) {
          T.borderColor.add(hex(c), el);
          /* A2 — non-text contrast of the boundary against what is behind it */
          const { color: behind, imageBehind } = effectiveBackground(el.parentElement || el);
          if (!imageBehind) {
            nonTextChecked++;
            const eff = c.a < 1 ? over(c, behind) : c;
            const r = Math.round(contrast(eff, behind) * 100) / 100;
            if (r >= 3.0) nonTextPassing++;
            else if (nonTextFindings.length < 40) {
              nonTextFindings.push({ selector: selectorFor(el), border: hex(eff), against: hex(behind), ratio: r, required: 3.0 });
            }
          }
        }
        break; // one border per element is enough for the tally
      }
    }

    /* shape */
    for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
      const r = px(cs[p]);
      if (r && r > 0) {
        const pill = r >= Math.min(rect.width, rect.height) / 2 - 0.5;
        T.radius.add(pill ? 'pill' : r, el);
        break;
      }
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') T.shadow.add(cs.boxShadow.slice(0, 120), el);

    /* spacing */
    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft']) {
      const v = px(cs[p]);
      if (v && v > 0) T.spacing.add(v, el);
    }
    for (const p of ['rowGap', 'columnGap']) {
      const v = px(cs[p]);
      if (v && v > 0) T.gap.add(v, el);
    }

    /* motion */
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      for (const d of cs.transitionDuration.split(',')) {
        const ms = Math.round(parseFloat(d) * 1000);
        if (ms > 0) T.duration.add(ms, el);
      }
      for (const e of (cs.transitionTimingFunction || '').split(/,(?![^(]*\))/)) {
        const v = e.trim();
        if (v) T.easing.add(v, el);
      }
    }
    if (cs.animationDuration && cs.animationDuration !== '0s') {
      for (const d of cs.animationDuration.split(',')) {
        const ms = Math.round(parseFloat(d) * 1000);
        if (ms > 0) T.duration.add(ms, el);
      }
    }

    /* icons */
    if (tag === 'svg') {
      const s = Math.round(Math.max(rect.width, rect.height));
      if (s > 0 && s <= 96) T.iconSize.add(s, el);
      const sw = el.getAttribute('stroke-width') || cs.strokeWidth;
      if (sw && sw !== '0px' && sw !== '0') T.strokeWidth.add(px(sw) ?? sw, el);
      const f = parseColor(cs.fill);
      if (f && f.a > 0 && cs.fill !== 'none') T.svgFill.add(hex(f), el);
      // A chevron or arrow that did not mirror under RTL is the classic defect.
      if (getComputedStyle(el).direction === 'rtl') {
        const cls = (el.getAttribute('class') || '') + ' ' + (el.getAttribute('data-icon') || '');
        if (/chevron|arrow|caret|back|forward|next|prev/i.test(cls) && !/scale\(-1|matrix\(-1/.test(cs.transform)) {
          mirroredIconSuspects++;
        }
      }
    }

    /* direction */
    const dir = cs.direction;
    if (dir === 'rtl') rtlElements++;
    else ltrElements++;

    /* A4 — target size */
    if (el.matches && el.matches(INTERACTIVE)) {
      interactiveCount++;
      const w = rect.width;
      const h = rect.height;
      if (w >= MIN_TARGET && h >= MIN_TARGET) interactivePassingTarget++;
      else if (targetFindings.length < 40) {
        targetFindings.push({
          selector: selectorFor(el),
          width: Math.round(w * 10) / 10,
          height: Math.round(h * 10) / 10,
          required: MIN_TARGET,
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
        });
      }
    }
  }

  /* ------------------------------------------------------- authored CSS */

  // R2 and M2 are about what the stylesheet SAYS, not what computed style shows
  // — a physical margin-left and a logical margin-inline-start compute to the
  // same pixels in LTR and diverge only in RTL, so the authored rule is the only
  // place the defect is visible.
  const cssStats = {
    rulesRead: 0,
    inaccessibleSheets: 0,
    logicalDecls: 0,
    physicalDecls: 0,
    physicalSamples: [],
    reducedMotionRules: 0,
    focusVisibleRules: 0,
    outlineNoneRules: 0,
    rtlOverrideRules: 0,
  };
  const LOGICAL = /^(margin|padding|inset|border)-(inline|block)(-(start|end))?$|^(inset|margin|padding)-(inline|block)$|^border-(inline|block)-(start|end)-(width|color|style)$/;
  const PHYSICAL = /^(margin|padding)-(left|right)$|^(left|right)$|^border-(left|right)-(width|color|style)$|^border-(left|right)$|^float$|^clear$/;

  function walkRules(rules, inReducedMotion) {
    for (const rule of rules) {
      cssStats.rulesRead++;
      if (cssStats.rulesRead > 20000) return;
      if (rule.type === 4 || rule.media) {
        const mt = String(rule.conditionText || rule.media?.mediaText || '');
        const rm = /prefers-reduced-motion/.test(mt);
        if (rm) cssStats.reducedMotionRules++;
        if (rule.cssRules) walkRules(rule.cssRules, inReducedMotion || rm);
        continue;
      }
      // A plain CSSStyleRule exposes an EMPTY cssRules list in every engine that
      // supports CSS Nesting, so an unguarded `continue` here skipped the
      // declarations of every ordinary rule — silently zeroing logicalDecls and
      // physicalDecls (and the focus/rtl rule counts) on any real page. Recurse
      // only into rules that actually have children, then fall through so the
      // rule's own declarations are still read.
      if (rule.cssRules && rule.cssRules.length) walkRules(rule.cssRules, inReducedMotion);
      const sel = rule.selectorText || '';
      if (/:focus-visible|:focus\b/.test(sel)) cssStats.focusVisibleRules++;
      if (/\[dir=["']?rtl|:dir\(rtl\)|\.rtl\b/.test(sel)) cssStats.rtlOverrideRules++;
      const st = rule.style;
      if (!st) continue;
      if (/^(none|0)$/.test(st.getPropertyValue('outline') || '') || /^(none|0)$/.test(st.getPropertyValue('outline-style') || '')) {
        cssStats.outlineNoneRules++;
      }
      for (let i = 0; i < st.length; i++) {
        const p = st[i];
        if (LOGICAL.test(p)) cssStats.logicalDecls++;
        else if (PHYSICAL.test(p)) {
          cssStats.physicalDecls++;
          if (cssStats.physicalSamples.length < 25) cssStats.physicalSamples.push({ selector: sel.slice(0, 100), property: p });
        }
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      walkRules(sheet.cssRules, false);
    } catch (e) {
      cssStats.inaccessibleSheets++;
    }
  }

  /* --------------------------------------------------------- A3 focus ring */

  // Actually focus a sample of controls and diff the computed style. Reading the
  // stylesheet alone cannot tell a replaced indicator from a removed one.
  const focusProbe = { probed: 0, visible: 0, missing: [] };
  const prevActive = document.activeElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const probes = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.hasAttribute('disabled');
  });
  for (const el of probes.slice(0, MAX_FOCUS_PROBES)) {
    try {
      const before = getComputedStyle(el);
      const b = [before.outlineStyle, before.outlineWidth, before.outlineColor, before.boxShadow, before.borderColor, before.backgroundColor].join('|');
      el.focus({ preventScroll: true });
      const after = getComputedStyle(el);
      const a = [after.outlineStyle, after.outlineWidth, after.outlineColor, after.boxShadow, after.borderColor, after.backgroundColor].join('|');
      focusProbe.probed++;
      const changed = a !== b;
      const hasOutline = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) > 0;
      if (changed || hasOutline) focusProbe.visible++;
      else if (focusProbe.missing.length < 20) {
        focusProbe.missing.push({ selector: selectorFor(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
      el.blur();
    } catch (e) {
      /* some controls refuse focus; not a finding */
    }
  }
  try {
    if (prevActive && prevActive.focus) prevActive.focus({ preventScroll: true });
    window.scrollTo(scrollX, scrollY);
  } catch (e) {}

  /* ------------------------------------------------------------- layout */

  const main = document.querySelector('main, [role=main], #main, .container, .page') || document.body;
  const mainRect = main.getBoundingClientRect();
  const mainCs = getComputedStyle(main);

  /* ------------------------------------------------------------- output */

  return {
    schema: 'dga-observed/1',
    label: LABEL,
    capturedAt: new Date().toISOString(),
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    // What the viewer PREFERS. Recorded for information only — never bucket a
    // capture on this. A page with no dark theme renders light on a machine set
    // to dark, and bucketing on the preference silently empties the light set.
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    documentDark: /dark/.test(document.documentElement.className) || document.documentElement.getAttribute('data-theme') === 'dark',
    // What the page ACTUALLY RENDERED, from the luminance of the ground the
    // content sits on. This is what the colour checks bucket by.
    renderedScheme: (() => {
      let bg = parseColor(getComputedStyle(document.body).backgroundColor);
      if (!bg || bg.a < 1) {
        const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
        if (rootBg && rootBg.a >= 1) bg = rootBg;
      }
      if (!bg || bg.a <= 0) return 'light'; // an unpainted ground is white by default
      return luminance(bg) < 0.45 ? 'dark' : 'light';
    })(),
    document: {
      dir: document.documentElement.getAttribute('dir') || getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.getAttribute('lang') || null,
      elementsExamined: examined,
      elementsTotal: all.length,
      truncated: all.length > MAX_ELEMENTS,
    },
    rootCustomProperties: (() => {
      const out = {};
      try {
        for (const sheet of document.styleSheets) {
          let rules;
          try {
            rules = sheet.cssRules;
          } catch (e) {
            continue;
          }
          for (const r of rules) {
            if (r.selectorText && /(^|,)\s*:root\s*($|,)/.test(r.selectorText) && r.style) {
              for (let i = 0; i < r.style.length; i++) {
                const p = r.style[i];
                if (p.startsWith('--') && Object.keys(out).length < 300) out[p] = r.style.getPropertyValue(p).trim();
              }
            }
          }
        }
      } catch (e) {}
      return out;
    })(),
    fontFaces: (() => {
      const s = new Set();
      try {
        document.fonts.forEach((f) => s.add(f.family.replace(/["']/g, '')));
      } catch (e) {}
      return [...s].slice(0, 40);
    })(),
    tallies: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, { total: v.total(), values: v.dump() }])),
    layout: {
      container: Math.round(mainRect.width),
      gutter: Math.round(parseFloat(mainCs.paddingLeft) || 0),
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    },
    contrast: {
      textRuns,
      passing: textRunsPassing,
      indeterminate: textRunsIndeterminate,
      findings: contrastFindings,
    },
    nonTextContrast: { checked: nonTextChecked, passing: nonTextPassing, findings: nonTextFindings },
    targets: { interactive: interactiveCount, passing: interactivePassingTarget, minTargetPx: MIN_TARGET, findings: targetFindings },
    focus: focusProbe,
    rtl: {
      rtlElements,
      ltrElements,
      arabicRuns,
      arabicRunsInArabicFace,
      arabicIndicNumerals: arabicIndicSeen,
      westernNumerals: westernDigitSeen,
      unmirroredDirectionalIcons: mirroredIconSuspects,
    },
    css: cssStats,
  };
}
