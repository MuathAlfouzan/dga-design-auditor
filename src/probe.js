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
  const MAX_SAMPLES = 6;
  const MAX_ELEMENTS = OPTS.maxElements || 6000;
  const MAX_FOCUS_PROBES = OPTS.maxFocusProbes || 40;
  // Test and diagnostic switch: force the cascade path even where the browser CAN observe
  // focus. Without it the fallback is unreachable in headless Chrome, which does hold OS
  // focus — so the code that runs on the real audit surface would never be exercised.
  const FORCE_CASCADE = OPTS.forceCascade === true;
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

  /* -------------------------------------------------------------- locators */

  /**
   * Where on the page is this, in words a person can act on?
   *
   * selectorFor gives a CSS path, which tells a developer how to SELECT an element and
   * tells nobody where it IS. "div.row > a.btn" cannot be found by eye; "header ·
   * navigation · «تسجيل الدخول»" can. Region and section are read off the page's own
   * landmarks and headings, so the words in the report are the words on the screen.
   */
  const REGION_SEL = 'header,nav,main,footer,aside,form,' +
    '[role=banner],[role=navigation],[role=main],[role=contentinfo],[role=complementary],[role=search],[role=form]';
  const REGION_NAME = {
    header: 'header', banner: 'header',
    nav: 'navigation', navigation: 'navigation',
    main: 'main',
    footer: 'footer', contentinfo: 'footer',
    aside: 'aside', complementary: 'aside',
    form: 'form', search: 'search',
  };

  function textOf(el, max) {
    const t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title')))
      || el.textContent || '';
    return String(t).replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function labelledBy(el) {
    const ids = el.getAttribute('aria-labelledby');
    if (!ids) return '';
    return ids.split(/\s+/).map((i) => document.getElementById(i)).filter(Boolean)
      .map((n) => textOf(n, 60)).join(' ').trim();
  }

  function regionOf(el) {
    const host = el.closest(REGION_SEL);
    if (!host) return null;
    const key = String(host.getAttribute('role') || host.tagName).toLowerCase();
    return REGION_NAME[key] || key;
  }

  // Collected once. sectionOf runs for every sample on the page, and re-walking the
  // document per call turned a 20ms probe into a visible stall.
  let HEADINGS = null;
  const headings = () => (HEADINGS || (HEADINGS = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]));

  function sectionOf(el) {
    const box = el.closest('section,article,[role=region],[aria-label],[aria-labelledby]');
    if (box && box !== document.body) {
      const named = box.getAttribute('aria-label') || labelledBy(box);
      if (named) return named.replace(/\s+/g, ' ').trim().slice(0, 60);
      const h = box.querySelector('h1,h2,h3,h4,h5,h6');
      if (h) { const t = textOf(h, 60); if (t) return t; }
    }
    // The fallback that makes this work at all: the nearest heading BEFORE this element
    // in document order. Most pages carry no section landmarks; nearly all carry headings.
    let last = null;
    for (const h of headings()) {
      if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) last = h;
      else break;
    }
    return last ? (textOf(last, 60) || null) : null;
  }

  /**
   * A NAME, not a transcript. textContent on a container concatenates every descendant,
   * which produced report rows reading «PersonalizedThe services are created acc» — the
   * card heading welded to its body copy. A label a person recognises comes from the
   * element itself: its accessible name, then its own direct text, then the heading
   * inside it. Only fall back to the flattened subtree when nothing else exists.
   */
  function nameOf(el) {
    const aria = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title'));
    if (aria && aria.trim()) return aria.replace(/\s+/g, ' ').trim().slice(0, 40);
    let own = '';
    for (const n of el.childNodes || []) if (n.nodeType === 3) own += n.nodeValue;
    own = own.replace(/\s+/g, ' ').trim();
    if (own) return own.slice(0, 40);
    const h = el.querySelector && el.querySelector('h1,h2,h3,h4,h5,h6,legend,figcaption');
    if (h) { const t = textOf(h, 40); if (t) return t; }
    return textOf(el, 40);
  }

  const LOC_CACHE = new WeakMap();
  function locate(el) {
    if (LOC_CACHE.has(el)) return LOC_CACHE.get(el);
    let out;
    try {
      const r = el.getBoundingClientRect();
      out = {
        sel: selectorFor(el),
        region: regionOf(el),
        section: sectionOf(el),
        name: nameOf(el) || null,
        at: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
              w: Math.round(r.width), h: Math.round(r.height) },
      };
    } catch (e) {
      out = { sel: selectorFor(el), region: null, section: null, name: null, at: null };
    }
    LOC_CACHE.set(el, out);
    return out;
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
        if (el && e.samples.length < MAX_SAMPLES) e.samples.push(locate(el));
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
    // size|line-height|tracking as one key, because T4 asks whether a ramp STEP was
    // used — a 14px body with 72px display leading passes any test that looks at
    // leading alone, and that is what the old check did despite documenting a triple.
    typePair: tally(),
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
  let decorativeBordersSkipped = 0;
  let inlineTargetsExempt = 0;
  let spacedTargetsExempt = 0;

  /**
   * Is this border carrying information needed to identify a control or its state?
   * WCAG 1.4.11 covers that; it does not cover decoration. Controls, things with a
   * widget role, and elements a control lives inside all qualify. A plain div whose
   * only job is a hairline does not.
   */
  const COMPONENTISH = 'input,select,textarea,button,a[href],summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=listbox],[role=menuitem],[role=textbox],[role=searchbox],[role=slider],[role=spinbutton],[contenteditable="true"]';
  // SC 1.4.11 covers visual information required to IDENTIFY a component. A link
  // wrapped around a headline and a paragraph is a content CARD: its outline encloses
  // content rather than identifying an affordance, and the link is already identified
  // by its text and its hit area. Counting those hairlines is what put dga.gov.sa at
  // 3 of 34 — almost entirely news cards bordered #d2d6db on #f7fdf9.
  const CARD_CONTENT = 'h1,h2,h3,h4,h5,h6,p,article,section,ul,ol,table,figure,blockquote';
  function looksLikeContentCard(el) {
    try {
      const r = el.getBoundingClientRect();
      if (r.height <= 96) return false;                 // too small to be a card
      return !!(el.querySelector && el.querySelector(CARD_CONTENT));
    } catch (e) { return false; }
  }

  function isComponentBoundary(el) {
    if (el.matches && el.matches(COMPONENTISH)) {
      if (el.matches('a[href],[role=link]') && looksLikeContentCard(el)) return false;
      return true;
    }
    // A wrapper drawn around a control — the bordered shell of a search field, say —
    // is carrying that control's boundary.
    try {
      if (el.querySelector && el.querySelector(COMPONENTISH)) {
        const r = el.getBoundingClientRect();
        if (r.height <= 96) return true; // a control shell, not a page section
      }
    } catch (e) {}
    return false;
  }

  /**
   * The value as AUTHORED, not as resolved. Walks the cascade for the winning
   * declaration so `auto` and percentages can be told apart from real lengths.
   * Returns null when nothing authored it.
   */
  const authoredCache = new Map();
  function authoredValue(el, prop) {
    if (el.style && el.style.getPropertyValue(prop)) return el.style.getPropertyValue(prop).trim();
    const key = el.tagName + '|' + (el.getAttribute('class') || '') + '|' + prop;
    if (authoredCache.has(key)) return authoredCache.get(key);
    let found = null;
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        for (const r of rules) {
          if (!r.style || !r.selectorText) continue;
          const v = r.style.getPropertyValue(prop);
          if (!v) continue;
          try { if (el.matches(r.selectorText)) found = v.trim(); } catch (e) {}
        }
      }
    } catch (e) {}
    if (authoredCache.size < 400) authoredCache.set(key, found);
    return found;
  }

  /**
   * WCAG 2.2 spacing exception: an undersized target passes if a MIN_TARGET-wide
   * circle centred on it does not intersect the equivalent circle of any other
   * target. Small controls with room around them are reachable; small controls
   * crowded together are not, and that is the distinction the SC draws.
   */
  let targetRects = null;
  function spacingExceptionMet(el, rect) {
    if (targetRects === null) {
      targetRects = [];
      for (const t of document.querySelectorAll(INTERACTIVE)) {
        const r = t.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) targetRects.push({ el: t, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
      }
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (const t of targetRects) {
      if (t.el === el) continue;
      const d = Math.hypot(t.cx - cx, t.cy - cy);
      if (d < MIN_TARGET) return false; // the two circles overlap
    }
    return true;
  }

  /**
   * A shadow reduced to comparable numbers: [x, y, blur, spread, r, g, b, a] per
   * layer, inset flagged. Both `#1018280d` and `rgba(16,24,40,0.05)` land on the
   * same values, which is the whole point — the ledger writes one and the browser
   * reports the other.
   */
  function normaliseShadow(value) {
    return String(value)
      .split(/,(?![^(]*\))/)
      .map((layer) => {
        const inset = /\binset\b/.test(layer);
        let rest = layer.replace(/\binset\b/, '');
        let colour = null;
        const fn = rest.match(/(rgba?|hsla?|oklch|color)\([^)]*\)/i);
        if (fn) { colour = fn[0]; rest = rest.replace(fn[0], ''); }
        else {
          const hexM = rest.match(/#[0-9a-f]{3,8}\b/i);
          if (hexM) { colour = hexM[0]; rest = rest.replace(hexM[0], ''); }
        }
        const lens = (rest.match(/-?\d*\.?\d+(px|rem|em)?/g) || [])
          .map((n) => Math.round(parseFloat(n) * 100) / 100)
          .filter((n) => Number.isFinite(n));
        while (lens.length < 4) lens.push(0);
        const c = colour ? parseColor(colour) : null;
        const rgba = c ? [Math.round(c.r), Math.round(c.g), Math.round(c.b), Math.round(c.a * 100) / 100] : [0, 0, 0, 1];
        return (inset ? 'inset ' : '') + lens.slice(0, 4).join(' ') + ' / ' + rgba.join(' ');
      })
      .join(', ');
  }

  // Declared family name -> the file it actually loads. Built before the walk
  // because both T1 and R3 need to resolve an alias before judging it: a site
  // serving IBMPlexSansArabic-Regular.ttf under the name `regularFont` is using
  // the specified typeface, and the name alone would say the opposite.
  const FACE_SRC = (() => {
    const map = {};
    const fromSrc = (src) => {
      const m = String(src || '').match(/url\(\s*["']?([^"')]+)/i);
      if (!m) return null;
      const file = m[1].split('/').pop().split('?')[0];
      return file.replace(/\.(woff2?|ttf|otf|eot)$/i, '').replace(/[-_](regular|bold|semibold|medium|light|thin|black|italic|\d{3})$/i, '');
    };
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        const walk = (list) => {
          for (const r of list) {
            if (r.cssRules && r.cssRules.length) walk(r.cssRules);
            if (!r.style || !r.style.src) continue;
            const fam = (r.style.fontFamily || '').replace(/["']/g, '').trim();
            const resolved = fromSrc(r.style.src);
            if (fam && resolved && Object.keys(map).length < 60) map[fam] = resolved;
          }
        };
        walk(rules);
      }
    } catch (e) {}
    return map;
  })();

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
      T.typePair.add(
        [px(cs.fontSize), cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight),
         cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing)].join('|'), el);

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
            loc: locate(el),
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
        // Test the FILE the family loads, not just the declared name. A site
        // serving IBMPlexSansArabic-Regular.ttf as `regularFont` is using an
        // Arabic face; the declared name alone says otherwise.
        const declared = cs.fontFamily.toLowerCase();
        const resolved = (declared.split(',')[0].replace(/["']/g, '').trim());
        const viaFace = FACE_SRC[resolved] || FACE_SRC[Object.keys(FACE_SRC).find((k) => k.toLowerCase() === resolved) || ''] || '';
        const hay = (declared + ' ' + viaFace).toLowerCase();
        if (/arab|kufi|naskh|cairo|tajawal|almarai|ibmplexsansarabic|ibm plex sans arabic|readex|noto/.test(hay)) arabicRunsInArabicFace++;
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
          /* A2 — non-text contrast.
             WCAG 1.4.11 covers visual information needed to IDENTIFY user interface
             components and states, plus graphical objects. It does not cover
             decoration. Checking every border on the page turned faint dividers and
             card outlines into conformance failures, which they are not — on one real
             audit that put the check at 1 of 44 and capped the band on hairlines. */
          if (isComponentBoundary(el)) {
            const { color: behind, imageBehind } = effectiveBackground(el.parentElement || el);
            if (!imageBehind) {
              nonTextChecked++;
              const eff = c.a < 1 ? over(c, behind) : c;
              const r = Math.round(contrast(eff, behind) * 100) / 100;
              if (r >= 3.0) nonTextPassing++;
              else if (nonTextFindings.length < 40) {
                nonTextFindings.push({ selector: selectorFor(el), loc: locate(el), border: hex(eff), against: hex(behind), ratio: r, required: 3.0 });
              }
            }
          } else {
            decorativeBordersSkipped++;
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
    // Shadows are tallied in a NORMALISED form, not as the browser's string. The
    // ledger stores `0 1px 2px 0 #1018280d` and Chrome serialises the same shadow
    // as `rgba(16, 24, 40, 0.05) 0px 1px 2px 0px`; comparing those as text, or by
    // scraping numbers out of them, can never match — the hex reads as one integer
    // and rgba() as four. E3 was structurally unpassable until this.
    if (cs.boxShadow && cs.boxShadow !== 'none') T.shadow.add(normaliseShadow(cs.boxShadow), el, { raw: cs.boxShadow.slice(0, 120) });

    // Spacing counts only what the AUTHOR wrote. Computed style cannot tell a design
    // decision from a browser default or a resolved layout value, and both were being
    // scored as off-scale choices: `margin: auto` arrived as 1231.47px, and Chrome's
    // own `button { padding: 1px 6px }` arrived as a 1px spacing token nobody chose.
    // Logical longhands are read too — a site that uses margin-block-end (which R2
    // rewards) must not become invisible to S1.
    for (const p of ['padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                     'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end',
                     'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                     'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end']) {
      const authored = authoredValue(el, p);
      if (authored === null || /auto|%|calc|var\(/i.test(authored)) continue;
      const v = px(authored);
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

    /* A4 — target size, with the exceptions WCAG 2.2 actually grants.
       2.5.8 exempts a target that is INLINE in a sentence or block of text, and one
       with enough SPACING that a 24px circle centred on it touches no other target.
       Counting every link meant body and footer prose links were reported as
       failures they are not, which buried the genuinely small controls. */
    if (el.matches && el.matches(INTERACTIVE)) {
      // The inline exception is for a link sitting IN A SENTENCE. Three things all
      // have to hold, and the loose version of this wrongly exempted standalone
      // icon links: `inline-block` is a discrete box rather than running text, and a
      // target with no text of its own is not part of a sentence at all.
      const ownLabel = (el.textContent || '').trim();
      const inlineFlow = cs.display === 'inline' || cs.display === 'contents';
      const inProse = (() => {
        const p = el.parentElement;
        if (!p || !ownLabel) return false;
        if (!/^(P|LI|TD|TH|SPAN|EM|STRONG|BLOCKQUOTE|FIGCAPTION|DD|DT|LABEL|SMALL)$/.test(p.tagName)) return false;
        const parentText = (p.textContent || '').trim().length;
        return parentText > ownLabel.length + 20; // real prose around it
      })();
      if (inlineFlow && inProse) { inlineTargetsExempt++; continue; }

      interactiveCount++;
      const w = rect.width;
      const h = rect.height;
      if (w >= MIN_TARGET && h >= MIN_TARGET) interactivePassingTarget++;
      else if (spacingExceptionMet(el, rect)) { spacedTargetsExempt++; interactivePassingTarget++; }
      else if (targetFindings.length < 40) {
        targetFindings.push({
          selector: selectorFor(el),
          loc: locate(el),
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
    // vendor CSS is measured but not scored — reported so a reader can see the split
    vendorLogicalDecls: 0,
    vendorPhysicalDecls: 0,
    vendorSheets: 0,
    firstPartySheets: 0,
  };
  /**
   * Was this directional longhand written by the author, or produced by expanding a
   * shorthand? If the covering shorthand is present in the same rule, the CSSOM
   * generated the longhand and it carries no directional intent.
   */
  function fromShorthand(style, prop) {
    const covers = {
      "margin-left": ["margin"], "margin-right": ["margin"],
      "padding-left": ["padding"], "padding-right": ["padding"],
      left: ["inset"], right: ["inset"],
      "border-left-width": ["border", "border-width"], "border-right-width": ["border", "border-width"],
      "border-left-style": ["border", "border-style"], "border-right-style": ["border", "border-style"],
      "border-left-color": ["border", "border-color"], "border-right-color": ["border", "border-color"],
      "border-left": ["border"], "border-right": ["border"],
    }[prop];
    if (!covers) return false;
    return covers.some((sh) => (style.getPropertyValue(sh) || "").trim() !== "");
  }

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
          // A longhand the CSSOM produced by expanding a shorthand is not a
          // directional choice. `margin: 0` sets all four sides and lists
          // margin-left among them; `border: 1px solid` lists border-right-width.
          // Neither has a "more logical" form the author declined to use, and
          // counting them made a page written entirely in logical properties read
          // as 24 physical declarations.
          if (fromShorthand(st, p)) continue;
          cssStats.physicalDecls++;
          if (cssStats.physicalSamples.length < 25) cssStats.physicalSamples.push({ selector: sel.slice(0, 100), property: p });
        }
      }
    }
  }
  // First-party versus vendor. R2 asks whether the TEAM wrote logical properties;
  // counting Bootstrap's thousands of physical declarations measures their framework
  // choice instead, and no site built on such a framework could ever score well no
  // matter how carefully its own CSS was written.
  const VENDOR = /(bootstrap|foundation|bulma|tailwind|materialize|semantic-ui|font-?awesome|slick|swiper|owl\.?carousel|jquery|select2|datatables|fullcalendar|aos|animate(\.min)?\.css|normalize|reset|primeng|primereact|antd|mui|chakra)/i;
  const isVendor = (href) => {
    if (!href) return false;
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return true;   // a CDN is not your code
      return VENDOR.test(u.pathname);
    } catch (e) { return false; }
  };
  for (const sheet of document.styleSheets) {
    const vendor = isVendor(sheet.href);
    const before = { l: cssStats.logicalDecls, p: cssStats.physicalDecls };
    try {
      walkRules(sheet.cssRules, false);
    } catch (e) {
      cssStats.inaccessibleSheets++;
      continue;
    }
    const added = { l: cssStats.logicalDecls - before.l, p: cssStats.physicalDecls - before.p };
    if (vendor) {
      cssStats.vendorLogicalDecls += added.l;
      cssStats.vendorPhysicalDecls += added.p;
      cssStats.logicalDecls = before.l;
      cssStats.physicalDecls = before.p;
      cssStats.vendorSheets++;
    } else {
      cssStats.firstPartySheets++;
    }
  }

  /* --------------------------------------------------------- A3 focus ring */

  // Actually focus a sample of controls and diff the computed style. Reading the
  // stylesheet alone cannot tell a replaced indicator from a removed one.
  //
  // The trap that made this check report zero on every modern site: el.focus() does
  // NOT make :focus-visible match. Nearly every design system now writes
  //     *:focus { outline: none }   /   *:focus-visible { outline: ... }
  // so a programmatic focus lands in the first rule, nothing changes, and a working
  // keyboard ring gets filed as missing. Measured on dga.gov.sa: 118 :focus rules in
  // the stylesheets, and zero computed-style change across all 59 controls.
  //
  // Per the :focus-visible spec, focus moved by script inherits the state when the
  // previously focused element matched it — and a text input always matches on
  // programmatic focus. So park focus on a throwaway input between probes, which puts
  // every subsequent .focus() into a genuine focus-visible state. Same page, same
  // engine: 9 of 59 controls show a ring.
  const focusProbe = { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: false, method: 'observed', missing: [] };
  const prevActive = document.activeElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const probes = [...document.querySelectorAll(INTERACTIVE)].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.hasAttribute('disabled');
  });


  /**
   * When the browser will not hold OS focus, :focus-visible can never match and the live
   * probe reports nothing at all — which used to make A3 unmeasurable, and with it made
   * "Ready to submit" unreachable on the only surface that renders a real desktop layout.
   *
   * So resolve the CSS instead of observing it: strip the pseudo-class off every focus
   * rule, find which controls the remainder lands on, and order the matches by specificity
   * then source order to see which declaration finally wins.
   *
   * This is EVIDENCE, NOT OBSERVATION, and every consumer is told so via `method`. It is
   * blind to focus styling applied by script, and to anything a pseudo-element draws.
   */
  function specificity(sel) {
    const s = String(sel).replace(/\[[^\]]*\]/g, '\u0000A').replace(/::[a-z-]+/gi, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+/g) || []).length
              + (s.match(/\u0000A/g) || []).length
              + (s.match(/:(?!:)[a-z-]+/gi) || []).length;
    const els = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return ids * 10000 + cls * 100 + els;
  }

  function focusByCascade(probes) {
    const rules = [];
    let order = 0;
    const walk = (list) => {
      for (const r of list) {
        try { if (r.cssRules) walk(r.cssRules); } catch (e) {}
        const sel = r.selectorText;
        if (!sel || !/:focus/.test(sel) || !r.style) continue;
        for (const part of sel.split(',')) {
          if (!/:focus/.test(part)) continue;
          let bare = part.replace(/:focus-visible|:focus-within|:focus/g, '')
                         .replace(/::(before|after)/g, '').trim();
          if (!bare || /[>+~]$/.test(bare)) bare = bare ? bare + ' *' : '*';
          rules.push({ bare, spec: specificity(part), order: order++, style: r.style });
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch (e) {}
    }
    // weakest first, so the last write wins the same way the cascade resolves it
    rules.sort((a, b) => a.spec - b.spec || a.order - b.order);

    const out = { probed: 0, visible: 0, ring: 0, colourOnly: 0, seeded: false,
                  method: 'cascade-analysis', rulesConsidered: rules.length, missing: [] };
    for (const el of probes) {
      out.probed++;
      let os = null, ow = null, shadow = null, colour = false;
      for (const r of rules) {
        let hit = false;
        try { hit = el.matches(r.bare); } catch (e) { continue; }
        if (!hit) continue;
        const o = r.style.getPropertyValue('outline');
        if (o) {
          os = /none/.test(o) ? 'none' : 'solid';
          ow = /none/.test(o) ? '0px' : (o.match(/[\d.]+px/) || ['2px'])[0];
        }
        const st = r.style.getPropertyValue('outline-style'); if (st) os = st;
        const w = r.style.getPropertyValue('outline-width'); if (w) ow = w;
        const b = r.style.getPropertyValue('box-shadow'); if (b) shadow = b;
        if (r.style.getPropertyValue('color') || r.style.getPropertyValue('background-color') ||
            r.style.getPropertyValue('border-color') || r.style.getPropertyValue('text-decoration') ||
            r.style.getPropertyValue('text-decoration-line')) colour = true;
      }
      // NO UA-default assumption. The first cut assumed that if no :focus rule touched
      // the outline the browser default must still draw, and that read 40 of 40 on
      // dga.gov.sa where live observation found 4 — over-reporting, in the one direction
      // a gate must never fail. The reason is structural: outline removal frequently
      // lives OUTSIDE a :focus rule (dga.gov.sa carries 21 such rules, `.modal{outline:0}`
      // and friends), and this pass only reads :focus rules, so it cannot know whether the
      // default survived. Claiming an indicator it cannot see is worse than missing one.
      //
      // A page relying purely on the browser default therefore under-reports here. That is
      // the safe direction for a gate, and it is stated in the check's notes.
      const hasRing = (os && os !== 'none' && parseFloat(ow || '0') > 0)
        || (shadow && shadow !== 'none');
      if (hasRing) { out.visible++; out.ring++; }
      else if (colour) { out.visible++; out.colourOnly++; }
      else if (out.missing.length < 20) {
        out.missing.push({ selector: selectorFor(el), loc: locate(el),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
    }
    return out;
  }

  let seed = null;
  try {
    if (FORCE_CASCADE) throw new Error('cascade forced');
    seed = document.createElement('input');
    seed.type = 'text';
    seed.tabIndex = -1;
    seed.setAttribute('aria-hidden', 'true');
    seed.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(seed);
    seed.focus({ preventScroll: true });
    focusProbe.seeded = seed.matches(':focus-visible');
  } catch (e) { seed = null; }

  // color and text-decoration are in the key because underline-on-focus and
  // colour-on-focus are both real indicators the previous six properties missed.
  const focusKey = (cs) => [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow,
    cs.borderColor, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|');

  for (const el of probes.slice(0, MAX_FOCUS_PROBES)) {
    try {
      const b = focusKey(getComputedStyle(el));
      el.focus({ preventScroll: true });
      const after = getComputedStyle(el);
      const a = focusKey(after);
      focusProbe.probed++;
      const bp = b.split('|');
      const ap = a.split('|');
      const ringChanged = ap.slice(0, 4).some((v, i) => v !== bp[i]);        // outline*, box-shadow
      const colourChanged = ap.slice(4).some((v, i) => v !== bp[i + 4]);     // border, bg, text, underline
      const hasOutline = after.outlineStyle !== 'none' && parseFloat(after.outlineWidth) > 0;
      if (ringChanged || hasOutline) {
        focusProbe.visible++;
        focusProbe.ring++;
      } else if (colourChanged) {
        // A colour swap alone satisfies SC 2.4.7 (technique C15) but not SC 2.4.13,
        // so it counts as visible and is tallied apart rather than merged.
        focusProbe.visible++;
        focusProbe.colourOnly++;
      } else if (focusProbe.missing.length < 20) {
        focusProbe.missing.push({ selector: selectorFor(el), loc: locate(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) });
      }
      el.blur();
      if (seed) seed.focus({ preventScroll: true });   // re-arm focus-visible for the next probe
    } catch (e) {
      /* some controls refuse focus; not a finding */
    }
  }
  try { if (seed) seed.remove(); } catch (e) {}
  // The live pass only means anything if the browser actually entered :focus-visible.
  // When it did not, every control looks bare and the reading is worthless — so replace
  // it with the cascade estimate rather than reporting a page-wide failure that is really
  // a property of the audit environment.
  if (!focusProbe.seeded) {
    const est = focusByCascade(probes.slice(0, MAX_FOCUS_PROBES));
    focusProbe.probed = est.probed;
    focusProbe.visible = est.visible;
    focusProbe.ring = est.ring;
    focusProbe.colourOnly = est.colourOnly;
    focusProbe.missing = est.missing;
    focusProbe.method = est.method;
    focusProbe.rulesConsidered = est.rulesConsidered;
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
    // A declared family name says nothing about which typeface actually renders.
    // A site can serve the exactly-right face under a local alias — dga.gov.sa
    // ships IBM Plex Sans Arabic as `regularFont`, `boldFont` and so on — and
    // matching the ledger on the declared name alone scores that as a total
    // failure. Map each @font-face family to the file it actually loads, so the
    // scorer can resolve the alias before judging it.
    fontFaceMap: FACE_SRC,
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
    nonTextContrast: {
      checked: nonTextChecked, passing: nonTextPassing, findings: nonTextFindings,
      // decorative borders are outside 1.4.11 and are skipped, not failed
      decorativeSkipped: decorativeBordersSkipped,
    },
    targets: {
      interactive: interactiveCount, passing: interactivePassingTarget,
      minTargetPx: MIN_TARGET, findings: targetFindings,
      // WCAG 2.2 exceptions applied, reported so the number stays legible: inline
      // targets left the denominator, spaced ones counted as passing.
      inlineExempt: inlineTargetsExempt, spacingExempt: spacedTargetsExempt,
    },
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
