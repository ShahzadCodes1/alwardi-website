/* =========================================================
   Alwardi Group — Homepage scripts
   ========================================================= */
(() => {
  "use strict";
  document.documentElement.classList.remove("no-js");

  // A reload always starts the story from the top (unless a #section link was opened),
  // so the pinned scene never resumes half-way through with frames still loading.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);

  // Shared between the wheel glide and the pinned hero scene
  const scene = { leash: null };

  /* ---------- 00 — Controlled wheel scrolling (mouse / trackpad) ----------
     A mouse wheel jumps ~100px per notch and a hard flick can throw the page
     thousands of pixels in a moment, which makes scroll-driven scenes stutter
     and lose their rhythm. Wheel input is eased into one continuous glide with
     a top speed, never queues more than about a screen ahead, and inside the
     hero scene stays leashed to the animation so the scene sets the pace.
     Keyboard, scrollbar, touch and anchor scrolling stay native. */
  (() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const root = document.documentElement;
    let target = window.scrollY, current = target, running = false, last = 0;
    const maxY = () => root.scrollHeight - window.innerHeight;
    const bounds = () => {
      const vh = window.innerHeight;
      let lo = Math.max(0, current - vh * 1.1), hi = Math.min(maxY(), current + vh * 1.1);
      const L = scene.leash && scene.leash();
      if (L) { lo = Math.max(lo, Math.min(L[0], current)); hi = Math.min(hi, Math.max(L[1], current)); }
      return [lo, hi];
    };
    const step = (now) => {
      const dt = last ? Math.min(64, now - last) : 16.7;
      last = now;
      const [lo, hi] = bounds();
      target = Math.min(hi, Math.max(lo, target));
      let d = (target - current) * (1 - Math.pow(1 - 0.11, dt / 16.7));
      const cap = window.innerHeight * 2.4 * dt / 1000;   // top speed: 2.4 screens per second
      if (d > cap) d = cap; else if (d < -cap) d = -cap;
      current += d;
      if (Math.abs(target - current) < 0.5) { current = target; running = false; last = 0; }
      window.scrollTo(0, current);
      if (running) requestAnimationFrame(step);
    };
    const scrollsItself = (el) => {
      for (let n = el; n && n !== document.body && n !== root; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1) {
          const oy = getComputedStyle(n).overflowY;
          if (oy === "auto" || oy === "scroll") return true;
        }
      }
      return false;
    };
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (document.body.classList.contains("menu-open") || scrollsItself(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
      if (!running) current = target = window.scrollY;
      const [lo, hi] = bounds();
      target = Math.max(lo, Math.min(hi, target + e.deltaY * unit));
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    // Any other scroll (keys, scrollbar, links, autoplay) becomes the new resting point
    window.addEventListener("scroll", () => { if (!running) current = target = window.scrollY; }, { passive: true });
  })();

  /* ---------- 01 — Navigation ---------- */
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");

  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);

    // Hide on scroll down, reveal on scroll up (desktop only via CSS)
    if (!document.body.classList.contains("menu-open")) {
      const goingDown = y > lastY && y > window.innerHeight * 0.6;
      nav.classList.toggle("is-hidden", goingDown);
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  const setMenu = (open) => {
    const wasOpen = document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // Closed menu can't be reached with the keyboard or screen readers
    if ("inert" in menu) menu.inert = !open;
    if (open) {
      nav.classList.remove("is-hidden");
      const first = menu.querySelector("a");
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
    } else if (wasOpen && menu.contains(document.activeElement)) {
      toggle.focus({ preventScroll: true });
    }
  };
  if ("inert" in menu) menu.inert = true;

  toggle.addEventListener("click", () => {
    setMenu(!document.body.classList.contains("menu-open"));
  });

  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenu(false);
      toggle.focus({ preventScroll: true });
    }
  });

  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- 02 — Hero ---------- */
  const hero = document.querySelector(".hero");
  const heroVideo = document.getElementById("heroVideo");

  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("is-in")));

    // If the headline block is taller than the screen (short phones, small
    // windows), step it down until it fits below the nav instead of sliding under it
    const stageEl = hero.querySelector(".hero__stage");
    const innerEl = hero.querySelector(".hero__inner");
    const fitHero = () => {
      if (!stageEl || !innerEl) return;
      delete hero.dataset.fit;
      for (let lv = 1; lv <= 4 && innerEl.offsetHeight > stageEl.clientHeight; lv++) hero.dataset.fit = String(lv);
    };
    let fitW = 0, fitH = 0;
    const refit = () => {
      // mobile toolbars resize the window on every scroll; only refit on real changes
      const w = window.innerWidth, h = stageEl ? stageEl.clientHeight : 0;
      if (w === fitW && Math.abs(h - fitH) < 2) return;
      fitW = w; fitH = h;
      fitHero();
    };
    refit();
    window.addEventListener("resize", refit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitW = 0; refit(); });
    window.addEventListener("load", () => { fitW = 0; refit(); }, { once: true });
  }

  if (heroVideo) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection && navigator.connection.saveData;

    if (!reduceMotion && !saveData) {
      const isMobile = window.matchMedia("(max-width: 600px), (max-width: 1024px) and (orientation: portrait)").matches;
      const src = isMobile ? heroVideo.dataset.srcMobile : heroVideo.dataset.srcDesktop;

      const start = () => {
        heroVideo.src = src;
        heroVideo.load();
        heroVideo.addEventListener("playing", () => hero.classList.add("is-ready"), { once: true });
        heroVideo.addEventListener("canplay", () => {
          const p = heroVideo.play();
          if (p && p.catch) p.catch(() => {}); // autoplay blocked: poster stays
        }, { once: true });
      };

      // Let the poster + text paint first, then fetch the video
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });

      // Pause when off-screen to save battery
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
          if (!heroVideo.src) return;
          if (entry.isIntersecting) heroVideo.play().catch(() => {});
          else heroVideo.pause();
        }, { threshold: 0.05 }).observe(hero);
      }
    }
  }

  /* ---------- 02 + 03 — One continuous scene ----------
     The hero is pinned. Scrolling fades the headline, hands the video over
     to a frame sequence of a camera flight across the yard, which lands on
     the crane-lift shot; the lift then plays with the three statements.

     Everything on the stage follows a playhead rather than the raw scroll:
     the playhead chases the scroll at the scene's own pace (never faster than
     MAX_X times its natural speed), so hard flicks can't make the motion
     jump, and it never moves onto frames that haven't arrived yet: it waits,
     like a video buffering, instead of freezing and jumping. On landing the
     scene also plays by itself until the visitor takes over. */
  const story = document.getElementById("top");
  const canvas = document.getElementById("liftCanvas");

  if (story && canvas) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Opaque canvas: cheaper to composite every frame
    const ctx = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
    const portraitMQ = window.matchMedia("(max-width: 600px), (max-width: 1024px) and (orientation: portrait)");
    const FLY = 192, LIFT = 72, TOTAL = FLY + LIFT;
    // Scroll phases (fractions of the pinned scroll)
    const P_HEAD = 0.06, P_LIFT0 = 0.42;
    // Scroll → flight frame curve. Measured from the footage's motion so the
    // fast middle of the flight gets more scroll and the camera speed feels even.
    const FLY_LUT = [0.0, 0.0613, 0.1106, 0.1523, 0.1889, 0.2204, 0.2457, 0.2662, 0.284, 0.3006, 0.3172, 0.335, 0.356, 0.3782, 0.3995, 0.419, 0.4359, 0.4517, 0.4676, 0.484, 0.4999, 0.5158, 0.5332, 0.5547, 0.5846, 0.6167, 0.6503, 0.6895, 0.7307, 0.7791, 0.8356, 0.9084, 1.0];
    // Lift: skims the first second (rigging, barely moves), gives the scroll to the lift itself
    const LIFT_LUT = [0.0, 0.0739, 0.1479, 0.1875, 0.2134, 0.2393, 0.2651, 0.291, 0.3169, 0.3428, 0.3687, 0.3945, 0.4204, 0.4463, 0.4722, 0.4981, 0.5239, 0.5498, 0.5757, 0.6016, 0.6275, 0.6533, 0.6792, 0.7051, 0.731, 0.7569, 0.7827, 0.8086, 0.8345, 0.8706, 0.9137, 0.9569, 1.0];
    // Hero video: a 0–8s camera move played forward then backward (16.04s loop).
    // Its forward half is also kept as frames (6 fps) so the canvas can take
    // over on the exact frame the video is showing.
    const VID_PERIOD = 16.04, VID_HALF = 8.02, HERO_FPS = 6, HERO_N = 48;
    // Natural pace of each part (seconds). Autoplay runs at this pace; scrolling
    // can go up to MAX_X times faster but never more.
    const DUR_HAND = 1.4, DUR_FLY = 7.5, DUR_LIFT = 9, MAX_X = 2.4;

    const stage = story.querySelector(".hero__stage");
    const inner = story.querySelector(".hero__inner");
    const heroShade = story.querySelector(".hero__shade");
    const liftShade = story.querySelector(".lift__shade");
    const label = story.querySelector(".lift__label");
    const progressEl = story.querySelector(".lift__progress");
    const anchor = document.getElementById("lift");
    const vid = document.getElementById("heroVideo");
    const stmts = [...story.querySelectorAll(".lift__stmt")].map((el) => ({
      el, range: el.dataset.range.split(",").map(Number),
    }));
    const steps = [...story.querySelectorAll(".lift__step")];
    const bars = [...story.querySelectorAll(".lift__bar i")];

    if (!reduce) story.classList.add("has-story");

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smooth = (t) => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;

    let frames = [], heroFrames = [], fDone = new Uint8Array(TOTAL), hDone = new Uint8Array(HERO_N);
    let set = "";
    let heroU = 0;            // video time (forward-clip seconds) at the freeze
    let pausedByUs = false;
    let pRaw = 0, P = 0, vel = 0, onScreen = true, canvasOn = false, needsDraw = true;
    let lastKey = -1, raf = 0, lastT = 0;
    let auto = null;          // autoplay state while the scene plays by itself
    let stall = 0, gateOff = false, lastLoadAt = 0;

    const framePath = (s, i) => i < FLY
      ? `assets/flight/${s}/${String(i + 1).padStart(3, "0")}.jpg`
      : `assets/lift/${s}/${String(i - FLY + 1).padStart(3, "0")}.jpg`;
    const heroPath = (s, k) => `assets/heroseq/${s}/${String(k).padStart(3, "0")}.jpg`;

    // Where the hero video is in its forward clip (seconds)
    const readVidU = () => {
      if (!vid || !vid.src || !story.classList.contains("is-ready")) return 0;
      const tt = (vid.currentTime || 0) % VID_PERIOD;
      return Math.min(VID_HALF, tt <= VID_HALF ? tt : VID_PERIOD - tt);
    };

    // ---- Timeline -----------------------------------------------------------
    const lut = (u, T = FLY_LUT) => {
      const x = clamp01(u) * (T.length - 1), i = Math.floor(x);
      return i >= T.length - 1 ? 1 : lerp(T[i], T[i + 1], x - i);
    };
    // Handover: video freezes at T0, the camera eases back to the flight's first
    // frame (a short move, longer only if the video was far into its push-in),
    // and the truck starts moving while the headline is still lifting away.
    const T0 = 0.012;
    const flyStart = () => T0 + 0.006 + 0.026 * (heroU / VID_HALF);
    // Position on the timeline: v in [-1, 0) is the hero camera easing back,
    // v >= 0 is the flight (0…191) then the lift (191…263)
    const targetIndex = (p) => {
      if (p <= T0) return -1;
      const P_FLY0 = flyStart();
      if (p <= P_FLY0) return -1 + smooth((p - T0) / (P_FLY0 - T0));
      if (p < P_LIFT0) {
        // short ease-in so the flight launches from the settled camera
        const u = (p - P_FLY0) / (P_LIFT0 - P_FLY0), A = 0.07, c = 1 / (1 - A / 2);
        return Math.min(FLY - 1, lut(u < A ? (u * u / (2 * A)) * c : (u - A / 2) * c) * (FLY - 1));
      }
      return Math.min(TOTAL - 1, FLY - 1 + lut((p - P_LIFT0) / (1 - P_LIFT0), LIFT_LUT) * LIFT);
    };
    const pace = (p) => {
      const fs = flyStart();
      if (p < fs) return fs / DUR_HAND;
      if (p < P_LIFT0) return (P_LIFT0 - fs) / DUR_FLY;
      return (1 - P_LIFT0) / DUR_LIFT;
    };
    const curIdx = () => Math.max(0, Math.floor(targetIndex(P)));

    // ---- Loading ------------------------------------------------------------
    // Always fetches what the playhead needs next: the hero frames for the
    // handover, then the frames just ahead, then the rest. Before the visitor
    // scrolls (or the hero has played a moment) only the first frames load, so
    // the hero video never competes with them.
    const MAX_LOADS = 6;
    let gen = 0, loading = 0, started = false, inflight = new Set();
    const heroNeed = () => Math.min(HERO_N, Math.ceil((P > T0 ? heroU : readVidU()) * HERO_FPS) + 2);
    const pick = () => {
      const tryF = (a, b) => { for (let i = a; i < b; i++) if (!fDone[i] && !inflight.has(i)) return { hero: false, i }; return null; };
      const tryH = (a, b) => { for (let k = a; k < b; k++) if (!hDone[k] && !inflight.has(-1 - k)) return { hero: true, i: k }; return null; };
      const tryBack = (c) => { for (let i = c - 1; i >= 0; i--) if (!fDone[i] && !inflight.has(i)) return { hero: false, i }; return null; };
      if (!started) return tryH(0, 1) || tryF(0, 1);
      const c = curIdx(), early = P < P_LIFT0;
      return (early && tryH(0, Math.min(HERO_N, heroNeed() + 4))) || tryF(c, Math.min(TOTAL, c + 40)) ||
        (early && tryH(0, HERO_N)) || tryF(c, TOTAL) || tryH(0, HERO_N) || tryBack(c);
    };
    const pump = () => {
      while (set && loading < (started ? MAX_LOADS : 2)) {
        const job = pick();
        if (!job) return;
        const g = gen, key = job.hero ? -1 - job.i : job.i;
        inflight.add(key);
        loading++;
        const img = new Image();
        img.decoding = "async";
        let fin = false;
        const finish = (ok) => {
          if (fin) return;
          fin = true;
          loading--;
          lastLoadAt = performance.now();
          if (g === gen) {
            inflight.delete(key);
            if (ok) (job.hero ? heroFrames : frames)[job.i] = img;
            (job.hero ? hDone : fDone)[job.i] = 1;
            needsDraw = true;
            kick();
          }
          pump();
        };
        // decode() prepares the pixels off the main thread, so drawing the
        // frame later doesn't stall the animation
        img.onload = () => { if (img.decode) img.decode().then(() => finish(true), () => finish(true)); else finish(true); };
        img.onerror = () => finish(false);
        img.src = job.hero ? heroPath(set, job.i) : framePath(set, job.i);
      }
    };
    const loadSet = (s) => {
      set = s;
      gen++;
      inflight = new Set();
      frames = new Array(TOTAL);
      heroFrames = new Array(HERO_N);
      fDone = new Uint8Array(TOTAL);
      hDone = new Uint8Array(HERO_N);
      needsDraw = true;
      pump();
    };
    const startLoading = () => { if (!started) { started = true; pump(); } };

    // Furthest point the playhead may reach with the frames that have arrived
    const gateP = () => {
      if (gateOff) return 1;
      const need = heroNeed();
      for (let k = 0; k < need; k++) if (!hDone[k]) return T0;
      if (!fDone[0]) return T0;
      let i = curIdx();
      while (i < TOTAL && fDone[i]) i++;
      if (i >= TOTAL) return 1;
      const lim = i - 1;                       // last ready frame in a row
      if (targetIndex(P) > lim) return P;
      let lo = P, hi = 1;
      for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (targetIndex(m) <= lim) lo = m; else hi = m; }
      return lo;
    };
    const bufferLevel = () => {
      const c = curIdx(), n = Math.min(TOTAL, c + 40) - c;
      let k = 0;
      for (let i = c; i < c + n; i++) if (fDone[i]) k++;
      let h = 0;
      for (let j = 0; j < HERO_N; j++) if (hDone[j]) h++;
      return P < flyStart() ? (h / HERO_N + k / Math.max(1, n)) / 2 : k / Math.max(1, n);
    };

    // Small "loading" line, shown only if the scene has to wait for frames
    const buf = document.createElement("div");
    buf.className = "lift__buffer";
    buf.setAttribute("aria-hidden", "true");
    buf.innerHTML = "<i></i>";
    stage.appendChild(buf);
    const bufFill = buf.firstChild;

    // ---- Drawing ------------------------------------------------------------
    const srcOf = (hero, i) => (hero ? heroFrames : frames)[i] || null;

    const sizeCanvas = () => {
      // No more pixels than the frames need (1600 / 720 wide frames): sharper is
      // impossible, and every extra pixel is drawn twice per frame
      const cap = (portraitMQ.matches ? 800 : 1920) / Math.max(1, canvas.clientWidth);
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, cap));
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      // Setting the size clears the canvas, so only touch it when it really
      // changed (mobile toolbars fire resize events on every scroll direction change)
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w;
      canvas.height = h;
      needsDraw = true;
    };

    const nearestIdx = (store, n, i) => {
      for (let d = 0; d < n; d++) {
        if (store[i - d]) return i - d;
        if (store[i + d]) return i + d;
      }
      return -1;
    };

    // Where to draw a frame. Starts exactly where the hero video sits
    // (cover, same object-position) and eases to the lift framing.
    const rectFor = (img, fi) => {
      const cw = canvas.width, ch = canvas.height;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const landscape = set === "landscape";
      const base = Math.max(cw / iw, ch / ih);
      const w0 = iw * base, h0 = ih * base;
      const x0 = (cw - w0) * (landscape ? 0.62 : 0.5), y0 = (ch - h0) * 0.5;
      // During the lift the camera keeps creeping in, so the shot never sits still
      const lz = fi > FLY - 1 ? smooth(clamp01((fi - (FLY - 1)) / LIFT)) : 0;
      const ez = (landscape ? 1.12 : 1) * (1 + 0.07 * lz);
      const ew = w0 * ez, eh = h0 * ez;
      const ex = landscape ? 0 : (cw - ew) * 0.5, ey = (ch - eh) * 0.5;
      const f = smooth(clamp01(fi / (FLY - 1)));
      return [lerp(x0, ex, f), lerp(y0, ey, f), lerp(w0, ew, f), lerp(h0, eh, f)];
    };

    const paint = (A, B, t, r) => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = 1;
      ctx.drawImage(A, r[0], r[1], r[2], r[3]);
      if (B && B !== A && t > 0.01) {
        ctx.globalAlpha = t;
        ctx.drawImage(B, r[0], r[1], r[2], r[3]);
        ctx.globalAlpha = 1;
      }
    };

    // Neighbouring frames are blended, so the motion never steps
    const draw = (v) => {
      if (v < 0) {
        const hk = Math.min(HERO_N - 1, heroU * HERO_FPS * -v);
        const a = Math.floor(hk), t = hk - a;
        const ia = nearestIdx(heroFrames, HERO_N, a);
        const A = ia >= 0 ? srcOf(true, ia) : srcOf(false, Math.max(0, nearestIdx(frames, TOTAL, 0)));
        if (!A) return;
        const ib = a + 1 < HERO_N ? nearestIdx(heroFrames, HERO_N, a + 1) : -1;
        paint(A, ib >= 0 ? srcOf(true, ib) : null, t, rectFor(A, 0));
        return;
      }
      const a = Math.floor(v), t = v - a;
      const ia = nearestIdx(frames, TOTAL, a);
      if (ia < 0) return;
      const A = srcOf(false, ia);
      const ib = a + 1 < TOTAL && frames[a + 1] ? a + 1 : -1;
      paint(A, ib >= 0 ? srcOf(false, ib) : null, ia === a ? t : 0, rectFor(A, v));
    };

    const placeAnchor = () => {
      const total = story.offsetHeight - window.innerHeight;
      if (anchor) anchor.style.top = `${Math.round(total * P_LIFT0 + 2)}px`;
    };

    // ---- Everything on the stage, for one playhead position ----------------
    const apply = (p) => {
      // 1. Headline lifts away
      const textOut = smooth(clamp01(p / P_HEAD));
      inner.style.opacity = (1 - textOut).toFixed(3);
      inner.style.transform = textOut > 0 ? `translate3d(0, ${(-60 * textOut).toFixed(1)}px, 0)` : "";
      inner.style.visibility = textOut >= 1 ? "hidden" : "";

      // 2. Video hands over to the canvas. The video freezes and the canvas
      //    shows that same frame, then eases the camera back into the flight.
      if (vid && vid.src) {
        if (p > T0) {
          if (!vid.paused) { vid.pause(); pausedByUs = true; }
          const u = readVidU();
          if (Math.abs(u - heroU) > 1e-3) { heroU = u; needsDraw = true; }
        } else if (pausedByUs) {
          pausedByUs = false;
          vid.play().catch(() => {});
        }
      }
      const hand = smooth(clamp01((p - T0) / 0.012));
      canvas.style.opacity = hand.toFixed(3);
      const on = hand > 0 && onScreen;
      if (on && !canvasOn) needsDraw = true;
      canvasOn = on;
      heroShade.style.opacity = (1 - smooth(clamp01((p - P_HEAD) / 0.1))).toFixed(3);

      // 3. Frame
      const v = Math.min(TOTAL - 1, Math.max(-1, targetIndex(p)));
      const key = Math.round(v * (v < 0 ? 600 : 48));
      if (canvasOn && (key !== lastKey || needsDraw)) { draw(v); lastKey = key; needsDraw = false; }

      // 4. Lift UI — the shade settles in slowly like dusk, the label after it
      const lp = clamp01((p - P_LIFT0) / (1 - P_LIFT0));
      const dusk = smooth(clamp01((p - (P_LIFT0 - 0.12)) / 0.14));
      const ui = smooth(clamp01((p - (P_LIFT0 - 0.02)) / 0.05));
      liftShade.style.opacity = dusk.toFixed(3);
      label.style.opacity = ui.toFixed(3);
      progressEl.style.opacity = ui.toFixed(3);

      stmts.forEach(({ el, range: [a, b] }, i) => {
        const t = (lp - a) / (b - a);
        let o = 0, y = 40;
        if (p >= P_LIFT0 && t > 0 && t < 1) {
          const inT = clamp01(t / 0.25);
          const outT = i === stmts.length - 1 ? 0 : clamp01((t - 0.8) / 0.2);
          o = inT * (1 - outT);
          y = (1 - inT) * 40 - outT * 40;
        } else if (t >= 1 && i === stmts.length - 1) { o = 1; y = 0; }
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${y.toFixed(1)}px)`;
        steps[i] && steps[i].classList.toggle("is-active", p >= P_LIFT0 && t > 0);
      });
      bars.forEach((bar, i) => {
        const [a] = stmts[i].range, [b] = stmts[i + 1].range;
        bar.style.transform = `scaleX(${clamp01((lp - a) / (b - a)).toFixed(3)})`;
      });
    };

    // ---- Playhead loop ------------------------------------------------------
    const geometry = () => {
      const vh = window.innerHeight;
      const rect = story.getBoundingClientRect();
      return { vh, rect, total: story.offsetHeight - vh, top: rect.top + window.scrollY };
    };
    let lastApplied = -1;
    const tick = (now) => {
      raf = 0;
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
      lastT = now;
      const { vh, rect, total, top } = geometry();
      pRaw = total > 0 ? clamp01(-rect.top / total) : 0;
      onScreen = rect.bottom > 0 && rect.top < vh;

      let waiting = false;
      if (!onScreen) {
        P = pRaw; vel = 0;
      } else {
        const g = gateP();
        let nP;
        if (auto) {
          auto.t += dt;
          const want = pace(P) * smooth(clamp01(auto.t / 1.4));
          vel += (want - vel) * (1 - Math.exp(-dt * 3));
          nP = P + vel * dt;
        } else {
          const d = pRaw - P, lag = Math.abs(d);
          // A fast touch fling can't be slowed down, but the stage stays pinned,
          // so the scene simply follows at its own pace. Only when the page is
          // about to leave the scene does it hurry to finish.
          const boost = pRaw > 0.97 ? Math.max(0, lag - 0.04) * 30 : Math.max(0, lag - 0.3) * 3;
          const cap = pace(P) * MAX_X * (1 + boost);
          const want = Math.max(-cap, Math.min(cap, d * 5));
          vel += (want - vel) * (1 - Math.exp(-dt * 8));
          nP = P + vel * dt;
          if ((pRaw - nP) * d <= 0 || (lag < 2e-5 && Math.abs(vel) < 2e-4)) { nP = pRaw; vel = 0; }
        }
        if (nP > P && nP > g) {               // frames not here yet: wait for them
          waiting = g - P < 1e-4;
          nP = Math.max(P, g);
          vel = Math.min(vel, Math.max(0, (nP - P) / Math.max(dt, 1e-3)));
        }
        P = clamp01(nP);
        if (auto) {
          window.scrollTo(0, top + P * total);
          if (P >= 1) {
            // Scene finished: the rest of the page carries on at the same speed
            auto = null;
            if (scene.startTour) scene.startTour(Math.max(120, vel * total));
          }
        }
      }

      // Waiting at the handover: hold the video on its current frame, so the
      // frames it needs stop changing while they arrive
      if (waiting && P <= T0 + 1e-6 && vid && vid.src && !vid.paused) { vid.pause(); pausedByUs = true; }

      // Loading indicator (only after a real wait). Waiting only stops if the
      // network has gone quiet altogether (nothing arrived for 8 s).
      stall = waiting ? stall + dt : 0;
      gateOff = started && loading > 0 && performance.now() - lastLoadAt > 8000;
      buf.classList.toggle("is-on", stall > 0.35);
      if (stall > 0.35) bufFill.style.transform = `scaleX(${bufferLevel().toFixed(3)})`;

      if (P !== lastApplied || needsDraw) { apply(P); lastApplied = P; }
      if (auto || waiting || P !== pRaw || vel !== 0) raf = requestAnimationFrame(tick);
      else lastT = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // Wheel scrolling stays within reach of the playhead inside the scene, so
    // the page never runs ahead of the animation (or leaves it unfinished)
    scene.leash = () => {
      if (reduce || auto) return null;
      const { vh, total, top } = geometry();
      if (total <= 0 || window.scrollY > top + total + 2) return null;
      const yp = top + P * total, lead = vh * 0.45;
      let hi = yp + lead;
      if (P < 0.998) hi = Math.min(hi, top + total);
      return [yp - lead, hi];
    };

    // Read-only snapshot, handy when checking the scene in the browser console
    scene.state = () => ({ playhead: P, scroll: pRaw, autoplay: auto ? auto.phase : null, waiting: stall > 0,
      framesLoaded: fDone.reduce((a, b) => a + b, 0), heroFramesLoaded: hDone.reduce((a, b) => a + b, 0) });
    window.__alwardiScene = scene.state;

    // ---- Autoplay on landing ------------------------------------------------
    // Two seconds after the page appears the scene starts moving on its own,
    // then the whole page carries on (see "Autoplay tour" below).
    // Any wheel, touch, click or key hands control straight back.
    const conn = navigator.connection || {};
    const frugal = !!conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "");
    let autoArmed = !reduce && !frugal && !location.hash;
    const stopAuto = () => {
      autoArmed = false;
      if (auto) { auto = null; kick(); }
    };
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((ev) =>
      window.addEventListener(ev, stopAuto, { passive: true, capture: true }));
    const tryAuto = () => {
      if (!autoArmed || auto) return;
      if (window.scrollY > 4) { autoArmed = false; return; }
      if (document.visibilityState !== "visible") {
        document.addEventListener("visibilitychange", () => setTimeout(tryAuto, 1200), { once: true });
        return;
      }
      startLoading();
      // If frames are still arriving, the playhead simply waits for them
      autoArmed = false;
      auto = { phase: "story", t: 0 };
      vel = 0;
      kick();
    };
    let autoTimer = 0;
    const armAuto = (ms) => { if (autoArmed && !autoTimer) autoTimer = setTimeout(tryAuto, ms); };

    if (!reduce) {
      sizeCanvas();
      placeAnchor();
      loadSet(portraitMQ.matches ? "portrait" : "landscape");
      // The rest of the frames load as soon as the page has loaded (or on the
      // first scroll), ready for the autoplay at 2 s. Data-saver / slow
      // connections only load them when the visitor actually scrolls.
      ["scroll", "wheel", "touchstart", "keydown"].forEach((ev) =>
        window.addEventListener(ev, startLoading, { once: true, passive: true }));
      if (!frugal) {
        armAuto(2000);
        if (document.readyState === "complete") startLoading();
        else window.addEventListener("load", startLoading, { once: true });
      }
      window.addEventListener("scroll", kick, { passive: true });
      window.addEventListener("resize", () => { sizeCanvas(); placeAnchor(); needsDraw = true; kick(); });
      portraitMQ.addEventListener("change", (e) => {
        loadSet(e.matches ? "portrait" : "landscape");
        sizeCanvas(); needsDraw = true; kick();
      });
      apply(0);
      kick();
    } else {
      // Reduced motion: keep the plain video hero; hide the sequence layers
      [canvas, liftShade, label, progressEl, story.querySelector(".lift__statements")].forEach((el) => el && (el.style.display = "none"));
    }
  }

  /* ---------- Autoplay tour ----------
     When the hero scene has played by itself, the page keeps moving down to
     the footer: one continuous glide, slower where there is more to take in
     (the Construction story, the quote form). Any wheel, touch, click or key
     stops it for good, so the visitor is always in control. */
  (() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = [...document.querySelectorAll("main > section, main > footer")];
    // Screens per second, per section
    const SPEED = { about: 0.34, services: 0.4, construction: 0.36, statement: 0.4, partners: 0.4, contact: 0.3, footer: 0.42 };
    let on = false, y = 0, v = 0, last = 0, raf = 0, tops = [];
    const measure = () => {
      let t = blocks.length ? blocks[0].offsetTop : 0;
      tops = blocks.map((el) => { const a = t; t += el.offsetHeight; return [a, t, SPEED[el.id] || 0.4]; });
    };
    const speedAt = (probe) => {
      for (const [a, b, sp] of tops) if (probe >= a && probe < b) return sp;
      return 0.4;
    };
    const stop = () => { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((ev) =>
      window.addEventListener(ev, stop, { passive: true, capture: true }));
    const step = (now) => {
      raf = 0;
      if (!on) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const vh = window.innerHeight;
      const maxY = document.documentElement.scrollHeight - vh;
      // eases between section speeds, and settles gently on the very end
      const want = Math.min(speedAt(y + vh * 0.5) * vh, Math.max(0, maxY - y) * 0.9 + 6);
      v += (want - v) * (1 - Math.exp(-dt * 1.5));
      y = Math.min(maxY, y + v * dt);
      window.scrollTo(0, y);
      if (y >= maxY - 0.5) { on = false; return; }
      raf = requestAnimationFrame(step);
    };
    scene.startTour = (v0) => {
      measure();
      y = window.scrollY;
      v = v0;
      last = 0;
      on = true;
      if (!raf) raf = requestAnimationFrame(step);
    };
    window.addEventListener("resize", () => { if (on) measure(); });
    window.__alwardiTour = () => on;
  })();

  /* ---------- 05 — Services: truck drive + fleet preview ---------- */
  const drive = document.getElementById("drive");
  const truck = document.getElementById("driveTruck");
  const driveFill = document.getElementById("driveFill");

  if (drive && truck && driveFill) {
    let dTick = false;
    const renderDrive = () => {
      dTick = false;
      const rect = drive.getBoundingClientRect();
      const total = drive.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      const vw = window.innerWidth;
      const tw = truck.offsetWidth;
      // Truck travels from fully off-screen left to fully off-screen right
      const x = -tw + p * (vw + tw);
      truck.style.transform = `translate(${x.toFixed(1)}px, -8%)`;
      // The word fills in solid behind the truck's rear
      const reveal = Math.min(100, Math.max(0, (x / vw) * 100));
      driveFill.style.clipPath = `inset(0 ${(100 - reveal).toFixed(2)}% 0 0)`;
    };
    const onDrive = () => { if (!dTick) { dTick = true; requestAnimationFrame(renderDrive); } };
    window.addEventListener("scroll", onDrive, { passive: true });
    window.addEventListener("resize", onDrive);
    truck.addEventListener("load", renderDrive);
    renderDrive();
  }

  const fleetList = document.getElementById("fleetList");
  if (fleetList) {
    const items = [...fleetList.querySelectorAll(".fleet__item")];
    const imgs = [...document.querySelectorAll(".fleet__img")];
    const badge = document.getElementById("fleetBadge");
    const setActive = (i) => {
      items.forEach((el, k) => el.classList.toggle("is-active", k === i));
      imgs.forEach((el, k) => el.classList.toggle("is-active", k === i));
      if (badge) badge.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b> ${imgs[i].dataset.name}`;
    };
    items.forEach((el, i) => {
      el.addEventListener("mouseenter", () => setActive(i));
      el.querySelector("a").addEventListener("focus", () => setActive(i));
      el.querySelector("a").addEventListener("click", (e) => {
        window.__alwardiService = e.currentTarget.dataset.service;
        document.dispatchEvent(new CustomEvent("alwardi:service", { detail: window.__alwardiService }));
      });
    });
  }

  /* ---------- 06 — Construction: full-screen expand ---------- */
  const cx = document.getElementById("cx");
  if (cx && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const stage = cx.querySelector(".cx__stage");
    const frame = cx.querySelector(".cx__frame");
    const img = cx.querySelector(".cx__img");
    const gapEl = cx.querySelector(".cx__gap");
    const eyebrow = cx.querySelector(".cx__eyebrow");
    const l1 = cx.querySelector(".cx__l1");
    const l2 = cx.querySelector(".cx__l2");
    const shade = cx.querySelector(".cx__shade");
    const tag = cx.querySelector(".cx__tag");
    const intro = cx.querySelector(".cx__intro");
    const meter = cx.querySelector(".cx__meter");
    const numEl = document.getElementById("cxNum");
    const segs = [...cx.querySelectorAll(".cx__segs i")];
    const projs = [...cx.querySelectorAll(".cx__proj")].map((el) => ({
      el, parts: [el.querySelector(".cx__num"), el.querySelector(".cx__title"), el.querySelector(".cx__client")],
    }));
    const N = projs.length;
    const c01 = (v) => Math.min(1, Math.max(0, v));
    const sm = (t) => t * t * (3 - 2 * t);
    const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;

    // Phases (fractions of the pinned scroll)
    const P_EXP = 0.2;                     // window opens to full screen
    const P_IN0 = 0.215, P_IN1 = 0.355;     // intro paragraph
    const P_PR0 = 0.37, P_PR1 = 0.975;     // seven projects

    cx.classList.add("is-cine");
    if (cx.parentElement) cx.parentElement.classList.add("is-cine-host");
    img.removeAttribute("loading");

    let box = null, cTick = false, lastIdx = -2;
    const measure = () => {
      // The window starts exactly where the gap between the two headline lines is
      // (layout offsets, so section transforms from the scene change don't skew it)
      let x = 0, y = 0;
      for (let n = gapEl; n && n !== stage; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      box = { l: x, t: y, w: gapEl.offsetWidth, h: gapEl.offsetHeight, W: stage.clientWidth, H: stage.clientHeight };
    };

    const render = () => {
      cTick = false;
      const vh = window.innerHeight;
      const rect = cx.getBoundingClientRect();
      if (rect.bottom < -vh * 0.2 || rect.top > vh * 1.2) return;
      if (!box) measure();
      const total = cx.offsetHeight - vh;
      const p = total > 0 ? c01(-rect.top / total) : 0;
      const { l, t, w, h, W, H } = box;

      // 1. The window opens to full screen, pushing the headline apart
      const e = inOut(c01(p / P_EXP));
      const ct = t * (1 - e), cl = l * (1 - e), cr = (W - l - w) * (1 - e), cb = (H - t - h) * (1 - e);
      frame.style.clipPath = `inset(${ct.toFixed(1)}px ${cr.toFixed(1)}px ${cb.toFixed(1)}px ${cl.toFixed(1)}px round ${(4 * (1 - e)).toFixed(2)}px)`;
      const up = ct - t, down = (H - cb) - (t + h);
      const fade = (1 - c01((e - 0.45) / 0.4)).toFixed(3);
      l1.style.transform = eyebrow.style.transform = `translate3d(0, ${up.toFixed(1)}px, 0)`;
      l2.style.transform = `translate3d(0, ${down.toFixed(1)}px, 0)`;
      l1.style.opacity = l2.style.opacity = eyebrow.style.opacity = fade;

      // 2. Camera: pulls back as the window opens, then tilts from the
      //    skyline down to the sea wall with a slow push-in
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (iw && ih) {
        const tilt = sm(c01((p - P_EXP * 0.6) / (P_PR1 - P_EXP * 0.6)));
        const zoom = lerp(1.3, 1.04, e) + 0.12 * tilt;
        const sc = Math.max(W / iw, H / ih) * zoom;
        const dw = iw * sc, dh = ih * sc;
        const x = (W - dw) * 0.5;
        const y = (H - dh) * lerp(0.16, 0.86, tilt);
        img.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(5)})`;
      }

      // 3. Shade + labels once the photo is full screen
      shade.style.opacity = sm(c01((p - P_EXP * 0.75) / 0.07)).toFixed(3);
      tag.style.opacity = sm(c01((p - P_EXP) / 0.04)).toFixed(3);

      // 4. Intro paragraph
      const inA = sm(c01((p - P_IN0) / 0.035)), inB = sm(c01((p - (P_IN1 - 0.03)) / 0.03));
      intro.style.opacity = (inA * (1 - inB)).toFixed(3);
      intro.style.transform = `translate3d(0, ${((1 - inA) * 40 - inB * 30).toFixed(1)}px, 0)`;

      // 5. Projects, one at a time (number, title, client staggered)
      const slot = (P_PR1 - P_PR0) / N;
      let idx = -1;
      projs.forEach(({ el, parts }, i) => {
        const lt = (p - P_PR0 - i * slot) / slot;
        const last = i === N - 1;
        if (lt > 0) idx = i;
        let o = 0;
        parts.forEach((part, k) => {
          const enter = sm(c01((lt - k * 0.06) / 0.22));
          const exit = last ? 0 : sm(c01((lt - 0.8 - k * 0.03) / 0.17));
          const y = (1 - enter) * 60 - exit * 50;
          const op = enter * (1 - exit);
          part.style.opacity = op.toFixed(3);
          part.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
          o = Math.max(o, op);
        });
        el.style.opacity = o > 0.001 ? "1" : "0";
        if (segs[i]) segs[i].style.setProperty("--f", c01(lt / 0.8).toFixed(3));
      });
      meter.style.opacity = sm(c01((p - (P_PR0 - 0.02)) / 0.04)).toFixed(3);
      if (idx !== lastIdx && numEl) { numEl.textContent = String(Math.max(1, idx + 1)).padStart(2, "0"); lastIdx = idx; }
    };

    const onCx = () => { if (!cTick) { cTick = true; requestAnimationFrame(render); } };
    window.addEventListener("scroll", onCx, { passive: true });
    window.addEventListener("resize", () => { box = null; onCx(); });
    img.addEventListener("load", onCx);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { box = null; onCx(); });
    render();
  }

  /* ---------- 07 — Statement parallax ---------- */
  const stMedia = document.getElementById("statementMedia");
  if (stMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const st = stMedia.parentElement;
    let sTick = false;
    const renderSt = () => {
      sTick = false;
      const r = st.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      // -1 when the section enters from below, +1 when it leaves at the top
      const t = (r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2 + r.height / 2);
      stMedia.style.transform = `translate3d(0, ${(t * 9).toFixed(2)}%, 0)`;
    };
    window.addEventListener("scroll", () => { if (!sTick) { sTick = true; requestAnimationFrame(renderSt); } }, { passive: true });
    renderSt();
  }

  /* ---------- Section transitions: cinematic scene change ---------- */
  const sceneTargets = [...document.querySelectorAll("[data-scene]")];
  if (sceneTargets.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const blocks = [...document.querySelectorAll("main > section, main > footer")];

    // One veil per block; zoom applies to each block's direct children
    const veilOf = new Map();
    blocks.forEach((el) => {
      const v = document.createElement("div");
      v.className = "scene-veil";
      v.setAttribute("aria-hidden", "true");
      el.appendChild(v);
      veilOf.set(el, v);
      [...el.children].forEach((c) => { if (c !== v && !c.hasAttribute("data-animate")) c.classList.add("scene-zoom"); });
    });

    const scenes = sceneTargets
      .map((target) => ({ target, prev: target.previousElementSibling }))
      .filter((s) => s.prev);
    scenes.forEach((s) => s.prev.classList.add("is-scene-prev"));

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const smooth = (t) => t * t * (3 - 2 * t);
    let scTick = false;

    const renderScenes = () => {
      scTick = false;
      const vh = window.innerHeight;
      const dim = new Map();
      const zoom = new Map();

      scenes.forEach((s) => {
        // b: where the boundary sits on screen (1 = bottom edge, 0 = top edge)
        const b = s.target.getBoundingClientRect().top / vh;
        if (b > 1.05 || b < -0.1) return;
        // Outgoing scene darkens and eases back as the boundary climbs to mid-screen
        const out = smooth(clamp01((1 - b) / 0.5));
        // Incoming scene is black until mid-screen, then fades up and settles
        const inn = smooth(clamp01((0.5 - b) / 0.42));
        dim.set(s.prev, Math.max(dim.get(s.prev) || 0, out * 0.94));
        dim.set(s.target, Math.max(dim.get(s.target) || 0, (1 - inn) * 0.94));
        zoom.set(s.prev, { s: 1 - out * 0.035, o: vh * 0.5 - s.prev.getBoundingClientRect().top });
        zoom.set(s.target, { s: 1.07 - inn * 0.07, o: vh * 0.5 - s.target.getBoundingClientRect().top });
      });

      blocks.forEach((el) => {
        const d = dim.get(el) || 0;
        veilOf.get(el).style.setProperty("--dim", d.toFixed(3));
        const z = zoom.get(el);
        if (z && Math.abs(z.s - 1) > 0.0005) {
          el.style.setProperty("--zoom-t", `scale(${z.s.toFixed(4)})`);
          el.style.setProperty("--zoom-o", `50% ${z.o.toFixed(0)}px`);
        } else {
          el.style.setProperty("--zoom-t", "none");
        }
      });

    };

    const onScene = () => { if (!scTick) { scTick = true; requestAnimationFrame(renderScenes); } };
    renderScenes();
    window.addEventListener("scroll", onScene, { passive: true });
    window.addEventListener("resize", onScene);
  }

  /* ---------- 11 — Get a quote: reveal, backdrop drift, 3-step form ---------- */
  const contact = document.getElementById("contact");
  if (contact) {
    const reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceQ || !("IntersectionObserver" in window)) contact.classList.add("is-in");
    else {
      new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) { contact.classList.add("is-in"); obs.disconnect(); }
      }, { threshold: 0.18 }).observe(contact);
    }
    // The crane shot behind slowly settles as the section scrolls through
    const bgImg = contact.querySelector(".contact__bg img");
    if (bgImg && !reduceQ) {
      let qTick = false;
      const drift = () => {
        qTick = false;
        const r = contact.getBoundingClientRect(), vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        const q = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        bgImg.style.setProperty("--bgs", (1.16 - 0.1 * q).toFixed(4));
        bgImg.style.setProperty("--bgy", `${((0.5 - q) * 6).toFixed(2)}%`);
      };
      window.addEventListener("scroll", () => { if (!qTick) { qTick = true; requestAnimationFrame(drift); } }, { passive: true });
      drift();
    }
  }

  const form = document.getElementById("quoteForm");
  if (form) {
    const done = document.getElementById("quoteDone");
    const doneName = document.getElementById("quoteDoneName");
    const again = document.getElementById("quoteAgain");
    const steps = [...form.querySelectorAll(".qstep")];
    const bars = [...form.querySelectorAll(".quote__bar i")];
    const stepNum = document.getElementById("qStepNum");
    const sum = document.getElementById("qSum");
    const back = form.querySelector(".quote__back");
    const next = form.querySelector(".quote__next");
    const submit = form.querySelector(".quote__submit");
    const note = form.querySelector(".quote__note");
    let cur = 0;

    const rules = {
      service: (v) => !!v || "Please choose what you need.",
      name: (v) => v.trim().length >= 2 || "Please enter your name.",
      phone: (v) => v.replace(/[^0-9]/g, "").length >= 8 || "Please enter a valid phone number.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
    };
    const valueOf = (name) => (form.elements[name] ? form.elements[name].value || "" : "");
    const nodesOf = (name) => {
      const el = form.elements[name];
      return !el ? [] : (typeof el.length === "number" && !el.tagName ? [...el] : [el]);
    };
    const check = (name) => {
      const rule = rules[name];
      if (!rule) return true;
      const res = rule(valueOf(name));
      const ok = res === true;
      const nodes = nodesOf(name);
      const field = nodes[0] && nodes[0].closest(".field");
      if (field) {
        field.classList.toggle("is-invalid", !ok);
        const err = field.querySelector(".field__error");
        if (err) err.textContent = ok ? "" : res;
      }
      nodes.forEach((n) => n.setAttribute("aria-invalid", String(!ok)));
      return ok;
    };
    const namesIn = (i) => [...new Set([...steps[i].querySelectorAll("[name]")].map((el) => el.name))];
    const validStep = (i) => {
      const bad = namesIn(i).filter((n) => !check(n));
      if (bad.length) { const first = nodesOf(bad[0])[0]; if (first) first.focus(); return false; }
      return true;
    };

    const fmtDate = (v) => {
      if (!v) return "";
      const d = new Date(`${v}T00:00:00`);
      return isNaN(d) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };
    const go = (i, focus = true) => {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach((st, k) => {
        st.classList.toggle("is-current", k === cur);
        st.classList.toggle("is-before", k < cur);
        st.setAttribute("aria-hidden", String(k !== cur));
        if ("inert" in st) st.inert = k !== cur;
      });
      bars.forEach((b, k) => b.classList.toggle("is-on", k <= cur));
      if (stepNum) stepNum.textContent = String(cur + 1).padStart(2, "0");
      back.hidden = cur === 0;
      next.hidden = cur === steps.length - 1;
      submit.hidden = cur !== steps.length - 1;
      if (cur === steps.length - 1 && sum) {
        sum.textContent = [valueOf("service"), valueOf("location").trim(), fmtDate(valueOf("date"))].filter(Boolean).join("  ·  ");
      }
      if (focus) {
        const target = steps[cur].querySelector("input:checked") ||
          steps[cur].querySelector("input:not([type=radio]), textarea") || steps[cur].querySelector("input");
        if (target) setTimeout(() => target.focus({ preventScroll: true }), 120);
      }
    };

    next.addEventListener("click", () => { if (validStep(cur)) go(cur + 1); });
    back.addEventListener("click", () => go(cur - 1));

    // Picking a service with a click/tap moves on by itself. Keyboard users move
    // between options with the arrow keys, so for them it waits for Continue.
    let auto = 0, pointerAt = 0;
    const picks = form.querySelector(".picks");
    if (picks) picks.addEventListener("pointerdown", () => { pointerAt = Date.now(); });
    nodesOf("service").forEach((r) => r.addEventListener("change", () => {
      check("service");
      clearTimeout(auto);
      if (cur === 0 && Date.now() - pointerAt < 1000) auto = setTimeout(() => go(1), 420);
    }));

    // Coming from a fleet card: that service is already chosen
    const preselect = (name) => {
      const r = nodesOf("service").find((el) => el.value === name);
      if (r) { r.checked = true; check("service"); }
    };
    preselect(window.__alwardiService);
    document.addEventListener("alwardi:service", (e) => preselect(e.detail));

    form.querySelectorAll(".ctl input, .ctl textarea").forEach((el) => {
      el.addEventListener("blur", () => { if (el.value) check(el.name); });
      el.addEventListener("input", () => { if (el.closest(".field").classList.contains("is-invalid")) check(el.name); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Enter on an earlier step just moves forward
      if (cur < steps.length - 1) { if (validStep(cur)) go(cur + 1); return; }
      for (let i = 0; i < steps.length; i++) {
        if (namesIn(i).map(check).includes(false)) { go(i, false); validStep(i); return; }
      }
      const data = Object.fromEntries(new FormData(form).entries());
      submit.disabled = true;

      // When deployed, set data-endpoint on the form (e.g. a Vercel function
      // or form service). Without one, the demo just shows the confirmation.
      const endpoint = form.dataset.endpoint;
      try {
        if (endpoint) {
          const r = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!r.ok) throw new Error("Request failed");
        } else {
          await new Promise((r) => setTimeout(r, 700));
        }
        doneName.textContent = data.name ? `, ${data.name.trim().split(" ")[0]}` : "";
        form.hidden = true;
        done.hidden = false;
        done.focus();
      } catch (err) {
        note.textContent = "Sorry, something went wrong. Please call +973 1773 0626.";
        note.style.color = "var(--accent-on-dark)";
      } finally {
        submit.disabled = false;
      }
    });

    again.addEventListener("click", () => {
      form.reset();
      form.querySelectorAll(".is-invalid").forEach((f) => f.classList.remove("is-invalid"));
      done.hidden = true;
      form.hidden = false;
      go(0);
    });

    go(0, false);
  }

  /* ---------- 12 — Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Shared: reveal on scroll + counters ---------- */
  const reduceMotionAll = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotionAll || target < 2) { el.textContent = target; return; }
    const dur = 1600;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const revealEls = document.querySelectorAll("[data-animate]");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-count]").forEach(runCounter);
        ro.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => ro.observe(el));
  } else {
    revealEls.forEach((el) => {
      el.classList.add("is-visible");
      el.querySelectorAll("[data-count]").forEach(runCounter);
    });
  }

  /* Active link + in-page links.
     Sections pin (sticky) during transitions, so on-screen boxes don't match
     their place in the page. Use each block's position in normal flow instead. */
  const links = [...document.querySelectorAll(".nav__link")];
  const flowBlocks = [...document.querySelectorAll("main > section, main > footer")];
  let flowTops = new Map();
  const measureFlow = () => {
    const main = document.querySelector("main");
    let y = main.getBoundingClientRect().top + window.scrollY;
    flowTops = new Map();
    flowBlocks.forEach((el) => { flowTops.set(el, y); y += el.offsetHeight; });
  };
  const flowTopOf = (el) => {
    const block = el.closest("main > section, main > footer");
    if (!block || !flowTops.has(block)) return el.getBoundingClientRect().top + window.scrollY;
    // element inside a block: offset within the block (untransformed)
    let off = 0, n = el;
    while (n && n !== block) { off += n.offsetTop; n = n.offsetParent; }
    return flowTops.get(block) + (n === block ? off : 0);
  };

  const navTargets = links
    .map((l) => ({ link: l, el: document.querySelector(l.getAttribute("href")) }))
    .filter((t) => t.el);

  let aTick = false;
  const updateActive = () => {
    aTick = false;
    const probe = window.scrollY + window.innerHeight * 0.4;
    let current = navTargets[0];
    navTargets.forEach((t) => { if (flowTopOf(t.el) <= probe) current = t; });
    links.forEach((l) => l.classList.toggle("is-active", current && l === current.link));
  };
  measureFlow();
  updateActive();
  window.addEventListener("scroll", () => { if (!aTick) { aTick = true; requestAnimationFrame(updateActive); } }, { passive: true });
  window.addEventListener("resize", () => { measureFlow(); updateActive(); });
  window.addEventListener("load", () => { measureFlow(); updateActive(); });
  if ("ResizeObserver" in window) {
    const ro3 = new ResizeObserver(() => measureFlow());
    flowBlocks.forEach((el) => ro3.observe(el));
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    const el = id === "#top" ? document.body : document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const y = id === "#top" ? 0 : flowTopOf(el);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
    if (history.replaceState) history.replaceState(null, "", id);
  });
})();
