(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const INTERACTIVE_GUARD = "a, button, summary, input, textarea, select, label";

  const TIMING = {
    slideDelay: 4500,
    slideSpeed: 500,
    autoFlipDelay: 4500,
    autoFlipBackDelay: 3500,
  };

  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = Array.from(document.querySelectorAll(".nav-links a, .mobile-menu a"));
  const desktopNavLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const brandLogoBtn = document.getElementById("brandLogoBtn");
  const logoModal = document.getElementById("logoModal");
  const logoModalCard = logoModal?.querySelector(".logo-modal__card") || null;
  const logoFlip = document.getElementById("logoFlip");
  const searchRoot = document.querySelector(".nav-search");
  const navSearchBtn = document.getElementById("nav-search-btn");
  const navSearchPanel = document.getElementById("nav-search-panel");
  const searchExpand = searchRoot?.querySelector(".search-expand") || null;
  const searchInput = document.getElementById("site-search");
  const searchSubmitButton = document.querySelector(".search-submit") || navSearchBtn;
  const mobileSearchTrigger = document.getElementById("mobileSearchTrigger");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const mobileThemeToggleBtn = document.getElementById("mobileThemeToggleBtn");
  const searchSuggestions = document.getElementById("site-search-suggestions");
  const searchClearButton = document.getElementById("site-search-clear");
  const searchStatus = document.getElementById("search-status");
  const featuredProjectsWrapper = document.getElementById("featuredProjectsWrapper");
  const featuredApiStatus = document.getElementById("featuredApiStatus");
  const chatbot = document.getElementById("chatbot");
  const chatbotToggle = document.getElementById("chatbotToggle");
  const chatbotPanel = document.getElementById("chatbotPanel");
  const chatbotClose = document.getElementById("chatbotClose");
  const chatbotBody = document.getElementById("chatbotBody");
  const chatbotForm = document.getElementById("chatbotForm");
  const chatbotInput = document.getElementById("chatbotInput");
  const contactForm = document.getElementById("contactForm");
  const contactNameInput = document.getElementById("contactName");
  const contactEmailInput = document.getElementById("contactEmail");
  const contactMessageInput = document.getElementById("contactMessage");
  const contactWebsiteInput = document.getElementById("contactWebsite");
  const contactSubmit = document.getElementById("contactSubmit");
  const contactFormStatus = document.getElementById("contactFormStatus");
  const contactApiStatus = document.getElementById("contactApiStatus");

  let lastFocusedElement = null;
  let currentOpenFlip = null;
  let currentSearchQuery = "";
  let certFilter = "all";

  const normalizeText = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const cardRegistry = [];
  const swiperRegistry = [];
  const autoFlipState = new WeakMap();
  const mobileSwiperQuery = window.matchMedia("(max-width: 520px)");
  const tabletSwiperQuery = window.matchMedia("(max-width: 900px)");
  const mobileNavQuery = window.matchMedia("(max-width: 768px)");
  let currentSwiperMode = null;
  let swiperResizeWatcherAttached = false;
  let swiperVisibilityHandlerAttached = false;

  const initAnalytics = () => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;
    window.gtag("js", new Date());
    window.gtag("config", "G-3CN94DG5LY");
  };

  const bindWheelNavigation = (container, swiper) => {
    if (!container || !swiper) return;
    let wheelLocked = false;

    container.addEventListener(
      "wheel",
      (event) => {
        const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(dominantDelta) < 12) return;
        if (wheelLocked) return;

        wheelLocked = true;
        event.preventDefault();
        if (dominantDelta > 0) swiper.slideNext();
        else swiper.slidePrev();

        window.setTimeout(() => {
          wheelLocked = false;
        }, 420);
      },
      { passive: false }
    );
  };

  const setupSlideClickToCenter = () => {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("a, button, input, textarea, select, label, summary")) return;

      const slide = target.closest(".swiper-slide");
      if (!slide) return;
      if (slide.classList.contains("swiper-slide-active") || slide.classList.contains("slide-hidden")) return;

      const swiperEl = slide.closest(".swiper");
      const swiper = swiperEl?.swiper;
      if (!swiper) return;

      const realIndex = Number(slide.getAttribute("data-swiper-slide-index"));
      if (Number.isFinite(realIndex)) {
        swiper.slideToLoop(realIndex);
        return;
      }

      const slideIndex = Array.prototype.indexOf.call(swiper.slides, slide);
      if (slideIndex >= 0) swiper.slideTo(slideIndex);
    });
  };

  const closeMobileMenu = () => {
    if (!navToggle || !mobileMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    mobileMenu.hidden = true;
    mobileMenu.classList.remove("show-search");
    document.body.classList.remove("menu-open");
  };

  const syncMobileMenuOverlayMetrics = () => {
    if (!nav || !mobileMenu) return;
    const navRect = nav.getBoundingClientRect();
    const topOffset = Math.max(0, Math.round(navRect.bottom));
    mobileMenu.style.setProperty("--mobile-menu-top", `${topOffset}px`);
    mobileMenu.style.setProperty("--mobile-menu-height", `calc(100dvh - ${topOffset}px)`);
  };

  const openMobileMenu = () => {
    if (!navToggle || !mobileMenu) return;
    lastFocusedElement = document.activeElement;
    syncMobileMenuOverlayMetrics();
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    mobileMenu.hidden = false;
    document.body.classList.add("menu-open");
    const firstFocusable = mobileMenu.querySelector(focusableSelector);
    if (firstFocusable) firstFocusable.focus();
  };

  const THEME_STORAGE_KEY = "portfolio_theme";

  const getSystemTheme = () => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch {
      return "dark";
    }
  };

  const readSavedTheme = () => {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  };

  const writeSavedTheme = (theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures in private browsing / restricted modes.
    }
  };

  const applyTheme = (theme) => {
    const resolved = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", resolved);
    const nextLabel = resolved === "light" ? "Switch to dark" : "Switch to light";
    [themeToggleBtn, mobileThemeToggleBtn].forEach((btn) => {
      if (!btn) return;
      btn.setAttribute("aria-pressed", String(resolved === "light"));
      btn.setAttribute("aria-label", nextLabel);
      if (btn === themeToggleBtn) {
        const text = btn.querySelector(".theme-toggle__text");
        const glyph = btn.querySelector(".theme-toggle__glyph");
        if (text) text.textContent = resolved === "light" ? "Light" : "Dark";
        if (glyph) glyph.textContent = resolved === "light" ? "L" : "D";
      } else {
        btn.textContent = resolved === "light" ? "Theme: Light" : "Theme: Dark";
      }
    });
    return resolved;
  };

  const setupThemeToggle = () => {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Ignore storage failures in restricted modes.
    }

    applyTheme("dark");

    [themeToggleBtn, mobileThemeToggleBtn].forEach((btn) => {
      if (!btn) return;
      btn.hidden = true;
      btn.disabled = true;
      btn.tabIndex = -1;
      btn.setAttribute("aria-hidden", "true");
      btn.style.display = "none";
    });
  };

  const setupNavigation = () => {
    const syncMobileSearchPlacement = () => {
      if (!nav || !mobileMenu || !navToggle || !searchRoot) return;

      if (mobileNavQuery.matches) {
        if (!mobileMenu.contains(searchRoot)) {
          const firstNavItem = mobileMenu.querySelector("a");
          if (firstNavItem) {
            mobileMenu.insertBefore(searchRoot, firstNavItem);
          } else {
            mobileMenu.appendChild(searchRoot);
          }
        }
      } else {
        if (!nav.contains(searchRoot)) {
          nav.insertBefore(searchRoot, navToggle);
        }
        mobileMenu.classList.remove("show-search");
      }
    };

    syncMobileSearchPlacement();
    syncMobileMenuOverlayMetrics();

    const syncOpenMobileMenuOverlay = () => {
      if (mobileMenu.hidden) return;
      syncMobileMenuOverlayMetrics();
    };

    window.addEventListener("resize", syncOpenMobileMenuOverlay);
    window.addEventListener("scroll", syncOpenMobileMenuOverlay, { passive: true });

    if (typeof mobileNavQuery.addEventListener === "function") {
      mobileNavQuery.addEventListener("change", syncMobileSearchPlacement);
    } else if (typeof mobileNavQuery.addListener === "function") {
      mobileNavQuery.addListener(syncMobileSearchPlacement);
    }

    if (navToggle && mobileMenu) {
      navToggle.addEventListener("click", () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        if (expanded) closeMobileMenu();
        else openMobileMenu();
      });

      mobileMenu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMobileMenu();
          navToggle.focus();
        }

        if (event.key !== "Tab") return;
        const focusables = Array.from(mobileMenu.querySelectorAll(focusableSelector));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });

      document.addEventListener("click", (event) => {
        if (mobileMenu.hidden) return;
        const insideMenu = mobileMenu.contains(event.target);
        const insideToggle = navToggle.contains(event.target);
        if (!insideMenu && !insideToggle) closeMobileMenu();
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        history.replaceState(null, "", href);
        closeMobileMenu();
        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
          lastFocusedElement.focus();
        }
      });
    });

    if (mobileSearchTrigger && searchSubmitButton && searchInput) {
      mobileSearchTrigger.addEventListener("click", () => {
        if (mobileNavQuery.matches && mobileMenu.contains(searchRoot)) {
          mobileMenu.classList.add("show-search");
        } else {
          closeMobileMenu();
          if (searchRoot) {
            searchRoot.scrollIntoView({
              behavior: prefersReducedMotion ? "auto" : "smooth",
              block: "center",
            });
          }
        }
        searchSubmitButton.click();
        window.setTimeout(() => {
          searchInput.focus();
        }, 120);
      });
    }

    const onScrollState = () => {
      if (!nav) return;
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScrollState();
    window.addEventListener("scroll", onScrollState, { passive: true });

    const sectionElements = desktopNavLinks
      .map((link) => {
        const id = link.getAttribute("href");
        const section = id ? document.querySelector(id) : null;
        return section ? { id, section } : null;
      })
      .filter(Boolean);

    if (sectionElements.length) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!visible) return;
          const activeId = `#${visible.target.id}`;
          desktopNavLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === activeId);
          });
        },
        { rootMargin: "-32% 0px -52% 0px", threshold: [0.15, 0.35, 0.6] }
      );
      sectionElements.forEach(({ section }) => sectionObserver.observe(section));
    }
  };

  const setupReveal = () => {
    const revealTargets = document.querySelectorAll(
      ".section-head, .project-card, .skill-group, .edu-item, .exp-item, .contact-card"
    );
    revealTargets.forEach((node) => node.classList.add("reveal"));

    const revealAll = document.querySelectorAll(".reveal");
    if (prefersReducedMotion) {
      revealAll.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    revealAll.forEach((node) => revealObserver.observe(node));
  };

  const setupBrandBadge = () => {
    if (!brandLogoBtn || !logoModal || !logoModalCard || !logoFlip) return;

    const setLogoVisualState = (hostEl, { hasRichLogo = false, broken = false } = {}) => {
      if (!(hostEl instanceof HTMLElement)) return;
      hostEl.classList.toggle("has-rich-logo", Boolean(hasRichLogo));
      hostEl.classList.toggle("is-logo-fallback", Boolean(broken));
    };

    const initLogoFallback = (logoEl, hostEl, { requireVisibleSize = false } = {}) => {
      if (!(hostEl instanceof HTMLElement) || !(logoEl instanceof Element)) return;

      if (logoEl instanceof HTMLImageElement) {
        const sync = () => {
          const isMissing = logoEl.complete && logoEl.naturalWidth === 0;
          setLogoVisualState(hostEl, { hasRichLogo: !isMissing, broken: isMissing });
        };

        logoEl.addEventListener("load", () => {
          setLogoVisualState(hostEl, { hasRichLogo: true, broken: false });
        });
        logoEl.addEventListener("error", () => {
          setLogoVisualState(hostEl, { hasRichLogo: false, broken: true });
        });

        if (logoEl.complete) sync();
        return;
      }

      if (logoEl instanceof SVGElement) {
        const probe = () => {
          let ok = true;
          try {
            const vb = logoEl.viewBox?.baseVal;
            ok = ok && Boolean(vb && vb.width > 0 && vb.height > 0);
          } catch {
            ok = false;
          }

          if (requireVisibleSize) {
            const rect = logoEl.getBoundingClientRect();
            ok = ok && rect.width >= 20 && rect.height >= 20;
          }

          try {
            if (typeof logoEl.getBBox === "function") {
              const box = logoEl.getBBox();
              if (Number.isFinite(box?.width) && Number.isFinite(box?.height) && (box.width || box.height)) {
                ok = ok && box.width >= 60 && box.height >= 60;
              }
            }
          } catch {
            // Ignore getBBox failures for hidden nodes; visible-size check handles the header logo.
          }

          setLogoVisualState(hostEl, { hasRichLogo: ok, broken: !ok });
        };

        window.requestAnimationFrame(() => {
          probe();
          window.setTimeout(probe, 140);
        });
      }
    };

    // Use the monogram fallback in the header button for webview reliability.
    setLogoVisualState(brandLogoBtn, { hasRichLogo: false, broken: true });
    initLogoFallback(logoModal.querySelector(".logo-big"), logoModal.querySelector(".logo-face--front"));

    let isOpen = false;
    let lastBrandFocus = null;
    let autoFlipTimer = 0;
    let autoFlipInterval = 0;

    const clearAutoFlip = () => {
      window.clearTimeout(autoFlipTimer);
      window.clearInterval(autoFlipInterval);
      autoFlipTimer = 0;
      autoFlipInterval = 0;
    };

    const openModal = () => {
      if (isOpen) return;
      lastBrandFocus = document.activeElement;
      isOpen = true;
      clearAutoFlip();
      logoFlip.classList.remove("is-flipped");
      logoModal.hidden = false;
      logoModal.setAttribute("aria-hidden", "false");
      brandLogoBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("logo-modal-open");

      window.requestAnimationFrame(() => {
        logoModal.classList.add("is-open");
      });

      if (!prefersReducedMotion) {
        autoFlipTimer = window.setTimeout(() => {
          if (!isOpen) return;
          logoFlip.classList.add("is-flipped");
          autoFlipInterval = window.setInterval(() => {
            if (!isOpen) return;
            logoFlip.classList.toggle("is-flipped");
          }, 1600);
        }, 900);
      }
    };

    const closeModal = () => {
      if (!isOpen) return;
      isOpen = false;
      clearAutoFlip();
      logoFlip.classList.remove("is-flipped");
      logoModal.classList.remove("is-open");
      brandLogoBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("logo-modal-open");

      window.setTimeout(() => {
        logoModal.hidden = true;
        logoModal.setAttribute("aria-hidden", "true");
      }, prefersReducedMotion ? 0 : 240);

      if (lastBrandFocus && typeof lastBrandFocus.focus === "function") lastBrandFocus.focus();
      else brandLogoBtn.focus();
    };

    brandLogoBtn.addEventListener("click", openModal);
    brandLogoBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal();
      }
    });

    logoModal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-close]")) closeModal();
    });

    logoModalCard.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeModal();
      }
    });
  };

  const setupEducationLogoFallbacks = () => {
    const logos = Array.from(document.querySelectorAll("#education .edu-logo"));
    logos.forEach((img) => {
      const fallback = img.nextElementSibling;
      if (!(fallback instanceof HTMLElement)) return;

      const showFallback = () => {
        img.style.display = "none";
        fallback.style.display = "grid";
      };

      img.addEventListener("error", showFallback);

      if (img.complete && img.naturalWidth === 0) {
        showFallback();
      }
    });
  };

  const buildSummaryFront = (card, source, section) => {
    const front = document.createElement("div");
    front.className = "flip-front summary-front";

    if (!["education", "skills", "experience"].includes(section)) {
      const badge = document.createElement("span");
      badge.className = "chip";
      badge.textContent =
        source.querySelector(".chip")?.textContent?.trim() ||
        ({ publications: "Publication", certifications: "Certification", education: "Education", experience: "Experience", skills: "Skills" }[section] || "Details");
      front.appendChild(badge);
    }

    const titleText =
      source.querySelector("h3")?.textContent?.trim() ||
      source.querySelector(".exp-top h3")?.textContent?.trim() ||
      `details card ${card.dataset.cardId || ""}`;
    const title = document.createElement("h3");
    title.textContent = titleText;
    if (section === "education") {
      front.appendChild(title);

      const programText = source.querySelector(".edu-content p")?.textContent?.trim();
      if (programText) {
        const focus = document.createElement("p");
        focus.className = "front-focus-area";
        focus.textContent = programText;
        front.appendChild(focus);
      }

      return front;
    }

    front.appendChild(title);

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    const chips = Array.from(source.querySelectorAll(".chip-row .chip, .skills .skill, .meta-badge"))
      .map((n) => n.textContent?.trim())
      .filter(Boolean);

    if (!chips.length) {
      const fallback = [
        source.querySelector(".edu-date")?.textContent?.trim(),
        source.querySelector(".exp-date")?.textContent?.trim(),
        source.querySelector(".exp-loc")?.textContent?.trim(),
      ].filter(Boolean);
      fallback.forEach((v) => chips.push(v));
    }

    chips.slice(0, 4).forEach((value) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = value;
      chipRow.appendChild(chip);
    });

    if (!chipRow.childElementCount) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = section || "card";
      chipRow.appendChild(chip);
    }
    front.appendChild(chipRow);
    return front;
  };

  const createFlipBack = (card, source, section) => {
    const back = document.createElement("div");
    back.className = "flip-back";
    const addLine = (label, value) => {
      if (!value) return;
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}:`;
      const span = document.createElement("span");
      span.className = "flip-value";
      span.textContent = value;

      p.appendChild(strong);
      p.appendChild(span);
      back.appendChild(p);
    };

    if (section === "publications") {
      addLine("Contribution", source.querySelector("p")?.textContent?.trim());
      const venueYear = Array.from(source.querySelectorAll(".meta-badge"))
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" | ");
      addLine("Venue + Year", venueYear);
      const authorsLine = Array.from(source.querySelectorAll("details p"))
        .map((p) => p.textContent?.trim())
        .find((text) => /^Authors:/i.test(text || ""));
      addLine("Authors", authorsLine?.replace(/^Authors:\s*/i, ""));
      const doiHref = source.querySelector(".pub-actions a[href*='doi.org']")?.getAttribute("href");
      addLine("DOI", doiHref);
      const read = source.querySelector(".text-link")?.cloneNode(true);
      if (read) {
        const row = document.createElement("div");
        row.className = "flip-link-row";
        row.appendChild(read);
        back.appendChild(row);
      }
    } else if (section === "certifications") {
      addLine("Validates", source.querySelector("p")?.textContent?.trim());
      const verify = source.querySelector(".text-link")?.cloneNode(true);
      if (verify) {
        const row = document.createElement("div");
        row.className = "flip-link-row";
        row.appendChild(verify);
        back.appendChild(row);
      }
    } else if (card.classList.contains("skill-group")) {
      addLine("Usage Context", source.querySelector("h3")?.textContent?.trim());
      addLine("Tools / Technologies", Array.from(source.querySelectorAll(".skill")).map((n) => n.textContent?.trim()).filter(Boolean).join(", "));
    } else if (card.classList.contains("edu-item")) {
      const universityEl = source.querySelector("h3");
      const dateEl = source.querySelector(".edu-date");
      const ps = source.querySelectorAll(".edu-content p");
      const programEl = ps.length > 0 ? ps[0] : null;
      const locationEl = ps.length > 1 ? ps[1] : null;

      if (locationEl) addLine("Location", locationEl.textContent);
      if (dateEl) addLine("Graduation", dateEl.textContent);
    } else if (card.classList.contains("exp-item")) {
      addLine("Action", source.querySelector(".exp-points li")?.textContent?.trim());
      addLine("Impact", source.querySelector(".exp-impact")?.textContent?.replace(/^Impact:\s*/i, "").trim());
    } else {
      Array.from(source.querySelectorAll("p")).slice(0, 3).forEach((p) => addLine("Detail", p.textContent?.trim()));
      const link = source.querySelector(".text-link")?.cloneNode(true);
      if (link) {
        const row = document.createElement("div");
        row.className = "flip-link-row";
        row.appendChild(link);
        back.appendChild(row);
      }
    }

    return back;
  };

  const setFlipped = (card, flipped, byUser = false) => {
    card.classList.toggle("is-flipped", flipped);
    if (card.hasAttribute("aria-pressed")) {
      card.setAttribute("aria-pressed", String(flipped));
    }
    if (byUser) {
      card.dataset.userLocked = flipped ? "1" : "0";
    }
  };

  const closeCurrentFlip = () => {
    if (!currentOpenFlip) return;
    setFlipped(currentOpenFlip, false, true);
    currentOpenFlip = null;
  };

  const setupFlipCards = () => {
    let idCounter = 0;
    const targets = document.querySelectorAll(".project-card, .skill-group, .edu-item, .exp-item");

    targets.forEach((card) => {
      if (card.classList.contains("flip-enhanced")) return;

      idCounter += 1;
      card.dataset.cardId = `card-${idCounter}`;
      card.dataset.userLocked = "0";
      const sectionId = card.closest("section")?.id || "";

      if (sectionId === "featured") {
        cardRegistry.push({
          id: card.dataset.cardId,
          element: card,
          section: sectionId,
          categories: (card.getAttribute("data-category") || "").split(" ").filter(Boolean),
          text: normalizeText(card.textContent || ""),
        });
        return;
      }

      card.classList.add("flip-enhanced", "flip-card");

      const source = card.cloneNode(true);
      const sourceText = normalizeText(source.textContent || "");
      const allowManualFlip = true;
      card.dataset.manualFlip = allowManualFlip ? "1" : "0";
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.removeAttribute("aria-pressed");
      card.removeAttribute("aria-label");

      if (allowManualFlip) {
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-pressed", "false");
      }
      card.textContent = "";

      const inner = document.createElement("div");
      inner.className = "flip-inner";
      const front = buildSummaryFront(card, source, sectionId);
      const back = createFlipBack(card, source, sectionId);
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      cardRegistry.push({
        id: card.dataset.cardId,
        element: card,
        section: card.closest("section")?.id || "",
        categories: (card.getAttribute("data-category") || "").split(" ").filter(Boolean),
        text: sourceText,
      });

      const isActiveSlideCard = () => {
        const slide = card.closest(".swiper-slide");
        return !slide || slide.classList.contains("swiper-slide-active");
      };

      const toggleCard = () => {
        if (card.dataset.manualFlip !== "1") return;
        if (prefersReducedMotion) return;
        const applyFlipState = (targetCard = card) => {
          if (!targetCard) return;
          if (targetCard !== card) {
            setFlipped(card, false, true);
          }
          const cardToToggle = targetCard;
          const nextState = !cardToToggle.classList.contains("is-flipped");
          if (nextState) {
            if (currentOpenFlip && currentOpenFlip !== cardToToggle) {
              setFlipped(currentOpenFlip, false, true);
            }
            setFlipped(cardToToggle, true, true);
            currentOpenFlip = cardToToggle;
          } else {
            setFlipped(cardToToggle, false, true);
            if (currentOpenFlip === cardToToggle) currentOpenFlip = null;
          }
        };

        if (isActiveSlideCard()) {
          applyFlipState(card);
          return;
        }

        if (sectionId !== "education") return;

        const swiperEl = card.closest(".swiper");
        const swiper = swiperEl && "swiper" in swiperEl ? swiperEl.swiper : null;
        const clickedSlide = card.closest(".swiper-slide");
        if (!swiper || !clickedSlide) return;

        const cardId = card.dataset.cardId;
        const realIndex = Number(clickedSlide.getAttribute("data-swiper-slide-index"));
        const slideIndex = Array.from(swiper.slides || []).indexOf(clickedSlide);

        const flipWhenCentered = () => {
          const activeSlide = swiper.slides?.[swiper.activeIndex];
          if (!activeSlide) return;
          const activeCard = cardId
            ? activeSlide.querySelector(`[data-card-id="${cardId}"]`)
            : activeSlide.querySelector(".flip-card");
          applyFlipState(activeCard || card);
        };

        swiper.once("slideChangeTransitionEnd", flipWhenCentered);
        if (swiper.params?.loop && Number.isFinite(realIndex)) {
          swiper.slideToLoop(realIndex);
          return;
        }
        if (slideIndex >= 0) {
          swiper.slideTo(slideIndex);
          return;
        }

        flipWhenCentered();
      };

      if (allowManualFlip) {
        card.addEventListener("click", (event) => {
          if (event.target.closest(INTERACTIVE_GUARD)) return;
          toggleCard();
        });

        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCard();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setFlipped(card, false, true);
            if (currentOpenFlip === card) currentOpenFlip = null;
          }
        });
      }
    });

    document.addEventListener("click", (event) => {
      if (!currentOpenFlip) return;
      if (currentOpenFlip.contains(event.target)) return;
      closeCurrentFlip();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCurrentFlip();
    });
  };

  const setupCopyCitation = () => {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest(".copy-citation, .copy-citation-back");
      if (!button) return;
      const text = button.getAttribute("data-citation") || "";
      const previous = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      setTimeout(() => {
        button.textContent = previous || "Copy citation";
      }, 1400);
    });
  };

  const setFeaturedApiStatus = (message, state = "") => {
    if (!featuredApiStatus) return;
    if (!message) {
      featuredApiStatus.hidden = true;
      featuredApiStatus.textContent = "";
      delete featuredApiStatus.dataset.state;
      return;
    }
    featuredApiStatus.hidden = false;
    featuredApiStatus.textContent = message;
    if (state) featuredApiStatus.dataset.state = state;
    else delete featuredApiStatus.dataset.state;
  };

  const renderFeaturedProjectsFromApi = (items) => {
    if (!featuredProjectsWrapper || !Array.isArray(items) || !items.length) return false;
    featuredProjectsWrapper.innerHTML = items
      .map((item) => {
        const badge = escapeHtml(item?.badge || "Project");
        const title = escapeHtml(item?.title || "Untitled Project");
        const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("") : "";
        const problem = escapeHtml(item?.problem || "N/A");
        const action = escapeHtml(item?.action || "N/A");
        const impact = escapeHtml(item?.impact || "N/A");
        const href = escapeHtml(item?.link?.href || "#");
        const linkLabel = escapeHtml(item?.link?.label || "View case study");
        const linkAttrs = item?.link?.external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `
                <div class="swiper-slide">
                  <article class="project-card featured-case">
                    <div class="flip-card">
                      <div class="flip-inner">
                        <div class="flip-front">
                          <div class="chip">${badge}</div>
                          <h3>${title}</h3>
                          <div class="chip-row">${tags}</div>
                        </div>
                        <div class="flip-back">
                          <p><strong>Problem:</strong> ${problem}</p>
                          <p><strong>Action:</strong> ${action}</p>
                          <p><strong>Impact:</strong> ${impact}</p>
                          <a class="text-link" href="${href}"${linkAttrs}>${linkLabel}</a>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>`;
      })
      .join("");
    return true;
  };

  const loadFeaturedProjectsFromApi = async () => {
    if (!featuredProjectsWrapper) return false;
    if (window.location.protocol === "file:") {
      setFeaturedApiStatus("Using embedded featured projects (file preview).", "offline");
      return false;
    }
    try {
      const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json().catch(() => null);
      const items = Array.isArray(data?.featured) ? data.featured : [];
      if (!items.length) throw new Error("No featured projects in API response");
      renderFeaturedProjectsFromApi(items);
      setFeaturedApiStatus("Featured projects loaded from Python API.", "online");
      return true;
    } catch {
      setFeaturedApiStatus("Using embedded featured projects (API unavailable).", "offline");
      return false;
    }
  };

  const setupFeaturedCarousel = () => {
    const featuredRoot = document.querySelector("#featured .featured-swiper");
    if (!featuredRoot || typeof window.Swiper === "undefined") return null;
    const slideCount = Array.from(
      featuredRoot.querySelectorAll(".swiper-slide")
    ).filter((slide) => !slide.classList.contains("swiper-slide-duplicate")).length;
    const canLoop = slideCount >= 3;

    const delay = 4500;
    const flipDelay = 2200;
    const backVisible = 2600;
    const flipTimers = { flip: 0, unflip: 0 };
    let manualLockedCard = null;

    const clearFlipTimers = () => {
      window.clearTimeout(flipTimers.flip);
      window.clearTimeout(flipTimers.unflip);
      flipTimers.flip = 0;
      flipTimers.unflip = 0;
    };

    const clearAllFlips = () => {
      featuredRoot.querySelectorAll(".flip-card.is-flipped").forEach((card) => {
        setFlipped(card, false, false);
      });
    };

    const getActiveFlipCard = (swiper) => {
      const activeSlide = swiper.slides[swiper.activeIndex];
      return activeSlide ? activeSlide.querySelector(".flip-card") : null;
    };

    const initFeaturedFlipA11y = () => {
      const cards = Array.from(featuredRoot.querySelectorAll(".flip-card"));
      cards.forEach((card) => {
        if (!card.hasAttribute("role")) card.setAttribute("role", "button");
        if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
        if (!card.hasAttribute("aria-pressed")) card.setAttribute("aria-pressed", "false");
      });
    };

    const scheduleActiveFlip = (swiper) => {
      clearFlipTimers();
      if (prefersReducedMotion) {
        clearAllFlips();
        return;
      }

      const activeFlip = getActiveFlipCard(swiper);
      if (!activeFlip || manualLockedCard === activeFlip) return;

      flipTimers.flip = window.setTimeout(() => {
        const currentActive = getActiveFlipCard(swiper);
        if (!currentActive || currentActive !== activeFlip || manualLockedCard === activeFlip) return;
        setFlipped(activeFlip, true, false);
      }, flipDelay);

      flipTimers.unflip = window.setTimeout(() => {
        const currentActive = getActiveFlipCard(swiper);
        if (!currentActive || currentActive !== activeFlip || manualLockedCard === activeFlip) return;
        setFlipped(activeFlip, false, false);
      }, flipDelay + backVisible);
    };

    const swiper = new window.Swiper(featuredRoot, {
      effect: "coverflow",
      centeredSlides: true,
      loop: canLoop,
      slideToClickedSlide: true,
      grabCursor: true,
      slidesPerView: "auto",
      speed: 550,
      coverflowEffect: {
        rotate: 0,
        stretch: 70,
        depth: 200,
        modifier: 1,
        slideShadows: false,
      },
      autoplay: prefersReducedMotion
        ? false
        : {
            delay,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
      keyboard: { enabled: true, onlyInViewport: true },
      breakpoints: {
        0: { coverflowEffect: { rotate: 0, stretch: 14, depth: 90, modifier: 1, slideShadows: false } },
        768: { coverflowEffect: { rotate: 0, stretch: 56, depth: 170, modifier: 1, slideShadows: false } },
        1100: { coverflowEffect: { rotate: 0, stretch: 70, depth: 200, modifier: 1, slideShadows: false } },
      },
      on: {
        init() {
          initFeaturedFlipA11y();
          scheduleActiveFlip(this);
        },
        slideChangeTransitionStart() {
          clearFlipTimers();
          clearAllFlips();
          manualLockedCard = null;
        },
        slideChangeTransitionEnd() {
          scheduleActiveFlip(this);
        }
      },
    });

    bindWheelNavigation(featuredRoot, swiper);

    featuredRoot.addEventListener("click", (event) => {
      if (prefersReducedMotion) return;
      if (event.target.closest("a")) return;

      const clickedSlide = event.target.closest(".swiper-slide");
      if (clickedSlide && !clickedSlide.classList.contains("swiper-slide-active")) {
        const realIndex = Number(clickedSlide.getAttribute("data-swiper-slide-index"));
        if (swiper.params?.loop && Number.isFinite(realIndex)) {
          swiper.slideToLoop(realIndex);
          return;
        }
        const slideIndex = Array.from(swiper.slides || []).indexOf(clickedSlide);
        if (slideIndex >= 0) {
          swiper.slideTo(slideIndex);
          return;
        }
      }

      const clickedFlip = event.target.closest(".flip-card");
      if (!clickedFlip) return;
      const activeFlip = getActiveFlipCard(swiper);
      if (!activeFlip || clickedFlip !== activeFlip) return;
      const nextState = !clickedFlip.classList.contains("is-flipped");
      setFlipped(clickedFlip, nextState, true);
      manualLockedCard = clickedFlip;
      clearFlipTimers();
    });

    featuredRoot.addEventListener("keydown", (event) => {
      if (prefersReducedMotion) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const clickedFlip = target.closest(".flip-card");
      if (!clickedFlip) return;
      if (event.target.closest("a, button")) return;
      const activeFlip = getActiveFlipCard(swiper);
      if (!activeFlip || clickedFlip !== activeFlip) return;
      event.preventDefault();
      const nextState = !clickedFlip.classList.contains("is-flipped");
      setFlipped(clickedFlip, nextState, true);
      manualLockedCard = clickedFlip;
      clearFlipTimers();
    });

    const pauseAutoplay = () => {
      if (swiper.autoplay) swiper.autoplay.stop();
    };

    const resumeAutoplay = () => {
      if (swiper.autoplay && !document.hidden && !prefersReducedMotion) swiper.autoplay.start();
    };

    featuredRoot.addEventListener("mouseenter", pauseAutoplay);
    featuredRoot.addEventListener("mouseleave", resumeAutoplay);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseAutoplay();
      else resumeAutoplay();
    });

    return swiper;
  };

  const buildSwiper = (sectionSelector, rowSelector, label, key, mode) => {
    const section = document.querySelector(sectionSelector);
    const row = section?.querySelector(rowSelector);
    if (!section || !row || typeof window.Swiper === "undefined") return null;

    let shell = row.parentElement;
    if (!shell || !shell.classList.contains("swiper-shell")) {
      shell = document.createElement("div");
      shell.className = "swiper-shell";
      row.parentNode.insertBefore(shell, row);
      shell.appendChild(row);
    }

    row.classList.add("swiper", "auto-swiper");
    row.setAttribute("aria-label", `${label} cards`);

    let wrapper = Array.from(row.children).find((child) => child.classList?.contains("swiper-wrapper")) || null;
    const slideCount = wrapper
      ? Array.from(wrapper.children).filter(
          (child) =>
            child.classList?.contains("swiper-slide") &&
            !child.classList.contains("swiper-slide-duplicate")
        ).length
      : Array.from(row.children).filter(
          (child) =>
            child.nodeType === Node.ELEMENT_NODE &&
            !child.classList?.contains("swiper-pagination") &&
            !child.classList?.contains("swiper-notification")
        ).length;
    const canLoop = slideCount >= 3;
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "swiper-wrapper";

      const children = Array.from(row.children);
      children.forEach((child) => {
        const slide = document.createElement("div");
        slide.className = "swiper-slide";
        slide.appendChild(child);
        wrapper.appendChild(slide);
      });

      row.textContent = "";
      row.appendChild(wrapper);
    }

    const isMobile = mode === "mobile";
    const isTablet = mode === "tablet";
    const isPublications = key === "publications";

    const swiperConfig = {
      slideToClickedSlide: true,
      speed: 550,
      grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      autoplay: prefersReducedMotion
        ? false
        : {
            delay: 4500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
      watchSlidesProgress: true,
    };

    if (isPublications) {
      Object.assign(swiperConfig, {
        effect: "coverflow",
        loop: canLoop,
        centeredSlides: true,
        slidesPerView: "auto",
        coverflowEffect: {
          rotate: 0,
          stretch: 70,
          depth: 200,
          modifier: 1,
          slideShadows: false,
        },
        breakpoints: {
          0: { coverflowEffect: { rotate: 0, stretch: 14, depth: 90, modifier: 1, slideShadows: false } },
          768: { coverflowEffect: { rotate: 0, stretch: 56, depth: 170, modifier: 1, slideShadows: false } },
          1100: { coverflowEffect: { rotate: 0, stretch: 70, depth: 200, modifier: 1, slideShadows: false } },
        },
      });
    } else if (isMobile || isTablet) {
      Object.assign(swiperConfig, {
        effect: "slide",
        loop: canLoop,
        centeredSlides: false,
        spaceBetween: isMobile ? 12 : 16,
        slidesPerView: isMobile ? 1 : 2,
      });
    } else {
      Object.assign(swiperConfig, {
        effect: "coverflow",
        loop: canLoop,
        spaceBetween: 20,
        slidesPerView: "auto",
        centeredSlides: true,
        coverflowEffect: {
          rotate: 0,
          stretch: 70,
          depth: 200,
          modifier: 1,
          slideShadows: false,
        },
        breakpoints: {
          901: { spaceBetween: 20, coverflowEffect: { rotate: 0, stretch: 70, depth: 200, modifier: 1, slideShadows: false } },
          1100: { spaceBetween: 20, coverflowEffect: { rotate: 0, stretch: 70, depth: 200, modifier: 1, slideShadows: false } },
        },
      });
    }

    const swiper = new window.Swiper(row, swiperConfig);
    swiper.__useNativeSlideStateStyles = isPublications;

    bindWheelNavigation(row, swiper);

    swiperRegistry.push({ swiper, key, mode });

    const pause = () => swiper.autoplay && swiper.autoplay.stop();
    const resume = () => swiper.autoplay && !document.hidden && swiper.autoplay.start();

    row.addEventListener("mouseenter", pause);
    row.addEventListener("mouseleave", resume);
    row.addEventListener("touchstart", pause, { passive: true });
    row.addEventListener(
      "touchend",
      () => {
        if (prefersReducedMotion) return;
        window.setTimeout(resume, 650);
      },
      { passive: true }
    );

    if (key === "education") {
      row.addEventListener("click", (event) => {
        if (prefersReducedMotion) return;
        if (event.target.closest(INTERACTIVE_GUARD)) return;

        const clickedCard = event.target.closest(".flip-card");
        if (!clickedCard) return;
        const clickedSlide = clickedCard.closest(".swiper-slide");
        if (!clickedSlide || !clickedSlide.classList.contains("swiper-slide-duplicate")) return;

        const cardId = clickedCard.getAttribute("data-card-id");
        const realIndex = Number(clickedSlide.getAttribute("data-swiper-slide-index"));
        const slideIndex = Array.from(swiper.slides || []).indexOf(clickedSlide);

        const flipActiveCard = () => {
          const activeSlide = swiper.slides && swiper.slides[swiper.activeIndex];
          if (!activeSlide) return;
          const activeCard = cardId
            ? activeSlide.querySelector(`[data-card-id="${cardId}"]`)
            : activeSlide.querySelector(".flip-card");
          const targetCard = activeCard || clickedCard;
          const nextState = !targetCard.classList.contains("is-flipped");

          if (nextState) {
            if (currentOpenFlip && currentOpenFlip !== targetCard) {
              setFlipped(currentOpenFlip, false, true);
            }
            setFlipped(targetCard, true, true);
            currentOpenFlip = targetCard;
          } else {
            setFlipped(targetCard, false, true);
            if (currentOpenFlip === targetCard) currentOpenFlip = null;
          }
        };

        swiper.once("slideChangeTransitionEnd", flipActiveCard);
        if (swiper.params && swiper.params.loop && Number.isFinite(realIndex)) {
          swiper.slideToLoop(realIndex);
          return;
        }
        if (slideIndex >= 0) {
          swiper.slideTo(slideIndex);
          return;
        }
        flipActiveCard();
      });
    }

    return swiper;
  };

  const getActiveCard = (swiper) => {
    const activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide || activeSlide.classList.contains("slide-hidden")) return null;
    return activeSlide.querySelector("[data-card-id], .skill-group, .edu-item, .exp-item, .project-card");
  };

  const clearAutoFlipTimers = (swiper) => {
    const state = autoFlipState.get(swiper);
    if (!state) return;
    window.clearTimeout(state.flipTimer);
    window.clearTimeout(state.backTimer);
  };

  const scheduleAutoFlip = (swiper, activeCard) => {
    clearAutoFlipTimers(swiper);
    if (prefersReducedMotion) return;
    if (!activeCard || !activeCard.classList.contains("flip-card") || activeCard.dataset.userLocked === "1") return;

    const state = { flipTimer: 0, backTimer: 0 };

    state.flipTimer = window.setTimeout(() => {
      const current = getActiveCard(swiper);
      if (!current || current !== activeCard || activeCard.dataset.userLocked === "1") return;
      setFlipped(activeCard, true, false);
    }, 2200);

    state.backTimer = window.setTimeout(() => {
      const current = getActiveCard(swiper);
      if (!current || current !== activeCard || activeCard.dataset.userLocked === "1") return;
      setFlipped(activeCard, false, false);
    }, 2200 + 2600);

    autoFlipState.set(swiper, state);
  };

  const updateSpotlight = (swiper) => {
    const allCards = Array.from(swiper.el.querySelectorAll("[data-card-id], .skill-group, .edu-item, .exp-item, .project-card"));
    const useNativeSlideStateStyles = Boolean(swiper.__useNativeSlideStateStyles);
    allCards.forEach((card) => {
      card.classList.remove("card-spotlight", "card-dim");
    });

    const spotlight = getActiveCard(swiper);

    allCards.forEach((card) => {
      if (card.closest(".slide-hidden")) return;
      if (!useNativeSlideStateStyles) {
        if (spotlight && card === spotlight) card.classList.add("card-spotlight");
        else card.classList.add("card-dim");
      }

      if (spotlight && card !== spotlight) {
        setFlipped(card, false, false);
        card.dataset.userLocked = "0";
      }
    });

    scheduleAutoFlip(swiper, spotlight);
  };

  const getSwiperMode = () => {
    if (mobileSwiperQuery.matches) return "mobile";
    if (tabletSwiperQuery.matches) return "tablet";
    return "desktop";
  };

  const destroySwipers = () => {
    swiperRegistry.forEach(({ swiper }) => {
      try {
        clearAutoFlipTimers(swiper);
        swiper.destroy(true, true);
      } catch {
        // no-op
      }
    });
    swiperRegistry.length = 0;
  };

  const setupSwipers = () => {
    const mode = getSwiperMode();
    currentSwiperMode = mode;
    destroySwipers();

    const configs = [
      ["#publications", ".cards", "Publications", "publications"],
      ["#certifications", ".cards", "Certifications", "certifications"],
      ["#skills", ".skill-groups", "Skills", "skills"],
      ["#education", ".edu-list", "Education", "education"],
      ["#experience", ".exp-list", "Experience", "experience"],
    ];

    const instances = configs
      .map(([section, row, label, key]) => buildSwiper(section, row, label, key, mode))
      .filter(Boolean);

    instances.forEach((swiper) => {
      swiper.on("init", () => updateSpotlight(swiper));
      swiper.on("slideChangeTransitionEnd", () => updateSpotlight(swiper));
      swiper.on("resize", () => updateSpotlight(swiper));
      swiper.on("touchEnd", () => updateSpotlight(swiper));
      swiper.init();
      updateSpotlight(swiper);
    });

    if (!swiperVisibilityHandlerAttached) {
      swiperVisibilityHandlerAttached = true;
      document.addEventListener("visibilitychange", () => {
        swiperRegistry.forEach(({ swiper }) => {
          if (!swiper.autoplay) return;
          if (document.hidden) swiper.autoplay.stop();
          else if (!prefersReducedMotion) swiper.autoplay.start();
        });
      });
    }

    if (!swiperResizeWatcherAttached) {
      swiperResizeWatcherAttached = true;
      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          const nextMode = getSwiperMode();
          if (nextMode !== currentSwiperMode) {
            setupSwipers();
            applySearchAndFilters();
          }
        }, 180);
      });
    }

    return instances;
  };

  const applyCardVisibilityById = (cardId, visible) => {
    const instances = document.querySelectorAll(`[data-card-id="${cardId}"]`);
    instances.forEach((card) => {
      card.classList.toggle("is-hidden", !visible);
      const slide = card.closest(".swiper-slide");
      if (slide) slide.classList.toggle("slide-hidden", !visible);
    });
  };

  const clearHighlights = (root) => {
    root.querySelectorAll("mark.hit").forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    });
  };

  const shouldSkipNode = (node) => {
    let current = node.parentNode;
    while (current && current !== node.ownerDocument.body) {
      const tag = current.nodeName;
      if (["A", "BUTTON", "MARK", "SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "SUMMARY"].includes(tag)) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  };

  const highlightText = (root, query) => {
    clearHighlights(root);
    if (!query) return;

    const terms = Array.from(new Set(query.split(" ").map((t) => t.trim()).filter(Boolean)));
    if (!terms.length) return;

    const pattern = terms.map((term) => escapeRegExp(term)).join("|");
    const regex = new RegExp(`(${pattern})`, "ig");

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();

    while (node) {
      if (!shouldSkipNode(node) && node.nodeValue && node.nodeValue.trim()) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue || "";
      regex.lastIndex = 0;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(regex, (match, _group, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        const mark = document.createElement("mark");
        mark.className = "hit";
        mark.textContent = match;
        fragment.appendChild(mark);
        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      if (parent) parent.replaceChild(fragment, textNode);
    });
  };

  const updateSearchStatus = (query, count) => {
    if (!searchStatus) return;
    if (!query) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
      return;
    }

    searchStatus.hidden = false;
    if (count > 0) {
      searchStatus.textContent = `Showing ${count} result${count === 1 ? "" : "s"} for "${query}"`;
    } else {
      searchStatus.innerHTML = `No results for "${query}". <button type="button" class="search-inline-clear" data-search-clear>Clear search</button>`;
    }
  };

  const updateUrlQuery = (query) => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  };

  const applySearchAndFilters = () => {
    let visibleCount = 0;

    cardRegistry.forEach((entry) => {
      const matchesSearch = !currentSearchQuery || entry.text.includes(currentSearchQuery);
      const matchesCert = entry.section !== "certifications" || certFilter === "all" || entry.categories.includes(certFilter);
      const visible = matchesSearch && matchesCert;

      applyCardVisibilityById(entry.id, visible);

      if (visible) {
        visibleCount += 1;
        document.querySelectorAll(`[data-card-id="${entry.id}"]`).forEach((node) => highlightText(node, currentSearchQuery));
      } else {
        document.querySelectorAll(`[data-card-id="${entry.id}"]`).forEach((node) => clearHighlights(node));
      }
    });

    swiperRegistry.forEach(({ swiper }) => {
      swiper.update();
      updateSpotlight(swiper);
    });

    updateSearchStatus(searchInput?.value?.trim() || "", visibleCount);
    updateUrlQuery(currentSearchQuery);
  };

  const jumpToFirstSearchResult = () => {
    if (!currentSearchQuery) return;

    const firstMatch = cardRegistry.find((entry) => {
      const matchesSearch = entry.text.includes(currentSearchQuery);
      const matchesCert = entry.section !== "certifications" || certFilter === "all" || entry.categories.includes(certFilter);
      return matchesSearch && matchesCert;
    });

    if (!firstMatch || !firstMatch.element) return;

    const section = firstMatch.element.closest("section");
    if (section) {
      section.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }

    const mark = firstMatch.element.querySelector("mark.hit");
    if (mark) {
      mark.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    firstMatch.element.classList.add("search-focus");
    window.setTimeout(() => {
      firstMatch.element.classList.remove("search-focus");
    }, 900);
  };

  const setupCertFilters = () => {
    const filterButtons = document.querySelectorAll(".cert-filters [data-filter]");

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("is-active"));
        button.classList.add("is-active");
        certFilter = button.getAttribute("data-filter") || "all";
        applySearchAndFilters();
      });
    });
  };

  const setupPremiumSearch = () => {
    if (!searchRoot || !searchExpand || !searchInput || !searchSubmitButton || !searchSuggestions) return;

    let suggestions = [];
    let activeSuggestionIndex = -1;
    let hoverOpen = false;
    let focusOpen = false;

    const collectSuggestionSource = () => {
      const seen = new Set();
      const values = [];
      const nodes = document.querySelectorAll("h3, .chip-row .chip, .skills .skill, .meta-badge");
      nodes.forEach((node) => {
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) return;
        const key = text.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        values.push(text);
      });
      return values;
    };

    let sourceValues = collectSuggestionSource();

    const closeSuggestions = () => {
      suggestions = [];
      activeSuggestionIndex = -1;
      searchSuggestions.hidden = true;
      searchSuggestions.innerHTML = "";
    };

    const setActiveSuggestion = (nextIndex) => {
      const options = Array.from(searchSuggestions.querySelectorAll(".search-suggestion"));
      if (!options.length) return;
      activeSuggestionIndex = nextIndex;
      options.forEach((option, index) => {
        option.classList.toggle("is-active", index === activeSuggestionIndex);
        option.setAttribute("aria-selected", index === activeSuggestionIndex ? "true" : "false");
      });
    };

    const applySuggestion = (value) => {
      searchInput.value = value;
      syncSearchState();
      closeSuggestions();
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const renderSuggestions = () => {
      const query = (searchInput.value || "").toLowerCase().trim();
      if (query.length < 2) {
        closeSuggestions();
        return;
      }

      const starts = [];
      const contains = [];
      sourceValues.forEach((item) => {
        const hay = item.toLowerCase();
        if (!hay.includes(query)) return;
        if (hay.startsWith(query)) starts.push(item);
        else contains.push(item);
      });

      suggestions = starts.concat(contains).slice(0, 8);
      if (!suggestions.length) {
        closeSuggestions();
        return;
      }

      searchSuggestions.innerHTML = "";
      suggestions.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-suggestion";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", "false");
        button.textContent = item;
        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        button.addEventListener("click", () => {
          applySuggestion(item);
          searchInput.focus();
        });
        searchSuggestions.appendChild(button);
        if (index === 0) {
          button.classList.add("is-active");
          button.setAttribute("aria-selected", "true");
        }
      });

      activeSuggestionIndex = 0;
      searchSuggestions.hidden = false;
    };

    const shouldStayOpen = () => hoverOpen || focusOpen || !!searchInput.value;

    const syncSearchState = () => {
      const hasValue = !!searchInput.value;
      const isOpen = shouldStayOpen();
      searchExpand.classList.toggle("is-open", isOpen);
      searchExpand.classList.toggle("has-value", hasValue);
      searchRoot.setAttribute("aria-expanded", isOpen ? "true" : "false");
      searchSubmitButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    const collapseIfEmptyAndIdle = () => {
      if (searchInput.value) return;
      if (focusOpen || hoverOpen) return;
      closeSuggestions();
      syncSearchState();
    };

    searchExpand.addEventListener("mouseenter", () => {
      hoverOpen = true;
      syncSearchState();
    });

    searchExpand.addEventListener("mouseleave", () => {
      hoverOpen = false;
      collapseIfEmptyAndIdle();
    });

    searchRoot.addEventListener("click", () => {
      hoverOpen = true;
      syncSearchState();
    });

    searchSubmitButton.addEventListener("click", (event) => {
      event.preventDefault();
      hoverOpen = true;
      syncSearchState();
      searchInput.focus();
    });

    searchInput.addEventListener("focus", () => {
      focusOpen = true;
      sourceValues = collectSuggestionSource();
      syncSearchState();
      renderSuggestions();
    });

    searchInput.addEventListener("blur", () => {
      focusOpen = false;
      window.setTimeout(() => {
        if (document.activeElement !== searchInput) {
          closeSuggestions();
          collapseIfEmptyAndIdle();
        }
      }, 120);
    });

    searchInput.addEventListener("input", () => {
      syncSearchState();
      renderSuggestions();
    });

    searchInput.addEventListener("keydown", (event) => {
      const options = Array.from(searchSuggestions.querySelectorAll(".search-suggestion"));
      if (event.key === "ArrowDown" && options.length) {
        event.preventDefault();
        const next = activeSuggestionIndex < options.length - 1 ? activeSuggestionIndex + 1 : 0;
        setActiveSuggestion(next);
        return;
      }
      if (event.key === "ArrowUp" && options.length) {
        event.preventDefault();
        const next = activeSuggestionIndex > 0 ? activeSuggestionIndex - 1 : options.length - 1;
        setActiveSuggestion(next);
        return;
      }
      if (event.key === "Enter" && options.length && activeSuggestionIndex >= 0) {
        event.preventDefault();
        const selected = suggestions[activeSuggestionIndex];
        if (selected) applySuggestion(selected);
        return;
      }
      if (event.key === "Escape") {
        closeSuggestions();
        if (!searchInput.value) {
          hoverOpen = false;
          focusOpen = false;
          syncSearchState();
          return;
        }
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        hoverOpen = true;
        focusOpen = true;
        syncSearchState();
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(".premium-search, .nav-search")) return;
      hoverOpen = false;
      closeSuggestions();
      collapseIfEmptyAndIdle();
    });

    if (searchClearButton) {
      searchClearButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        closeSuggestions();
        hoverOpen = false;
        focusOpen = false;
        syncSearchState();
      });
    }

    syncSearchState();
  };

  const setupHeaderSearchPanel = () => {
    const navBtn = navSearchBtn;
    const panel = navSearchPanel;
    const input = searchInput;
    const clearBtn = searchClearButton;
    const root = searchRoot;
    if (!navBtn || !panel || !input || !root) return;

    const syncState = (open) => {
      panel.hidden = !open;
      root.classList.toggle("is-open", open);
      root.setAttribute("aria-expanded", open ? "true" : "false");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const openPanel = () => {
      if (!panel.hidden) {
        syncState(true);
      } else {
        syncState(true);
      }
      window.setTimeout(() => {
        try {
          input.focus({ preventScroll: true });
        } catch {
          input.focus();
        }
      }, 0);
    };

    const closePanel = ({ returnFocus = false } = {}) => {
      if (!panel.hidden && document.activeElement === input) {
        input.blur();
      }
      syncState(false);
      if (returnFocus) {
        navBtn.focus();
      }
    };

    navBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (panel.hidden) {
        openPanel();
      } else {
        closePanel({ returnFocus: true });
      }
    });

    document.addEventListener("click", (event) => {
      if (panel.hidden) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || panel.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      closePanel({ returnFocus: true });
    }, true);

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        window.setTimeout(() => {
          closePanel({ returnFocus: true });
        }, 0);
      });
    }

    syncState(false);
  };
  const setupSearch = () => {
    if (!searchInput) return;

    const debounce = (fn, delay = 300) => {
      let timer;
      return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
      };
    };

    const clearSearch = () => {
      searchInput.value = "";
      currentSearchQuery = "";
      applySearchAndFilters();
      searchInput.focus();
    };

    const onInput = debounce((event) => {
      currentSearchQuery = normalizeText(event.target.value || "");
      applySearchAndFilters();
      jumpToFirstSearchResult();
    }, 300);

    searchInput.addEventListener("input", onInput);
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearSearch();
      } else if (event.key === "Enter") {
        event.preventDefault();
        currentSearchQuery = normalizeText(searchInput.value || "");
        applySearchAndFilters();
        jumpToFirstSearchResult();
      }
    });

    if (searchClearButton) {
      searchClearButton.addEventListener("click", clearSearch);
    }

    if (searchStatus) {
      searchStatus.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.hasAttribute("data-search-clear")) {
          clearSearch();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchInput && normalizeText(searchInput.value)) {
        clearSearch();
      }
    });

    const urlQuery = new URL(window.location.href).searchParams.get("q");
    if (urlQuery) {
      searchInput.value = urlQuery;
      currentSearchQuery = normalizeText(urlQuery);
      applySearchAndFilters();
      jumpToFirstSearchResult();
    }
  };

  const setupContactForm = () => {
    if (!contactForm || !contactNameInput || !contactEmailInput || !contactMessageInput || !contactSubmit || !contactFormStatus) {
      return;
    }

    const fallbackEmailLink = document.querySelector('.contact-link[href^="mailto:"]');
    const fallbackEmail = fallbackEmailLink?.textContent?.trim() || "shaikazhadshahzad@gmail.com";

    const setFormStatus = (text, state = "") => {
      contactFormStatus.textContent = text;
      if (state) contactFormStatus.dataset.state = state;
      else delete contactFormStatus.dataset.state;
    };

    const setApiStatus = (text, state = "") => {
      if (!contactApiStatus) return;
      contactApiStatus.textContent = text;
      if (state) contactApiStatus.dataset.state = state;
      else delete contactApiStatus.dataset.state;
    };

    const checkApiStatus = async () => {
      if (!contactApiStatus) return;
      if (window.location.protocol === "file:") {
        setApiStatus("Python API: offline (file preview)", "offline");
        return;
      }

      try {
        const response = await fetch("/api/health", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));
        setApiStatus("Python API: online", "online");
      } catch {
        setApiStatus("Python API: offline (static mode)", "offline");
      }
    };

    void checkApiStatus();

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;

      const payload = {
        name: contactNameInput.value.trim(),
        email: contactEmailInput.value.trim(),
        message: contactMessageInput.value.trim(),
        website: contactWebsiteInput?.value ?? "",
        source: window.location.href,
      };

      if (!payload.name || !payload.email || !payload.message) {
        setFormStatus("Please complete all fields before sending.", "error");
        return;
      }

      contactSubmit.disabled = true;
      setFormStatus("Sending to local Python API...", "pending");

      let apiResponded = false;

      try {
        if (window.location.protocol === "file:") {
          throw new Error("Open the portfolio through a local server.");
        }

        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        apiResponded = true;
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || `Request failed (${response.status})`);
        }

        contactForm.reset();
        setApiStatus("Python API: online", "online");
        const successMessage = typeof data?.message === "string" ? data.message : "Message captured locally by Python. Check contact_messages/messages.db.";
        setFormStatus(successMessage, "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to reach the Python API.";
        if (apiResponded) setApiStatus("Python API: online", "online");
        else setApiStatus("Python API: offline", "offline");
        const prefix = apiResponded ? "Submission blocked: " : "Python API unavailable: ";
        setFormStatus(`${prefix}${message} Use the email link above (${fallbackEmail}).`, "error");
      } finally {
        contactSubmit.disabled = false;
      }
    });
  };

  const setupChatbot = () => {
    if (!chatbot || !chatbotToggle || !chatbotPanel || !chatbotClose || !chatbotBody || !chatbotForm || !chatbotInput) return;

    const appendMessage = (role, text) => {
      const row = document.createElement("div");
      row.className = `chatbot-row ${role}`;
      const bubble = document.createElement("div");
      bubble.className = "chatbot-msg";
      bubble.textContent = text;
      row.appendChild(bubble);
      chatbotBody.appendChild(row);
      chatbotBody.scrollTop = chatbotBody.scrollHeight;
    };

    const openChatbot = () => {
      chatbotPanel.hidden = false;
      chatbotToggle.setAttribute("aria-expanded", "true");
      chatbotInput.focus();
    };

    const closeChatbot = () => {
      chatbotPanel.hidden = true;
      chatbotToggle.setAttribute("aria-expanded", "false");
    };

    const getReply = (message) => {
      const q = normalizeText(message);

      if (q.includes("contact") || q.includes("email") || q.includes("hire")) {
        return "I am open to software, cybersecurity, and ML engineering roles. Reach me at shaikazhadshahzad@gmail.com or use the Contact section.";
      }
      if (q.includes("resume") || q.includes("cv")) {
        return "Use the Download Resume button in the hero section.";
      }
      if (q.includes("project") || q.includes("featured")) {
        return "Start with Featured Work for high-impact security and ML case studies.";
      }
      if (q.includes("skill") || q.includes("technology") || q.includes("tool")) {
        return "Skills include cybersecurity, threat analysis, Python, AWS, and data/ML workflows.";
      }
      if (q.includes("education") || q.includes("degree")) {
        return "Education includes M.S. in Cyber/Computer Forensics and Counterterrorism plus B.Tech in ECE.";
      }
      if (q.includes("experience") || q.includes("work")) {
        return "Experience spans cybersecurity engineering, risk analysis, healthcare data integration, and telecom operations.";
      }
      if (q.includes("certification") || q.includes("comptia") || q.includes("hackerrank")) {
        return "Certifications include Security+, Fortinet NSE, and HackerRank credentials.";
      }
      if (q.includes("github") || q.includes("code")) {
        return "GitHub: github.com/s-shahzad";
      }
      return "I can help with projects, skills, certifications, education, experience, contact, and resume.";
    };

    chatbotToggle.addEventListener("click", () => {
      if (chatbotPanel.hidden) openChatbot();
      else closeChatbot();
    });

    chatbotClose.addEventListener("click", closeChatbot);

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (chatbot.contains(target)) return;
      if (!chatbotPanel.hidden) closeChatbot();
    });

    chatbotForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = chatbotInput.value.trim();
      if (!text) return;
      appendMessage("user", text);
      chatbotInput.value = "";
      window.setTimeout(() => {
        appendMessage("bot", getReply(text));
      }, 180);
    });

    appendMessage("bot", "Hi, I am your portfolio assistant. Ask about projects, impact, skills, resume, or contact.");
  };

  const bootstrapApp = async () => {
    setupThemeToggle();
    setupNavigation();
    initAnalytics();
    setupSlideClickToCenter();
    setupBrandBadge();
    setupReveal();
    setupEducationLogoFallbacks();
    setupCopyCitation();
    setupPremiumSearch();
    setupSearch();
    setupHeaderSearchPanel();
    setupContactForm();
    setupChatbot();
    setupCertFilters();
    await loadFeaturedProjectsFromApi();
    setupFlipCards();
    setupFeaturedCarousel();
    applySearchAndFilters();
  };

  void bootstrapApp();

  let swipersStarted = false;
  const startDeferredSwipers = () => {
    if (swipersStarted) return;
    swipersStarted = true;
    setupSwipers();
    applySearchAndFilters();
  };

  const deferredSectionSelectors = ["#publications", "#certifications", "#skills", "#education", "#experience"];
  const deferredSections = deferredSectionSelectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  if (!deferredSections.length || !("IntersectionObserver" in window)) {
    startDeferredSwipers();
  } else {
    const deferredObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        deferredObserver.disconnect();
        startDeferredSwipers();
      },
      { rootMargin: "220px 0px" }
    );
    deferredSections.forEach((section) => deferredObserver.observe(section));
  }
})();
