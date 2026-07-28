/* scripts.js

 Purpose:
   I keep shared navigation, motion, scrolling, and carousel behavior here.

 Responsibilities:
   - Active navigation and page transitions
   - GSAP and ScrollTrigger animation
   - Accessible scrolling and reduced-motion behavior
   - Skill, project, and certificate interactions

 Dependencies:
   - GSAP 3.13+
   - ScrollTrigger
   - ScrollToPlugin

 Notes:
   Feature-level IIFEs keep shared behavior out of the global scope.
*/

/* Active Navigation */

// Active state remains accessible even when GSAP is unavailable.
(function setActiveNavPill() {
  // Early exit keeps this shared script safe on standalone pages.
  const links = document.querySelectorAll(".nav-link.nav-pill[data-nav]");
  if (!links.length) return;

  // Legacy home.html support protects cached links and old bookmarks.
  const file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const activeKey = file === "index.html" || file === "home.html"
    ? "home"
    : file === "projects.html"
      ? "projects"
      : file === "resume.html"
        ? "resume"
        : null;

  // Visual and semantic active states always update together.
  links.forEach((link) => {
    const isActive = link.dataset.nav === activeKey;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
})();

/* Shared Site Motion */

// One shared motion system keeps timing consistent across pages.
(function setUpSiteMotion() {
  // Core navigation still works if animation dependencies fail.
  if (!window.gsap || !window.ScrollTrigger || !window.ScrollToPlugin) return;

  const { gsap, ScrollTrigger, ScrollToPlugin } = window;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  // Stable data hooks keep animation selectors independent from layout classes.
  const page = document.querySelector("[data-page-content]");
  const nav = document.querySelector("[data-site-nav]");
  const progress = document.querySelector(".scroll-progress span");
  const backToTop = document.querySelector(".back-to-top");
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const cleanups = [];

  // ResizeObserver avoids measuring the fixed navbar during scroll.
  const syncNavHeight = () => {
    if (nav) document.documentElement.style.setProperty("--nav-height", `${nav.offsetHeight}px`);
  };
  syncNavHeight();
  const navObserver = new ResizeObserver(syncNavHeight);
  if (nav) navObserver.observe(nav);
  cleanups.push(() => navObserver.disconnect());

  // MatchMedia scopes animation cleanup and respects motion preferences.
  const motionMedia = gsap.matchMedia();
  motionMedia.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      desktop: "(hover: hover) and (pointer: fine)"
    },
    (context) => {
      const { reduceMotion, desktop } = context.conditions;
      const duration = reduceMotion ? 0 : .6;

      // Page content appears before its nested hero sequence begins.
      if (page) {
        gsap.fromTo(page, { autoAlpha: 0, y: reduceMotion ? 0 : 8 }, {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0 : .45,
          ease: "power2.out",
          clearProps: "transform"
        });
      }

      // Hero elements reveal in reading order for a polished entrance.
      const hero = document.querySelector("[data-motion-hero]");
      if (hero && !reduceMotion) {
        const title = hero.querySelector(".hero-title");
        const supporting = hero.querySelectorAll(".hero-kicker, .hero-subtitle, .page-intro");
        const actions = hero.querySelectorAll(".btn-pill, .icon-btn");
        const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" }, delay: .08 });
        heroTimeline
          .from(hero, { autoAlpha: 0, duration: .35 })
          .from(title, { autoAlpha: 0, y: 24, filter: "blur(7px)", duration: .7 }, 0);

        // Guards prevent warnings on heroes without supporting actions.
        if (supporting.length) {
          heroTimeline.from(supporting, { autoAlpha: 0, y: 16, duration: .55, stagger: .08 }, .18);
        }
        if (actions.length) {
          heroTimeline.from(actions, { autoAlpha: 0, y: 12, scale: .98, duration: .45, stagger: .1 }, .3);
        }
      }

      // Reusable reveals prevent timing drift between page sections.
      const reveal = (targets, trigger, options = {}) => {
        const elements = gsap.utils.toArray(targets);
        if (!elements.length) return;
        if (reduceMotion) {
          gsap.set(elements, { clearProps: "all" });
          return;
        }
        gsap.from(elements, {
          autoAlpha: 0,
          y: options.y ?? 24,
          filter: options.blur ? "blur(6px)" : "none",
          duration: options.duration ?? duration,
          stagger: options.stagger ?? .08,
          ease: options.ease ?? "power3.out",
          clearProps: "transform,filter",
          scrollTrigger: { trigger, start: "top 84%", once: true }
        });
      };

      // Section hooks reveal once and remain visible afterward.
      document.querySelectorAll("[data-reveal-section]").forEach((section) => {
        reveal(section, section, { y: 26, duration: .65 });
        const title = section.querySelector(".section-title, .hero-title, .resume-section > h2");
        if (title) reveal(title, section, { y: 20, blur: true, duration: .6, stagger: 0 });
      });

      // Card groups use staggered reveals to preserve visual hierarchy.
      const skillsGrid = document.querySelector(".skills-grid");
      if (skillsGrid) reveal(".skill-card", skillsGrid, { y: 22, stagger: .09, duration: .55 });

      const projectList = document.querySelector(".project-list");
      if (projectList) reveal(".project-card", projectList, { y: 28, stagger: .12, duration: .7 });

      // Resume groups reveal independently for easier long-form scanning.
      document.querySelectorAll(".resume-section").forEach((section) => {
        reveal(Array.from(section.children), section, { y: 18, stagger: .06, duration: .5 });
      });

      // Transform-based progress avoids layout recalculation while scrolling.
      if (progress) {
        gsap.to(progress, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { start: 0, end: "max", scrub: reduceMotion ? false : .2 }
        });
      }

      // Back-to-top stays hidden until it becomes useful.
      if (backToTop) {
        ScrollTrigger.create({
          start: 360,
          onToggle: ({ isActive }) => {
            backToTop.classList.toggle("is-visible", isActive);
            gsap.to(backToTop, {
              autoAlpha: isActive ? 1 : 0,
              y: isActive ? 0 : 14,
              duration: reduceMotion ? 0 : .35,
              ease: "power2.out",
              overwrite: true
            });
          }
        });
      }

      // Desktop-only pointer effects avoid unnecessary touch-device listeners.
      if (desktop && !reduceMotion) {
        document.querySelectorAll(".project-card").forEach((card) => {
          const image = card.querySelector(".project-card__image");
          const actions = card.querySelectorAll(".btn-pill, i");
          let bounds;
          let frame;
          // Card geometry is cached once to avoid repeated layout reads.
          const enter = () => {
            bounds = card.getBoundingClientRect();
            gsap.to(card, { y: -5, boxShadow: "0 18px 38px rgba(29,43,50,.1)", duration: .35, ease: "power2.out" });
            if (image) gsap.to(image, { scale: 1.03, duration: .55, ease: "power3.out" });
            if (actions.length) gsap.to(actions, { y: -1, duration: .3, stagger: .025, ease: "power2.out" });
          };
          // One frame-scheduled update keeps the pointer glow smooth.
          const move = (event) => {
            if (!bounds || frame) return;
            frame = requestAnimationFrame(() => {
              card.style.setProperty("--glow-x", `${event.clientX - bounds.left}px`);
              card.style.setProperty("--glow-y", `${event.clientY - bounds.top}px`);
              frame = null;
            });
          };
          // Hover state returns cleanly without changing card layout.
          const leave = () => {
            gsap.to(card, { y: 0, boxShadow: "0 0 0 rgba(29,43,50,0)", duration: .35, ease: "power2.out" });
            if (image) gsap.to(image, { scale: 1, duration: .45, ease: "power2.out" });
            if (actions.length) gsap.to(actions, { y: 0, duration: .3, ease: "power2.out" });
          };
          card.addEventListener("pointerenter", enter);
          card.addEventListener("pointermove", move);
          card.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            card.removeEventListener("pointerenter", enter);
            card.removeEventListener("pointermove", move);
            card.removeEventListener("pointerleave", leave);
            if (frame) cancelAnimationFrame(frame);
          });
        });
      }

      // Shared hover timing makes interactive components feel consistent.
      if (!reduceMotion) {
        document.querySelectorAll(".btn-pill").forEach((button) => {
          const enter = () => gsap.to(button, { y: -2, scale: 1.02, duration: .25, ease: "power2.out", overwrite: true });
          const leave = () => gsap.to(button, { y: 0, scale: 1, duration: .25, ease: "power2.out", overwrite: true });
          button.addEventListener("pointerenter", enter);
          button.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            button.removeEventListener("pointerenter", enter);
            button.removeEventListener("pointerleave", leave);
          });
        });
        document.querySelectorAll(".icon-btn, .footer-icon").forEach((icon) => {
          const enter = () => gsap.to(icon, { scale: 1.1, rotation: 3, duration: .3, ease: "power2.out" });
          const leave = () => gsap.to(icon, { scale: 1, rotation: 0, duration: .3, ease: "power2.out" });
          icon.addEventListener("pointerenter", enter);
          icon.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            icon.removeEventListener("pointerenter", enter);
            icon.removeEventListener("pointerleave", leave);
          });
        });
      }
    }
  );

  // Motion preference is read at interaction time to remain current.
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Extra spacing keeps anchor headings clear of the fixed navbar.
  const navOffset = () => (nav?.offsetHeight || 0) + 16;

  // Shared scrolling preserves consistent easing and browser history.
  const scrollToTarget = (target, updateHistory = true) => {
    if (!target) return;
    gsap.to(window, {
      scrollTo: { y: target, offsetY: navOffset() },
      duration: prefersReducedMotion() ? 0 : .8,
      ease: "expo.out",
      onComplete: () => target.focus?.({ preventScroll: true })
    });
    if (updateHistory && target.id) history.pushState(null, "", `#${target.id}`);
  };

  // Only ordinary internal clicks receive custom transitions.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const currentPath = window.location.pathname.replace(/\/$/, "/index.html");
    const nextPath = url.pathname.replace(/\/$/, "/index.html");
    if (url.hash && currentPath === nextPath) {
      const target = document.querySelector(url.hash);
      if (target) {
        event.preventDefault();
        scrollToTarget(target);
      }
      return;
    }

    if (!url.hash && currentPath === nextPath) return;
    event.preventDefault();

    // Session storage replaces the browser's abrupt cross-page hash jump.
    let destination = url.href;
    if (url.hash && currentPath !== nextPath) {
      try {
        sessionStorage.setItem("portfolioScrollTarget", url.hash);
        url.hash = "";
        destination = url.href;
      } catch {
        // Native hash navigation remains the no-storage fallback.
      }
    }

    // Navigation feedback bridges separate HTML page loads.
    if (link.matches(".nav-link")) {
      gsap.to(navLinks, { opacity: .55, duration: .2, overwrite: true });
      gsap.to(link, { opacity: 1, scale: 1.04, duration: .25, ease: "power2.out" });
    }
    if (prefersReducedMotion() || !page) {
      window.location.href = destination;
    } else {
      gsap.to(page, {
        autoAlpha: 0,
        y: -8,
        duration: .32,
        ease: "power2.out",
        onComplete: () => { window.location.href = destination; }
      });
    }
  });

  // Back-to-top reuses the site's smooth-scroll language.
  backToTop?.addEventListener("click", () => {
    gsap.to(window, { scrollTo: 0, duration: prefersReducedMotion() ? 0 : .7, ease: "power3.out" });
  });

  // Active-pill motion visually continues the previous page transition.
  const activeNav = document.querySelector(".nav-link.is-active");
  if (activeNav && !prefersReducedMotion()) {
    gsap.from(activeNav, { scale: .92, autoAlpha: .65, duration: .45, ease: "expo.out" });
  }

  // Pending anchors are consumed once to prevent stale scrolling.
  let pendingTarget;
  try {
    pendingTarget = sessionStorage.getItem("portfolioScrollTarget");
    if (pendingTarget) sessionStorage.removeItem("portfolioScrollTarget");
  } catch {
    pendingTarget = null;
  }

  if (pendingTarget) {
    const target = document.querySelector(pendingTarget);
    if (target) {
      window.scrollTo(0, 0);
      gsap.delayedCall(prefersReducedMotion() ? 0 : .45, () => scrollToTarget(target));
    }
  } else if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) requestAnimationFrame(() => scrollToTarget(target, false));
  }

  // pagehide cleanup remains compatible with the back-forward cache.
  window.addEventListener("pagehide", () => {
    motionMedia.revert();
    cleanups.forEach((cleanup) => cleanup());
  }, { once: true });
})();

/* Skill Card Interactions */

// Transform-based feedback avoids shifting neighboring skill cards.
(function setUpSkillCardHover() {
  if (!window.gsap) return;
  const cards = document.querySelectorAll(".skill-card");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      if (reduceMotion.matches) return;
      window.gsap.to(card, {
        scale: 1.075,
        y: -7,
        boxShadow: "0 18px 38px rgba(29, 43, 50, 0.12)",
        duration: .38,
        ease: "back.out(1.7)",
        overwrite: "auto"
      });
    });
    card.addEventListener("mouseleave", () => {
      window.gsap.to(card, {
        scale: 1,
        y: 0,
        boxShadow: "0 0 0 rgba(29, 43, 50, 0)",
        duration: .3,
        ease: "power2.out",
        overwrite: "auto"
      });
    });
  });
})();

/* Certificate Carousel */

// GSAP controls presentation while certificate links remain semantic.
(function setUpCertificateCarousel() {
  const carousel = document.querySelector("[data-certificate-carousel]");
  if (!carousel || !window.gsap) return;

  const cards = Array.from(carousel.querySelectorAll(".certificate-card"));
  const dots = Array.from(carousel.querySelectorAll(".certificate-carousel__dot"));
  const progressBars = dots.map((dot) => dot.querySelector(".certificate-carousel__dot-progress"));
  const track = carousel.querySelector(".certificate-grid");
  const status = carousel.querySelector("[data-certificate-status]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const countdownLength = 6;
  let currentIndex = Math.min(1, cards.length - 1);
  let countdown;
  let cardTimeline;
  let hasFocusInside = false;

  // Card headings provide accessible carousel announcements.
  function certificateName(card) {
    return card.querySelector("h3")?.textContent.trim() || "Certificate";
  }

  // Modular slots keep three cards cycling left, center, and right.
  function slotFor(index) {
    const difference = (index - currentIndex + cards.length) % cards.length;
    return difference === cards.length - 1 ? -1 : difference;
  }

  // Measured height restores space removed by absolute positioning.
  function sizeTrack() {
    const tallestCard = Math.max(...cards.map((card) => card.scrollHeight));
    track.style.height = `${tallestCard * 1.02}px`;
  }

  // Visual controls and live announcements always share one state.
  function updateControls(announce) {
    dots.forEach((dot, index) => {
      dot.classList.toggle("is-current", index === currentIndex);
      if (index === currentIndex) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    window.gsap.set(progressBars, { scaleX: 0 });
    if (announce && status) {
      status.textContent = `Showing ${certificateName(cards[currentIndex])}, certificate ${currentIndex + 1} of ${cards.length}.`;
    }
  }

  // Autoplay pauses for focus, hidden tabs, and reduced motion.
  function startCountdown() {
    countdown?.kill();
    window.gsap.set(progressBars, { scaleX: 0 });
    if (reduceMotion.matches || hasFocusInside || document.hidden) return;
    countdown = window.gsap.to(progressBars[currentIndex], {
      scaleX: 1,
      duration: countdownLength,
      ease: "none",
      onComplete: () => goTo(currentIndex + 1, false)
    });
  }

  // One state update coordinates card positions, controls, and autoplay.
  function goTo(nextIndex, announce = true, immediate = false) {
    currentIndex = (nextIndex + cards.length) % cards.length;
    cardTimeline?.kill();
    countdown?.kill();
    updateControls(announce);
    cardTimeline = window.gsap.timeline({
      defaults: { duration: immediate || reduceMotion.matches ? 0 : .85, ease: "power3.inOut", overwrite: "auto" },
      onComplete: startCountdown
    });
    cards.forEach((card, index) => {
      const slot = slotFor(index);
      const isCurrent = slot === 0;
      card.classList.toggle("is-current", isCurrent);
      card.setAttribute("aria-label", `${certificateName(card)}, ${index + 1} of ${cards.length}`);
      cardTimeline.to(card, {
        xPercent: -50 + (slot * 104),
        scale: isCurrent ? 1 : .78,
        opacity: isCurrent ? 1 : .52,
        zIndex: isCurrent ? 2 : 1
      }, 0);
    });
  }

  // Pausing preserves playheads for a seamless resume.
  function pauseCarousel() {
    countdown?.pause();
    cardTimeline?.pause();
  }

  // Resume only when accessibility and visibility conditions permit.
  function resumeCarousel() {
    if (reduceMotion.matches || hasFocusInside || document.hidden) return;
    if (cardTimeline && cardTimeline.progress() < 1) cardTimeline.resume();
    else if (countdown) countdown.resume();
    else startCountdown();
  }

  // Keyboard focus pauses autoplay; pointer clicks release focus.
  dots.forEach((dot, index) => {
    dot.addEventListener("click", (event) => {
      goTo(index);
      if (event.detail > 0) dot.blur();
    });
  });
  carousel.addEventListener("focusin", () => {
    hasFocusInside = true;
    pauseCarousel();
  });
  carousel.addEventListener("focusout", (event) => {
    if (carousel.contains(event.relatedTarget)) return;
    hasFocusInside = false;
    resumeCarousel();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseCarousel();
    else resumeCarousel();
  });
  reduceMotion.addEventListener?.("change", () => goTo(currentIndex, false, true));
  // Resize is the only time carousel geometry needs re-measuring.
  window.addEventListener("resize", () => {
    sizeTrack();
    goTo(currentIndex, false, true);
  });
  window.addEventListener("load", sizeTrack, { once: true });

  sizeTrack();
  goTo(currentIndex, false, true);
})();
