(() => {
  const VERSION = "20260226-01";
  const HISTORY_KEY = "portfolio_chatbot_history_v4";
  const STATE_KEY = "portfolio_chatbot_state_v4";
  const MAX_HISTORY = 28;
  const REDUCED_MOTION = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const BOT_LABEL = "Portfolio Assistant";
  const EMAIL = "azhadshahzads@gmail.com";
  const GITHUB_URL = "https://github.com/s-shahzad";
  const RESUME_URL = "reports/assets/Azhad_Shahzad_Shaik_Cybersecurity_Engineer_Resume.pdf";
  const DEFAULT_PROMPTS = [
    "Show me your best cybersecurity projects",
    "What skills do you use for security and ML?",
    "How can I contact you?",
    "Open your resume and experience summary",
    "What certifications do you have?",
    "Tell me about the cyber IOC demo",
  ];

  const SECTION_TARGETS = {
    home: "#home",
    featured: "#featured",
    projects: "#featured",
    certifications: "#certifications",
    skills: "#skills",
    education: "#education",
    experience: "#experience",
    contact: "#contact",
  };

  const INTENTS = [
    {
      id: "contact",
      keywords: ["contact", "email", "hire", "reach", "available", "interview"],
      reply: {
        title: "Contact + Availability",
        text: "The fastest way to reach Shahzad is email. You can also use the built-in contact form on the page.",
        bullets: [
          `Email: ${EMAIL}`,
          "Contact form is connected to the local Python backend (with spam protection).",
          "Best path for hiring outreach: open Contact section and send a short role summary.",
        ],
        actions: [
          { type: "scroll", target: "#contact", label: "Open Contact Section" },
          { type: "copy_email", label: "Copy Email" },
          { type: "mailto", href: `mailto:${EMAIL}`, label: "Email Now" },
        ],
        suggestions: ["What roles are you targeting?", "Show your resume", "What security tools do you use?"],
      },
    },
    {
      id: "resume",
      keywords: ["resume", "cv", "download resume", "download cv", "profile summary"],
      reply: {
        title: "Resume + Quick Summary",
        text: "You can download the resume directly from the portfolio and review experience highlights in the Experience section.",
        bullets: [
          "Background across cybersecurity engineering, risk analysis, data analytics, and telecom operations.",
          "Strong fit for cybersecurity, SOC, IR, and security/data hybrid roles.",
          "Portfolio includes contact form, admin tools, and cyber IOC demo upgrades.",
        ],
        actions: [
          { type: "open", href: RESUME_URL, label: "Open Resume PDF", newTab: true },
          { type: "scroll", target: "#experience", label: "Open Experience" },
          { type: "scroll", target: "#education", label: "Open Education" },
        ],
        suggestions: ["Show certifications", "What projects are featured?", "How can I contact you?"],
      },
    },
    {
      id: "projects",
      keywords: ["project", "projects", "featured", "portfolio work", "build", "demo"],
      reply: {
        title: "Featured Work",
        text: "Start in Featured Work for the strongest security/ML projects. I can also narrow by topic.",
        bullets: [
          "Use the site search to filter cards by keywords (e.g., SOC, Python, ML, forensics).",
          "Cyber IOC demo and admin workflow pages show Python backend integration.",
          "GitHub profile is available for code review and deeper examples.",
        ],
        actions: [
          { type: "scroll", target: "#featured", label: "Open Featured Work" },
          { type: "search", term: "cyber", label: "Search: cyber" },
          { type: "open", href: GITHUB_URL, label: "Open GitHub", newTab: true },
        ],
        suggestions: ["Show Python-related work", "Tell me about the cyber demo", "What skills power these projects?"],
      },
    },
    {
      id: "skills",
      keywords: ["skill", "skills", "stack", "technology", "tool", "tools", "python", "aws"],
      reply: {
        title: "Skills + Stack",
        text: "The portfolio highlights cybersecurity, data/ML, and platform tooling with a practical focus.",
        bullets: [
          "Security: threat modeling, vulnerability analysis, incident response, risk assessment.",
          "Data/ML: Python, data validation, ML-based detection workflows.",
          "Tools: Wireshark, Nmap, Linux, PowerShell, TCP/IP, AWS exposure.",
        ],
        actions: [
          { type: "scroll", target: "#skills", label: "Open Skills" },
          { type: "search", term: "Python", label: "Search: Python" },
          { type: "search", term: "Wireshark", label: "Search: Wireshark" },
        ],
        suggestions: ["Show experience", "Show cybersecurity projects", "What certifications validate this?"],
      },
    },
    {
      id: "experience",
      keywords: ["experience", "work", "job", "jobs", "roles", "career", "employment"],
      reply: {
        title: "Experience Highlights",
        text: "Experience spans cybersecurity, risk, data analytics, software engineering, and telecom operations.",
        bullets: [
          "Recent roles include Jr. Data Analyst and Cyber Security Engineer responsibilities.",
          "Hands-on work includes detection support, validation workflows, risk analysis, and remediation guidance.",
          "Portfolio Experience section includes impact-focused summaries and resume link.",
        ],
        actions: [
          { type: "scroll", target: "#experience", label: "Open Experience" },
          { type: "open", href: RESUME_URL, label: "Open Resume PDF", newTab: true },
          { type: "prompt", prompt: "What industries have you worked in?", label: "Ask: industries" },
        ],
        suggestions: ["What certifications do you have?", "How can I contact you?", "Tell me about education"],
      },
    },
    {
      id: "education",
      keywords: ["education", "degree", "university", "college", "masters", "btech", "ms"],
      reply: {
        title: "Education",
        text: "Education combines cybersecurity/forensics graduate work with an engineering foundation.",
        bullets: [
          "M.S. in Cyber/Computer Forensics and Counterterrorism (Sacred Heart University).",
          "B.Tech in Electronics and Communications Engineering.",
          "Strong combination for security analysis, systems thinking, and technical operations.",
        ],
        actions: [
          { type: "scroll", target: "#education", label: "Open Education" },
          { type: "scroll", target: "#certifications", label: "Open Certifications" },
        ],
        suggestions: ["Show experience", "Show certifications", "What tools do you use?"],
      },
    },
    {
      id: "certifications",
      keywords: ["cert", "certs", "certification", "security+", "comptia", "fortinet", "hackerrank", "nse"],
      reply: {
        title: "Certifications",
        text: "The Certifications section includes verified credentials relevant to cybersecurity and technical capability.",
        bullets: [
          "CompTIA Security+",
          "Fortinet NSE certifications",
          "HackerRank credentials and technical assessments",
        ],
        actions: [
          { type: "scroll", target: "#certifications", label: "Open Certifications" },
          { type: "search", term: "Fortinet", label: "Search: Fortinet" },
          { type: "search", term: "Security+", label: "Search: Security+" },
        ],
        suggestions: ["Show skills", "Show projects", "How can I contact you?"],
      },
    },
    {
      id: "cyber_demo",
      keywords: ["ioc", "cyber demo", "threat", "intel", "extractor", "incident", "demo page"],
      reply: {
        title: "Cyber IOC Demo",
        text: "There is a dedicated Python-backed IOC extractor demo page that parses URLs, IPs, domains, and hashes.",
        bullets: [
          "Accepts pasted incident notes/logs and extracts grouped indicators.",
          "Shows counts, grouped output, and raw JSON response.",
          "Useful as a practical cybersecurity + Python portfolio demo.",
        ],
        actions: [
          { type: "open", href: "/cyber-demo.html", label: "Open Cyber IOC Demo", newTab: true },
          { type: "prompt", prompt: "What Python features power this portfolio?", label: "Ask about Python backend" },
        ],
        suggestions: ["Show projects", "Open admin page", "How does the contact backend work?"],
      },
    },
    {
      id: "admin",
      keywords: ["admin", "dashboard", "messages", "sqlite", "contact messages", "backend admin"],
      reply: {
        title: "Admin + Backend Tools",
        text: "The portfolio includes a Python admin page for contact-message review, filtering, charting, and cleanup.",
        bullets: [
          "SQLite-backed message store",
          "Search/filter/delete actions + trend chart",
          "Admin page access is restricted (localhost or token-based mode)",
        ],
        actions: [
          { type: "open", href: "/admin.html", label: "Open Admin Page", newTab: true },
          { type: "prompt", prompt: "How can I contact you?", label: "Ask about contact form" },
        ],
        suggestions: ["Tell me about the cyber demo", "Show Python backend features", "How can I hire you?"],
      },
    },
  ];

  const normalize = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const randomDelay = () => (REDUCED_MOTION ? 0 : Math.round(180 + Math.random() * 240));
  const isEditable = (target) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

  const copyText = async (value) => {
    const text = String(value ?? "");
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  };
  const formatTime = (ts) => {
    try {
      return new Date(ts || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "now";
    }
  };

  const keywordScore = (q, keywords) => {
    let score = 0;
    for (const keyword of keywords || []) {
      const key = normalize(keyword);
      if (!key) continue;
      if (q === key) score += 5;
      else if (q.includes(key)) score += key.split(" ").length > 1 ? 4 : 2;
    }
    return score;
  };

  const matchIntent = (message) => {
    const q = normalize(message);
    if (!q) return null;
    let best = null;
    for (const intent of INTENTS) {
      const score = keywordScore(q, intent.keywords);
      if (!score) continue;
      if (!best || score > best.score) best = { intent, score };
    }
    if (best) return best.intent;

    if (q.includes("industry") || q.includes("industries")) {
      return {
        id: "industries",
        reply: {
          title: "Industry Exposure",
          text: "Experience spans healthcare/data workflows, cybersecurity services, telecom operations, and software delivery environments.",
          bullets: [
            "Healthcare/data interoperability and validation work",
            "Cybersecurity engineering and risk-analysis roles",
            "Telecom network operations and infrastructure support",
          ],
          actions: [
            { type: "scroll", target: "#experience", label: "Open Experience" },
            { type: "open", href: RESUME_URL, label: "Open Resume PDF", newTab: true },
          ],
          suggestions: ["What tools do you use?", "Show certifications", "How can I contact you?"],
        },
      };
    }

    if (q.includes("python") && (q.includes("backend") || q.includes("offer") || q.includes("portfolio"))) {
      return {
        id: "python_backend",
        reply: {
          title: "Python in This Portfolio",
          text: "Python powers the backend and admin workflows behind the portfolio demos.",
          bullets: [
            "Contact form API + SQLite message storage",
            "Admin page for filtering/reviewing/deleting messages",
            "Cyber IOC extraction demo API",
            "Chart endpoints (SVG/PNG) for analytics visuals",
          ],
          actions: [
            { type: "open", href: "/cyber-demo.html", label: "Open Cyber Demo", newTab: true },
            { type: "open", href: "/admin.html", label: "Open Admin", newTab: true },
            { type: "scroll", target: "#contact", label: "Open Contact" },
          ],
          suggestions: ["How can I contact you?", "Show projects", "What skills do you use?"],
        },
      };
    }

    return null;
  };

  const parseCommand = (message) => {
    const raw = String(message || "").trim();
    if (!raw.startsWith("/")) return null;
    const [cmd, ...rest] = raw.slice(1).split(/\s+/);
    const arg = rest.join(" ").trim();
    return { cmd: normalize(cmd), arg, raw };
  };

  const buildCommandReply = ({ cmd, arg }) => {
    if (cmd === "help") {
      return {
        title: "Chat Commands",
        text: "Commands are optional, but useful for fast navigation.",
        bullets: [
          "/help, /clear, /copy",
          "/resume, /contact, /projects, /skills, /experience, /education, /certs",
          "/admin, /cyber, /search <term>",
        ],
        actions: [
          { type: "prompt", prompt: "Show me your best cybersecurity projects", label: "Try: projects" },
          { type: "prompt", prompt: "How can I contact you?", label: "Try: contact" },
        ],
        suggestions: DEFAULT_PROMPTS.slice(0, 4),
      };
    }

    if (cmd === "clear" || cmd === "new") {
      return { commandAction: { type: "clear_chat" } };
    }
    if (cmd === "copy") {
      return { commandAction: { type: "copy_transcript" } };
    }
    if (cmd === "search") {
      return arg
        ? {
            title: `Search: ${arg}`,
            text: "I can populate the site search and move you to the first visible match.",
            actions: [
              { type: "search", term: arg, label: `Run site search: ${arg}` },
              { type: "scroll", target: "#featured", label: "Go to Featured Work" },
            ],
            suggestions: ["Search Python", "Search cyber", "Show certifications"],
          }
        : {
            title: "Search Command",
            text: "Use `/search <term>` to run the portfolio search.",
            suggestions: ["/search python", "/search cyber", "/search fortinet"],
          };
    }

    const map = {
      resume: "resume",
      cv: "resume",
      contact: "contact",
      projects: "projects",
      project: "projects",
      skills: "skills",
      skill: "skills",
      experience: "experience",
      work: "experience",
      education: "education",
      certs: "certifications",
      cert: "certifications",
      certifications: "certifications",
      cyber: "cyber_demo",
      admin: "admin",
    };
    const mapped = map[cmd];
    if (mapped) {
      const intent = INTENTS.find((item) => item.id === mapped);
      return intent ? intent.reply : null;
    }

    return {
      title: "Unknown Command",
      text: `I do not recognize /${cmd}. Try /help for supported commands.`,
      suggestions: ["/help", "Show projects", "How can I contact you?"],
    };
  };

  const sanitizeHistoryItem = (item) => {
    if (!item || typeof item !== "object") return null;
    const role = item.role === "user" ? "user" : "bot";
    const out = {
      role,
      text: String(item.text || ""),
      title: item.title ? String(item.title) : "",
      ts: Number(item.ts || Date.now()),
    };
    if (Array.isArray(item.bullets)) out.bullets = item.bullets.map((v) => String(v)).slice(0, 8);
    if (Array.isArray(item.actions)) {
      out.actions = item.actions
        .filter((a) => a && typeof a === "object")
        .map((a) => ({
          type: String(a.type || ""),
          label: String(a.label || "Action"),
          href: a.href ? String(a.href) : undefined,
          target: a.target ? String(a.target) : undefined,
          term: a.term ? String(a.term) : undefined,
          prompt: a.prompt ? String(a.prompt) : undefined,
          value: a.value ? String(a.value) : undefined,
          newTab: Boolean(a.newTab),
        }))
        .filter((a) => a.type && a.label)
        .slice(0, 6);
    }
    if (Array.isArray(item.suggestions)) out.suggestions = item.suggestions.map((v) => String(v)).slice(0, 6);
    return out;
  };

  const scrollToSelector = (selector, focusSelector) => {
    const target = document.querySelector(selector);
    if (!target) return false;
    target.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
    if (typeof focusSelector === "string" && focusSelector) {
      const focusEl = target.querySelector(focusSelector) || document.querySelector(focusSelector);
      if (focusEl instanceof HTMLElement) {
        window.setTimeout(() => focusEl.focus({ preventScroll: true }), REDUCED_MOTION ? 0 : 240);
      }
    }
    return true;
  };

  const runSiteSearch = (term) => {
    const input = document.getElementById("site-search");
    const submit = document.querySelector(".search-submit");
    if (!(input instanceof HTMLInputElement)) return false;
    input.value = term;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (submit instanceof HTMLElement) submit.click();
    const featuredSection = document.querySelector(SECTION_TARGETS.featured);
    if (featuredSection) {
      featuredSection.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
    }
    return true;
  };

  const buildFallbackReply = (message) => ({
    title: "Ask Me About This Portfolio",
    text: `I can help with projects, skills, certifications, education, experience, resume, contact, the admin page, and the cyber IOC demo.`,
    bullets: [
      `You asked: ${String(message || "").trim().slice(0, 140) || "(empty)"}`,
      "Try a direct request like: show projects, show skills, open resume, or contact details.",
    ],
    actions: [
      { type: "prompt", prompt: "Show me your best cybersecurity projects", label: "Show Projects" },
      { type: "prompt", prompt: "What skills do you use for security and ML?", label: "Show Skills" },
      { type: "prompt", prompt: "How can I contact you?", label: "Contact" },
    ],
    suggestions: DEFAULT_PROMPTS.slice(0, 5),
  });
  const upgradeChatbot = () => {
    const currentRoot = document.getElementById("chatbot");
    if (!(currentRoot instanceof HTMLElement)) return;
    if (currentRoot.dataset.chatbotUpgradeReady === VERSION) return;

    const clonedRoot = currentRoot.cloneNode(true);
    currentRoot.replaceWith(clonedRoot);

    const root = document.getElementById("chatbot");
    const toggle = document.getElementById("chatbotToggle");
    const panel = document.getElementById("chatbotPanel");
    const closeBtn = document.getElementById("chatbotClose");
    const body = document.getElementById("chatbotBody");
    const form = document.getElementById("chatbotForm");
    const legacyInput = document.getElementById("chatbotInput");
    if (!(root instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !(panel instanceof HTMLElement) || !(closeBtn instanceof HTMLButtonElement) || !(body instanceof HTMLElement) || !(form instanceof HTMLFormElement) || !(legacyInput instanceof HTMLElement)) {
      return;
    }

    root.dataset.chatbotUpgradeReady = VERSION;
    root.classList.add("chatbot-upgraded");
    panel.classList.add("chatbot-panel--upgraded");
    body.textContent = "";
    closeBtn.innerHTML = "&times;";

    const titleEl = panel.querySelector(".chatbot-head h3");
    const head = panel.querySelector(".chatbot-head");
    const sendBtn = form.querySelector('button[type="submit"]') || form.querySelector("button");
    if (!(head instanceof HTMLElement) || !(titleEl instanceof HTMLElement) || !(sendBtn instanceof HTMLButtonElement)) return;

    const titleWrap = document.createElement("div");
    titleWrap.className = "chatbot-title-wrap";
    const kicker = document.createElement("div");
    kicker.className = "chatbot-kicker";
    kicker.textContent = "Local Portfolio AI";
    const subline = document.createElement("div");
    subline.className = "chatbot-subline";
    subline.textContent = "Context-aware guide for projects, resume, contact, and demos";
    titleEl.textContent = BOT_LABEL;
    titleWrap.append(kicker, titleEl, subline);

    const tools = document.createElement("div");
    tools.className = "chatbot-tools";
    tools.innerHTML = [
      '<button type="button" class="chatbot-tool" data-tool="new" aria-label="Start new chat">New</button>',
      '<button type="button" class="chatbot-tool" data-tool="copy" aria-label="Copy transcript">Copy</button>',
      '<button type="button" class="chatbot-tool" data-tool="help" aria-label="Show commands">Help</button>',
    ].join("");

    const statusRow = document.createElement("div");
    statusRow.className = "chatbot-status-row";
    statusRow.innerHTML = '<span class="chatbot-status-pill" id="chatbotStatusPill" data-state="ready">Ready</span><span class="chatbot-status-text" id="chatbotStatusText">Ask about projects, skills, resume, contact, admin, or cyber demo.</span>';

    head.innerHTML = "";
    head.append(titleWrap, tools, closeBtn);
    head.append(statusRow);

    const suggestions = document.createElement("div");
    suggestions.className = "chatbot-suggestions";
    suggestions.id = "chatbotSuggestions";

    const bodyEmpty = document.createElement("div");
    bodyEmpty.className = "chatbot-empty";
    bodyEmpty.innerHTML = '<strong>Start fast</strong><p>Use the quick prompts below, or ask naturally. Example: “Show your best cybersecurity projects”</p>';
    body.append(bodyEmpty);

    const liveRegion = document.createElement("div");
    liveRegion.className = "chatbot-live";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.hidden = true;
    panel.append(liveRegion);

    const textarea = document.createElement("textarea");
    textarea.id = "chatbotInput";
    textarea.className = "chatbot-input";
    textarea.rows = 1;
    textarea.placeholder = "Ask about skills, projects, resume, contact, admin, cyber demo...";
    textarea.autocomplete = "off";
    textarea.setAttribute("enterkeyhint", "send");
    legacyInput.replaceWith(textarea);

    const composerMeta = document.createElement("div");
    composerMeta.className = "chatbot-composer-meta";
    composerMeta.innerHTML = '<span>Enter to send</span><span>Shift+Enter new line</span><span>/help commands</span>';
    form.prepend(composerMeta);
    form.before(suggestions);

    sendBtn.classList.add("chatbot-send");
    sendBtn.type = "submit";
    sendBtn.textContent = "Send";

    const els = {
      root,
      toggle,
      panel,
      closeBtn,
      body,
      form,
      input: textarea,
      sendBtn,
      tools,
      suggestions,
      bodyEmpty,
      liveRegion,
      statusPill: panel.querySelector("#chatbotStatusPill"),
      statusText: panel.querySelector("#chatbotStatusText"),
    };

    const state = {
      history: [],
      suggestions: [...DEFAULT_PROMPTS],
      isOpen: false,
      firstOpenDone: false,
      typingNode: null,
      busy: false,
      lastBotReply: null,
    };

    const loadHistory = () => {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(sanitizeHistoryItem).filter(Boolean).slice(-MAX_HISTORY);
      } catch {
        return [];
      }
    };

    const loadPersistedState = () => {
      try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
      } catch {
        return {};
      }
    };

    const persistHistory = () => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-MAX_HISTORY)));
      } catch {}
    };

    const persistState = () => {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify({
          suggestions: state.suggestions.slice(0, 6),
          isOpen: state.isOpen,
          version: VERSION,
        }));
      } catch {}
    };

    const setStatus = (label, text, stateName = "ready") => {
      if (els.statusPill instanceof HTMLElement) {
        els.statusPill.textContent = label;
        els.statusPill.setAttribute("data-state", stateName);
      }
      if (els.statusText instanceof HTMLElement) {
        els.statusText.textContent = text;
      }
      if (els.liveRegion instanceof HTMLElement) {
        els.liveRegion.hidden = false;
        els.liveRegion.textContent = `${label}. ${text}`;
      }
    };

    const autoSizeInput = () => {
      const maxHeight = 132;
      els.input.style.height = "auto";
      els.input.style.height = `${clamp(els.input.scrollHeight, 42, maxHeight)}px`;
    };

    const scrollBodyToEnd = () => {
      els.body.scrollTop = els.body.scrollHeight;
    };

    const updateEmptyState = () => {
      const hasMessages = els.body.querySelectorAll(".chatbot-row").length > 0;
      els.bodyEmpty.hidden = hasMessages;
    };

    const renderSuggestions = (values) => {
      const prompts = (Array.isArray(values) ? values : DEFAULT_PROMPTS)
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .slice(0, 6);
      state.suggestions = prompts.length ? prompts : [...DEFAULT_PROMPTS.slice(0, 4)];
      els.suggestions.innerHTML = state.suggestions
        .map((prompt) => `<button type="button" class="chatbot-suggestion" data-prompt="${prompt.replace(/"/g, "&quot;")}">${prompt}</button>`)
        .join("");
      persistState();
    };

    const createActionButton = (action) => {
      const btn = document.createElement(action.type === "open" || action.type === "mailto" ? "a" : "button");
      btn.className = "chatbot-action";
      btn.textContent = action.label || "Action";
      if (btn instanceof HTMLAnchorElement) {
        btn.href = action.href || "#";
        if (action.newTab !== false) {
          btn.target = "_blank";
          btn.rel = "noopener noreferrer";
        }
      } else {
        btn.type = "button";
      }
      btn.dataset.action = JSON.stringify(action);
      return btn;
    };

    const appendMessage = (message, { persist = true } = {}) => {
      const item = sanitizeHistoryItem({ ...message, ts: message?.ts || Date.now() });
      if (!item) return null;
      const row = document.createElement("div");
      row.className = `chatbot-row ${item.role}`;

      const avatar = document.createElement("div");
      avatar.className = "chatbot-avatar";
      avatar.textContent = item.role === "user" ? "You" : "AI";

      const bubble = document.createElement("div");
      bubble.className = `chatbot-msg chatbot-msg--rich chatbot-msg--${item.role}`;

      if (item.title && item.role === "bot") {
        const title = document.createElement("div");
        title.className = "chatbot-msg-title";
        title.textContent = item.title;
        bubble.append(title);
      }

      if (item.text) {
        const text = document.createElement("div");
        text.className = "chatbot-msg-text";
        String(item.text).split(/\n+/).filter(Boolean).forEach((line) => {
          const p = document.createElement("p");
          p.textContent = line;
          text.append(p);
        });
        bubble.append(text);
      }

      if (Array.isArray(item.bullets) && item.bullets.length) {
        const list = document.createElement("ul");
        list.className = "chatbot-msg-list";
        item.bullets.forEach((bullet) => {
          const li = document.createElement("li");
          li.textContent = bullet;
          list.append(li);
        });
        bubble.append(list);
      }

      if (Array.isArray(item.actions) && item.actions.length) {
        const actions = document.createElement("div");
        actions.className = "chatbot-actions";
        item.actions.forEach((action) => actions.append(createActionButton(action)));
        bubble.append(actions);
      }

      const meta = document.createElement("div");
      meta.className = "chatbot-msg-meta";
      meta.textContent = formatTime(item.ts);
      bubble.append(meta);

      if (item.role === "user") row.append(bubble, avatar);
      else row.append(avatar, bubble);

      els.body.append(row);
      updateEmptyState();
      scrollBodyToEnd();

      if (item.role === "bot") {
        state.lastBotReply = item;
        if (Array.isArray(item.suggestions) && item.suggestions.length) {
          renderSuggestions(item.suggestions);
        }
      }

      if (persist) {
        state.history.push(item);
        if (state.history.length > MAX_HISTORY) {
          state.history = state.history.slice(-MAX_HISTORY);
        }
        persistHistory();
      }

      return row;
    };

    const removeTypingIndicator = () => {
      if (state.typingNode instanceof HTMLElement) {
        state.typingNode.remove();
      }
      state.typingNode = null;
      updateEmptyState();
    };

    const showTypingIndicator = () => {
      removeTypingIndicator();
      const row = document.createElement("div");
      row.className = "chatbot-row bot chatbot-row--typing";

      const avatar = document.createElement("div");
      avatar.className = "chatbot-avatar";
      avatar.textContent = "AI";

      const bubble = document.createElement("div");
      bubble.className = "chatbot-msg chatbot-msg--rich chatbot-msg--bot chatbot-msg--typing";
      bubble.innerHTML = '<div class="chatbot-typing" aria-hidden="true"><span class="chatbot-typing-dot"></span><span class="chatbot-typing-dot"></span><span class="chatbot-typing-dot"></span></div><div class="chatbot-msg-meta">typing...</div>';

      row.append(avatar, bubble);
      els.body.append(row);
      state.typingNode = row;
      updateEmptyState();
      scrollBodyToEnd();
      return row;
    };

    const syncSendButton = () => {
      els.sendBtn.disabled = state.busy || !els.input.value.trim();
      els.sendBtn.setAttribute("aria-disabled", String(els.sendBtn.disabled));
    };

    const buildGreetingMessage = () => ({
      role: "bot",
      title: "Portfolio Assistant Ready",
      text: "I can guide recruiters and visitors through projects, skills, experience, resume, contact details, and the Python-backed demos.",
      bullets: [
        "Try natural language or quick prompts below.",
        "Use /help to see shortcuts and commands.",
        "I can open sections, run site search, and launch resume/demo pages.",
      ],
      actions: [
        { type: "scroll", target: "#featured", label: "Open Featured Work" },
        { type: "open", href: RESUME_URL, label: "Open Resume PDF", newTab: true },
        { type: "scroll", target: "#contact", label: "Open Contact" },
      ],
      suggestions: DEFAULT_PROMPTS,
    });

    const clearTranscriptUi = () => {
      removeTypingIndicator();
      els.body.querySelectorAll(".chatbot-row").forEach((node) => node.remove());
      updateEmptyState();
      scrollBodyToEnd();
    };

    const resetConversation = ({ announce = true } = {}) => {
      state.history = [];
      persistHistory();
      clearTranscriptUi();
      renderSuggestions(DEFAULT_PROMPTS);
      appendMessage(buildGreetingMessage(), { persist: true });
      if (announce) {
        setStatus("New Chat", "Conversation reset. Ask a fresh question or use a quick prompt.", "action");
      }
    };

    const buildTranscriptText = () => {
      const lines = [];
      state.history.forEach((item) => {
        const roleLabel = item.role === "user" ? "You" : BOT_LABEL;
        const time = formatTime(item.ts);
        const heading = item.title ? `${roleLabel} (${time}) - ${item.title}` : `${roleLabel} (${time})`;
        lines.push(heading);
        if (item.text) lines.push(item.text);
        if (Array.isArray(item.bullets)) {
          item.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
        }
        lines.push("");
      });
      return lines.join("\n").trim();
    };

    const updateStatusAfterAction = (label, text, ok = true) => {
      setStatus(label, text, ok ? "action" : "error");
    };

    const executeAction = async (action) => {
      if (!action || typeof action !== "object") {
        return { ok: false, message: "Invalid action payload." };
      }

      if (action.type === "scroll") {
        const target = action.target || SECTION_TARGETS.contact;
        const ok = scrollToSelector(target);
        updateStatusAfterAction(ok ? "Navigated" : "Missing", ok ? `Moved to ${target}` : `Could not find ${target}`, ok);
        return { ok, message: ok ? `Opened ${target}.` : `Could not find ${target}.` };
      }

      if (action.type === "search") {
        const term = String(action.term || "").trim();
        const ok = term ? runSiteSearch(term) : false;
        updateStatusAfterAction(ok ? "Search" : "Search Failed", ok ? `Ran site search for "${term}".` : "Site search is not available right now.", ok);
        return { ok, message: ok ? `Ran site search for "${term}".` : "Site search is not available right now." };
      }

      if (action.type === "open") {
        const href = String(action.href || "").trim();
        if (!href) {
          updateStatusAfterAction("Open Failed", "Missing link target.", false);
          return { ok: false, message: "Missing link target." };
        }
        try {
          if (action.newTab === false) {
            window.location.assign(href);
          } else {
            window.open(href, "_blank", "noopener,noreferrer");
          }
          updateStatusAfterAction("Opened", href, true);
          return { ok: true, message: `Opened ${href}.` };
        } catch {
          updateStatusAfterAction("Open Failed", href, false);
          return { ok: false, message: `Could not open ${href}.` };
        }
      }

      if (action.type === "mailto") {
        const href = String(action.href || `mailto:${EMAIL}`);
        try {
          window.location.href = href;
          updateStatusAfterAction("Email", "Opened mail composer.", true);
          return { ok: true, message: "Opened mail composer." };
        } catch {
          updateStatusAfterAction("Email Failed", "Could not open mail composer.", false);
          return { ok: false, message: "Could not open mail composer." };
        }
      }

      if (action.type === "copy_email") {
        const ok = await copyText(EMAIL);
        updateStatusAfterAction(ok ? "Copied" : "Copy Failed", ok ? "Email copied to clipboard." : "Clipboard copy failed.", ok);
        return { ok, message: ok ? `Copied email: ${EMAIL}` : "Clipboard copy failed." };
      }

      if (action.type === "copy_transcript") {
        const transcript = buildTranscriptText();
        if (!transcript) {
          updateStatusAfterAction("Copy Failed", "No chat messages to copy yet.", false);
          return { ok: false, message: "No chat messages to copy yet." };
        }
        const ok = await copyText(transcript);
        updateStatusAfterAction(ok ? "Copied" : "Copy Failed", ok ? "Chat transcript copied." : "Clipboard copy failed.", ok);
        return { ok, message: ok ? "Chat transcript copied." : "Clipboard copy failed." };
      }

      if (action.type === "clear_chat") {
        resetConversation({ announce: true });
        return { ok: true, message: "Started a new chat." };
      }

      if (action.type === "prompt") {
        const prompt = String(action.prompt || action.value || "").trim();
        if (!prompt) {
          updateStatusAfterAction("Prompt", "Nothing to insert.", false);
          return { ok: false, message: "Nothing to insert." };
        }
        els.input.value = prompt;
        autoSizeInput();
        syncSendButton();
        if (state.isOpen) els.input.focus();
        updateStatusAfterAction("Prompt Ready", "Inserted prompt into the composer.", true);
        return { ok: true, message: `Inserted prompt: ${prompt}` };
      }

      if (action.type === "copy") {
        const value = String(action.value || "");
        const ok = await copyText(value);
        updateStatusAfterAction(ok ? "Copied" : "Copy Failed", ok ? "Value copied to clipboard." : "Clipboard copy failed.", ok);
        return { ok, message: ok ? "Copied to clipboard." : "Clipboard copy failed." };
      }

      updateStatusAfterAction("Unsupported", `Action type not supported: ${action.type}`, false);
      return { ok: false, message: `Unsupported action: ${action.type}` };
    };

    const resolveReply = (message) => {
      const command = parseCommand(message);
      if (command) {
        const reply = buildCommandReply(command) || buildFallbackReply(message);
        return { source: `command:${command.cmd}`, reply };
      }

      const intent = matchIntent(message);
      if (intent?.reply) {
        return { source: `intent:${intent.id || "matched"}`, reply: intent.reply };
      }

      return { source: "fallback", reply: buildFallbackReply(message) };
    };

    const postBotReply = (reply) => {
      const payload = sanitizeHistoryItem({ role: "bot", ...reply, ts: Date.now() }) || sanitizeHistoryItem({ role: "bot", text: "I could not build a response.", ts: Date.now() });
      if (!payload) return null;
      return appendMessage(payload, { persist: true });
    };

    const handleCommandActionReply = async (action) => {
      const result = await executeAction(action);
      if (action?.type === "clear_chat") {
        return;
      }
      postBotReply({
        title: result.ok ? "Action Completed" : "Action Failed",
        text: result.message,
        suggestions: state.suggestions?.length ? state.suggestions : DEFAULT_PROMPTS,
      });
    };

    const ask = async (rawValue, { fromSuggestion = false } = {}) => {
      const text = String(rawValue || "").trim();
      if (!text || state.busy) return;

      appendMessage({ role: "user", text, ts: Date.now() }, { persist: true });
      els.input.value = fromSuggestion ? "" : "";
      autoSizeInput();
      syncSendButton();

      const { reply, source } = resolveReply(text);
      state.busy = true;
      syncSendButton();
      setStatus("Thinking", `Processing ${source.replace(/^intent:/, "") || "request"}...`, "thinking");
      showTypingIndicator();

      await delay(randomDelay());
      removeTypingIndicator();

      try {
        if (reply && typeof reply === "object" && reply.commandAction) {
          await handleCommandActionReply(reply.commandAction);
        } else {
          postBotReply(reply || buildFallbackReply(text));
          setStatus("Ready", "Response generated. Use an action or ask a follow-up.", "ready");
        }
      } finally {
        state.busy = false;
        syncSendButton();
      }
    };

    const openChatbot = ({ focus = true } = {}) => {
      panel.hidden = false;
      root.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      state.isOpen = true;
      if (!state.firstOpenDone) {
        state.firstOpenDone = true;
        setStatus("Ready", "Ask about projects, skills, experience, resume, contact, admin, or cyber demo.", "ready");
      }
      persistState();
      if (focus) {
        window.setTimeout(() => {
          els.input.focus({ preventScroll: true });
          autoSizeInput();
          syncSendButton();
        }, REDUCED_MOTION ? 0 : 90);
      }
    };

    const closeChatbot = () => {
      panel.hidden = true;
      root.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      state.isOpen = false;
      persistState();
    };

    const toggleChatbot = () => {
      if (panel.hidden) openChatbot();
      else closeChatbot();
    };

    const hydrate = () => {
      const persisted = loadPersistedState();
      renderSuggestions(Array.isArray(persisted.suggestions) ? persisted.suggestions : DEFAULT_PROMPTS);

      const history = loadHistory();
      if (history.length) {
        state.history = history.slice(-MAX_HISTORY);
        history.forEach((item) => appendMessage(item, { persist: false }));
        setStatus("Restored", `Loaded ${state.history.length} recent messages.`, "ready");
      } else {
        appendMessage(buildGreetingMessage(), { persist: true });
        setStatus("Ready", "Try a prompt or ask a direct question about this portfolio.", "ready");
      }

      if (Boolean(persisted.isOpen)) {
        openChatbot({ focus: false });
      } else {
        closeChatbot();
      }

      autoSizeInput();
      syncSendButton();
      updateEmptyState();
    };

    tools.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest(".chatbot-tool");
      if (!(button instanceof HTMLButtonElement)) return;
      const tool = button.dataset.tool;
      if (!tool) return;
      if (tool === "new") {
        void handleCommandActionReply({ type: "clear_chat" });
        return;
      }
      if (tool === "copy") {
        void handleCommandActionReply({ type: "copy_transcript" });
        return;
      }
      if (tool === "help") {
        void ask("/help");
      }
    });

    panel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const suggestion = target.closest(".chatbot-suggestion");
      if (suggestion instanceof HTMLButtonElement) {
        const prompt = suggestion.dataset.prompt || suggestion.textContent || "";
        if (prompt) {
          void ask(prompt, { fromSuggestion: true });
        }
        return;
      }

      const actionBtn = target.closest(".chatbot-action");
      if (!actionBtn) return;
      event.preventDefault();
      const payload = actionBtn.getAttribute("data-action");
      if (!payload) return;
      try {
        const action = JSON.parse(payload);
        void executeAction(action);
      } catch {
        setStatus("Action Failed", "Could not parse action payload.", "error");
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void ask(els.input.value);
    });

    els.input.addEventListener("input", () => {
      autoSizeInput();
      syncSendButton();
    });

    els.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!state.busy && els.input.value.trim()) {
          if (typeof form.requestSubmit === "function") form.requestSubmit();
          else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
        return;
      }
      if (event.key === "Escape" && state.isOpen) {
        event.preventDefault();
        closeChatbot();
        toggle.focus();
      }
    });

    toggle.addEventListener("click", () => {
      toggleChatbot();
    });

    closeBtn.addEventListener("click", () => {
      closeChatbot();
      toggle.focus();
    });

    document.addEventListener("click", (event) => {
      if (!state.isOpen) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target)) return;
      closeChatbot();
    });

    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (event.key === "Escape" && state.isOpen && !isEditable(target)) {
        closeChatbot();
        toggle.focus();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key === "/") {
        event.preventDefault();
        openChatbot();
        els.input.focus();
      }
    });

    hydrate();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", upgradeChatbot, { once: true });
  } else {
    upgradeChatbot();
  }
})();

