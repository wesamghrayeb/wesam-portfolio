/* Wesam Ghrayeb — portfolio interactions. No dependencies. */
(() => {
  "use strict";

  window.__siteReady = true;

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Word-mask headings ---------- */
  const splitWords = (el) => {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    let wi = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const outer = document.createElement("span");
            outer.className = "split-w";
            outer.setAttribute("aria-hidden", "true");
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--wi", String(wi++));
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = text;
    el.prepend(label);
  };
  $$("[data-split]").forEach(splitWords);

  /* ---------- Stagger indices ---------- */
  $$("[data-stagger]").forEach((group) => {
    $$("[data-reveal]", group).forEach((el, i) => el.style.setProperty("--i", String(i)));
  });

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = $$("[data-reveal], [data-split], [data-draw]");
  if ("IntersectionObserver" in window) {
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-in");
          if (el.hasAttribute("data-draw")) el.classList.add("is-drawn");
          revealIO.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );
    revealTargets.forEach((el) => revealIO.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in", "is-drawn"));
  }

  /* ---------- Pause decorative animation when offscreen ---------- */
  const animated = $$("[data-anim]");
  const setPaused = (el, paused) => {
    el.classList.toggle("is-paused", paused);
    const svgs = el.tagName.toLowerCase() === "svg" ? [el] : $$("svg", el);
    svgs.forEach((svg) => {
      if (typeof svg.pauseAnimations !== "function") return;
      if (paused) svg.pauseAnimations();
      else svg.unpauseAnimations();
    });
  };
  if (reduceMotion.matches) {
    animated.forEach((el) => setPaused(el, true));
  } else if ("IntersectionObserver" in window) {
    const animIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => setPaused(e.target, !e.isIntersecting)),
      { rootMargin: "120px 0px" }
    );
    animated.forEach((el) => animIO.observe(el));
  }

  /* ---------- Theme ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  const syncThemeUI = () => {
    const dark = root.dataset.theme === "dark";
    $$("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("aria-pressed", String(dark));
      const use = $("use", btn);
      if (use) use.setAttribute("href", use.getAttribute("href").replace(/#i-(sun|moon)$/, dark ? "#i-sun" : "#i-moon"));
    });
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#0b0c0f" : "#f8f7f4");
  };
  $$("[data-theme-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", root.dataset.theme);
      } catch (_) {}
      syncThemeUI();
    })
  );
  if (!root.dataset.theme) root.dataset.theme = "light";
  syncThemeUI();

  /* ---------- Navigation ---------- */
  const nav = $(".nav");
  const progress = $(".progress");
  const navLinks = $$(".nav__link[href^='#']");
  const indicator = $(".nav__indicator");
  const menuBtn = $(".menu-btn");
  const menu = $("#menu");
  let menuOpen = false;

  const moveIndicator = (link) => {
    if (!indicator) return;
    if (!link) {
      indicator.style.opacity = "0";
      return;
    }
    indicator.style.opacity = "1";
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  const setActive = (id) => {
    let current = null;
    navLinks.forEach((link) => {
      const match = link.getAttribute("href") === `#${id}`;
      if (match) {
        link.setAttribute("aria-current", "true");
        current = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    moveIndicator(current);
  };

  if (navLinks.length && "IntersectionObserver" in window) {
    const sections = navLinks.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    const visible = new Map();
    const sectionIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        const active = sections.find((s) => visible.get(s.id));
        setActive(active ? active.id : null);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => sectionIO.observe(s));
    window.addEventListener("resize", () => moveIndicator($(".nav__link[aria-current='true']")), { passive: true });
  }

  const setMenu = (open) => {
    if (!menu || !menuBtn) return;
    menuOpen = open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    $$("main, footer, .skip-link").forEach((el) => (el.inert = open));
    body.style.overflow = open ? "hidden" : "";
    if (open) {
      nav && nav.classList.remove("is-hidden");
      const first = $(".menu__link", menu);
      first && setTimeout(() => first.focus({ preventScroll: true }), 60);
    }
  };
  if (menuBtn && menu) {
    menu.inert = true;
    menuBtn.addEventListener("click", () => {
      const wasOpen = menuOpen;
      setMenu(!menuOpen);
      if (wasOpen) menuBtn.focus();
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuOpen) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => e.matches && menuOpen && setMenu(false));
  }

  /* ---------- Scroll-driven effects (single rAF loop) ---------- */
  const parallaxEls = reduceMotion.matches ? [] : $$("[data-parallax]");
  const timeline = $(".timeline");
  const timelineBar = $(".timeline__progress");
  const timelineItems = $$(".tl-item");
  let lastY = window.scrollY;
  let ticking = false;

  const onFrame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (nav) {
      nav.classList.toggle("is-scrolled", y > 8);
      const delta = y - lastY;
      if (!menuOpen && !nav.contains(document.activeElement)) {
        if (y > 900 && delta > 6) nav.classList.add("is-hidden");
        else if (delta < -6 || y < 200) nav.classList.remove("is-hidden");
      }
    }
    lastY = y;

    if (progress) {
      const max = document.documentElement.scrollHeight - vh;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    }

    parallaxEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      const speed = parseFloat(el.dataset.parallax) || 0.08;
      const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });

    if (timeline && timelineBar) {
      const rect = timeline.getBoundingClientRect();
      const ratio = clamp((vh * 0.55 - rect.top) / rect.height, 0, 1);
      timelineBar.style.transform = `scaleY(${ratio})`;
      timelineItems.forEach((item) => {
        item.classList.toggle("is-active", item.getBoundingClientRect().top < vh * 0.55);
      });
    }
  };
  const requestFrame = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onFrame);
    }
  };
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  onFrame();

  /* ---------- Magnetic buttons ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = clamp((e.clientX - (r.left + r.width / 2)) * strength, -8, 8);
        const y = clamp((e.clientY - (r.top + r.height / 2)) * strength, -6, 6);
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.translate = "0 0";
      });
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  const toast = (message) => {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
  };

  /* ---------- Copy to clipboard ---------- */
  $$("[data-copy]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
      } catch (_) {
        const tmp = document.createElement("textarea");
        tmp.value = value;
        tmp.setAttribute("readonly", "");
        tmp.style.position = "absolute";
        tmp.style.left = "-9999px";
        body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        tmp.remove();
      }
      const use = $("use", btn);
      if (use) {
        use.setAttribute("href", use.getAttribute("href").replace("#i-copy", "#i-check"));
        setTimeout(() => use.setAttribute("href", use.getAttribute("href").replace("#i-check", "#i-copy")), 1800);
      }
      toast("Email address copied");
    })
  );

  /* ---------- Contact form → composes an email (no data is stored) ---------- */
  const form = $("#contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();
      const to = form.dataset.to;
      const subject = `Portfolio inquiry from ${name}`;
      const bodyText = `${message}\n\n— ${name}${email ? ` (${email})` : ""}`;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      toast("Opening your email app…");
    });
  }

  /* ---------- Lightbox ---------- */
  const lightbox = $(".lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const img = $("img", lightbox);
    const caption = $(".lightbox__caption", lightbox);
    let group = [];
    let index = 0;
    const show = (i) => {
      index = (i + group.length) % group.length;
      const btn = group[index];
      img.src = btn.dataset.full;
      img.alt = btn.dataset.alt || "";
      if (caption) caption.textContent = `${btn.dataset.alt || ""} — ${index + 1} / ${group.length}`;
    };
    $$("[data-lightbox]").forEach((btn) =>
      btn.addEventListener("click", () => {
        group = $$(`[data-lightbox="${btn.dataset.lightbox}"]`);
        show(group.indexOf(btn));
        lightbox.showModal();
      })
    );
    $("[data-lb-prev]", lightbox)?.addEventListener("click", () => show(index - 1));
    $("[data-lb-next]", lightbox)?.addEventListener("click", () => show(index + 1));
    $("[data-lb-close]", lightbox)?.addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---------- Small details ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));

  const timeEls = $$("[data-local-time]");
  if (timeEls.length) {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
    const tick = () => timeEls.forEach((el) => (el.textContent = fmt.format(new Date())));
    tick();
    setInterval(tick, 30000);
  }

  $$("[data-scroll-top]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      const target = $("#top") || $("main");
      target && target.focus({ preventScroll: true });
    })
  );
})();
