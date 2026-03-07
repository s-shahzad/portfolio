(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const searchInput = document.getElementById("site-search");
  const searchClearButton = document.getElementById("site-search-clear");
  const searchStatus = document.getElementById("search-status");
  const featuredFilterButtons = Array.from(document.querySelectorAll(".featured-filters [data-featured-filter]"));
  const featuredProjectsWrapper = document.getElementById("featuredProjectsWrapper");
  const featuredApiStatus = document.getElementById("featuredApiStatus");
  const contactForm = document.getElementById("contactForm");
  const contactNameInput = document.getElementById("contactName");
  const contactEmailInput = document.getElementById("contactEmail");
  const contactMessageInput = document.getElementById("contactMessage");
  const contactWebsiteInput = document.getElementById("contactWebsite");
  const contactSubmit = document.getElementById("contactSubmit");
  const contactFormStatus = document.getElementById("contactFormStatus");
  const contactApiStatus = document.getElementById("contactApiStatus");

  let lastFocusedElement = null;
  let currentSearchQuery = "";
  let certFilter = "all";
  let featuredFilter = "all";
  let featuredCarousel = null;

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

  const setupThemeToggle = () => {
    document.documentElement.setAttribute("data-theme", "dark");
  };
  const setupNavigation = () => {
    const syncMobileSearchPlacement = () => {
      if (!nav || !mobileMenu || !navToggle || !searchRoot) return;

      if (mobileNavQuery.matches) {
        const firstItem = mobileMenu.firstElementChild;
        if (firstItem !== searchRoot) {
          mobileMenu.insertBefore(searchRoot, firstItem || null);
        }
      } else {
        if (!nav.contains(searchRoot)) {
          nav.insertBefore(searchRoot, navToggle);
        }
      }
    };

    const scrollTargetWithMobileOffset = (target, { smooth = false } = {}) => {
      if (!(target instanceof Element)) return;

      target.scrollIntoView({
        behavior: smooth && !prefersReducedMotion ? "smooth" : "auto",
        block: "start",
      });
    };

    const syncHashOffset = ({ smooth = false } = {}) => {
      const hash = window.location.hash;
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      scrollTargetWithMobileOffset(target, { smooth });
    };

    const scheduleHashOffsetResync = () => {
      if (!mobileNavQuery.matches) return;
      const retryDelays = [180, 620];
      retryDelays.forEach((delay) => {
        window.setTimeout(() => {
          syncHashOffset({ smooth: false });
        }, delay);
      });
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
      mobileNavQuery.addEventListener("change", () => syncHashOffset({ smooth: false }));
    } else if (typeof mobileNavQuery.addListener === "function") {
      mobileNavQuery.addListener(syncMobileSearchPlacement);
      mobileNavQuery.addListener(() => syncHashOffset({ smooth: false }));
    }

    window.addEventListener("hashchange", () => syncHashOffset({ smooth: true }));
    window.setTimeout(() => syncHashOffset({ smooth: false }), 0);

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
        history.replaceState(null, "", href);
        closeMobileMenu();
        window.requestAnimationFrame(() => {
          scrollTargetWithMobileOffset(target, { smooth: true });
          scheduleHashOffsetResync();
        });
        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
          lastFocusedElement.focus();
        }
      });
    });

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

  const setupFlipCards = () => {
    cardRegistry.length = 0;
    let idCounter = 0;
    const targets = document.querySelectorAll(".project-card, .skill-group, .edu-item, .exp-item");

    targets.forEach((card) => {
      idCounter += 1;
      const cardId = `card-${idCounter}`;
      card.dataset.cardId = cardId;
      card.classList.remove("flip-enhanced", "is-flipped");
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.removeAttribute("aria-pressed");
      card.removeAttribute("aria-label");

      cardRegistry.push({
        id: cardId,
        element: card,
        section: card.closest("section")?.id || "",
        categories: (card.getAttribute("data-category") || "").split(" ").filter(Boolean),
        text: normalizeText(card.textContent || ""),
      });
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
        const title = escapeHtml(item?.title || "Untitled Project");
        const summarySource = item?.summary || item?.result || item?.impact || item?.action || item?.problem || "";
        const summary = escapeHtml(summarySource);
        const status = escapeHtml(item?.status || "");
        const categories = Array.isArray(item?.categories) ? item.categories.map((value) => String(value).trim()).filter(Boolean) : [];
        const categoryAttr = categories.length ? ` data-category="${escapeHtml(categories.join(" "))}"` : "";
        const href = escapeHtml(item?.link?.href || "");
        const linkLabel = escapeHtml(item?.link?.label || "View project");
        const linkAttrs = item?.link?.external ? ' target="_blank" rel="noopener noreferrer"' : "";
        const linkMarkup = href && href !== "#"
          ? `<a class="text-link" href="${href}"${linkAttrs}>${linkLabel}</a>`
          : status
            ? `<p class="featured-note">Status: ${status}</p>`
            : "";
        return `
                <div class="swiper-slide">
                  <article class="project-card featured-case"${categoryAttr}>
                    <h3>${title}</h3>
                    ${summary ? `<p>${summary}</p>` : ""}
                    ${linkMarkup}
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
    if (!featuredRoot || typeof window.Swiper === "undefined") {
      featuredCarousel = null;
      return null;
    }
    const slideCount = Array.from(featuredRoot.querySelectorAll(".swiper-slide"))
      .filter((slide) => !slide.classList.contains("swiper-slide-duplicate")).length;
    const canLoop = slideCount >= 3;

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
            delay: 4500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
      keyboard: { enabled: true, onlyInViewport: true },
      breakpoints: {
        0: { coverflowEffect: { rotate: 0, stretch: 14, depth: 90, modifier: 1, slideShadows: false } },
        768: { coverflowEffect: { rotate: 0, stretch: 56, depth: 170, modifier: 1, slideShadows: false } },
        1100: { coverflowEffect: { rotate: 0, stretch: 70, depth: 200, modifier: 1, slideShadows: false } },
      },
    });

    bindWheelNavigation(featuredRoot, swiper);

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

    featuredCarousel = swiper;
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

  const scheduleAutoFlip = (swiper) => {
    clearAutoFlipTimers(swiper);
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

    });

    scheduleAutoFlip(swiper);
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

  const syncFeaturedCarousel = () => {
    if (!featuredCarousel) return;

    featuredCarousel.update();

    const firstVisibleSlide = Array.from(document.querySelectorAll("#featured .swiper-slide"))
      .find((slide) => !slide.classList.contains("swiper-slide-duplicate") && !slide.classList.contains("slide-hidden"));

    if (!firstVisibleSlide) return;

    const realIndex = Number(firstVisibleSlide.getAttribute("data-swiper-slide-index"));
    if (Number.isFinite(realIndex)) {
      featuredCarousel.slideToLoop(realIndex, 0, false);
      return;
    }

    const slideIndex = Array.from(featuredCarousel.slides || []).indexOf(firstVisibleSlide);
    if (slideIndex >= 0) {
      featuredCarousel.slideTo(slideIndex, 0, false);
    }
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
      searchStatus.textContent = `No results for "${query}". `;
      const clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "search-inline-clear";
      clearButton.setAttribute("data-search-clear", "");
      clearButton.textContent = "Clear search";
      searchStatus.appendChild(clearButton);
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
      const matchesFeatured = entry.section !== "featured" || featuredFilter === "all" || entry.categories.includes(featuredFilter);
      const visible = matchesSearch && matchesCert && matchesFeatured;

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

    syncFeaturedCarousel();

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

  const setupFeaturedFilters = () => {
    if (!featuredFilterButtons.length) return;

    featuredFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        featuredFilterButtons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        featuredFilter = button.getAttribute("data-featured-filter") || "all";
        applySearchAndFilters();
      });
    });
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
        const successMessage = typeof data?.message === "string" && data.message.trim()
          ? `${data.message.trim()} I usually reply within 24-48 hours.`
          : "Thanks, your message was sent successfully. I usually reply within 24-48 hours.";
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

  const bootstrapApp = async () => {
    setupThemeToggle();
    setupNavigation();
    initAnalytics();
    setupSlideClickToCenter();
    setupBrandBadge();
    setupReveal();
    setupEducationLogoFallbacks();
    setupCopyCitation();
    setupSearch();
    setupHeaderSearchPanel();
    setupContactForm();
    setupCertFilters();
    setupFeaturedFilters();
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






