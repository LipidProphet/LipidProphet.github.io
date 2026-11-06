(function () {
  "use strict";

  const navItems = [
    ["home", "Home", "index.html"],
    ["tutorials", "Tutorials", "tutorials/index.html"],
    ["downloads", "Downloads", "downloads.html"],
    ["research", "Research", "publications.html"],
    ["support", "Support", "contact.html"]
  ];

  const searchablePages = [
    "index.html",
    "tutorials/index.html",
    "tutorials/quick-start.html",
    "tutorials/prepare-inputs.html",
    "tutorials/lda2-workflow.html",
    "tutorials/msdial-workflow.html",
    "tutorials/shotgun-msall.html",
    "tutorials/settings.html",
    "tutorials/results.html",
    "tutorials/cli.html",
    "tutorials/troubleshooting.html",
    "downloads.html",
    "publications.html",
    "contact.html"
  ];

  function pathFrom(root, path) {
    return `${root.replace(/\/$/, "")}/${path}`;
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeSearchText(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¹₁]/g, "1")
      .replace(/[²₂]/g, "2")
      .replace(/[³₃]/g, "3")
      .toLowerCase();
  }

  function searchTerms(query) {
    return normalizeSearchText(query).split(/\s+/).filter(Boolean);
  }

  function makeExcerpt(text, query, terms, maxLength = 165) {
    const source = cleanText(text);
    if (source.length <= maxLength) return source;

    const normalized = normalizeSearchText(source);
    const normalizedQuery = normalizeSearchText(query);
    const positions = [normalized.indexOf(normalizedQuery)]
      .concat(terms.map(term => normalized.indexOf(term)))
      .filter(position => position >= 0);
    const firstMatch = positions.length ? Math.min(...positions) : 0;
    let start = Math.max(0, firstMatch - Math.floor(maxLength * .35));
    let end = Math.min(source.length, start + maxLength);

    if (start > 0) {
      const nextSpace = source.indexOf(" ", start);
      start = nextSpace >= 0 && nextSpace < end ? nextSpace + 1 : start;
    }
    if (end < source.length) {
      const previousSpace = source.lastIndexOf(" ", end);
      end = previousSpace > start ? previousSpace : end;
    }

    return `${start > 0 ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""}`;
  }

  function appendHighlightedText(element, text, terms) {
    if (!terms.length) {
      element.textContent = text;
      return;
    }

    const escapedTerms = terms
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    text.split(pattern).filter(Boolean).forEach(part => {
      if (terms.includes(normalizeSearchText(part))) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        element.appendChild(mark);
      } else {
        element.appendChild(document.createTextNode(part));
      }
    });
  }

  async function buildSearchIndex(root) {
    const pages = await Promise.allSettled(searchablePages.map(async path => {
      const response = await fetch(pathFrom(root, path));
      if (!response.ok) throw new Error(`Could not load ${path}`);

      const html = await response.text();
      const page = new DOMParser().parseFromString(html, "text/html");
      const main = page.querySelector("main");
      if (!main) return [];

      const pageTitle = cleanText(main.querySelector("h1")?.textContent || page.title.replace(/\s*\|\s*LipidProphet.*$/, ""));
      const description = cleanText(page.querySelector('meta[name="description"]')?.content);
      const records = [];
      const indexedSections = Array.from(main.querySelectorAll("section[id], article[id]"));
      const overview = main.cloneNode(true);
      overview.querySelectorAll("section[id], article[id], nav, aside.toc").forEach(element => element.remove());
      const overviewText = cleanText(`${description} ${overview.textContent}`);

      records.push({
        title: pageTitle,
        pageTitle,
        body: overviewText || cleanText(main.textContent),
        url: pathFrom(root, path),
        kind: "Page"
      });

      indexedSections.forEach(section => {
        const heading = section.querySelector("h2, h3");
        const title = cleanText(heading?.textContent);
        if (!title) return;
        records.push({
          title,
          pageTitle,
          body: cleanText(section.textContent),
          url: `${pathFrom(root, path)}#${encodeURIComponent(section.id)}`,
          kind: "Section"
        });
      });

      return records;
    }));

    return pages.flatMap(result => result.status === "fulfilled" ? result.value : []);
  }

  function rankSearchResults(records, query) {
    const normalizedQuery = normalizeSearchText(query);
    const terms = searchTerms(query);
    if (normalizedQuery.length < 2 || !terms.length) return [];

    return records.map(record => {
      const normalizedTitle = normalizeSearchText(record.title);
      const normalizedPageTitle = normalizeSearchText(record.pageTitle);
      const normalizedBody = normalizeSearchText(record.body);
      const haystack = `${normalizedTitle} ${normalizedPageTitle} ${normalizedBody}`;
      if (!terms.every(term => haystack.includes(term))) return null;

      let score = 0;
      if (normalizedTitle === normalizedQuery) score += 180;
      else if (normalizedTitle.startsWith(normalizedQuery)) score += 120;
      else if (normalizedTitle.includes(normalizedQuery)) score += 90;
      if (normalizedPageTitle.includes(normalizedQuery)) score += 55;
      terms.forEach(term => {
        if (normalizedTitle.includes(term)) score += 28;
        if (normalizedPageTitle.includes(term)) score += 15;
        score += Math.min(normalizedBody.split(term).length - 1, 5) * 4;
      });
      if (record.kind === "Section") score += 8;

      return {
        ...record,
        score,
        excerpt: makeExcerpt(record.body, query, terms)
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      const root = this.getAttribute("root") || ".";
      const active = this.getAttribute("active") || "";
      const links = navItems.map(([key, label, path]) => {
        const current = key === active ? ' aria-current="page"' : "";
        return `<a href="${pathFrom(root, path)}"${current}>${label}</a>`;
      }).join("");

      this.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to content</a>
        <header class="site-header">
          <div class="container nav-shell">
            <a class="brand-link" href="${pathFrom(root, "index.html")}" aria-label="LipidProphet home">
              <img class="brand-mark" src="${pathFrom(root, "img/LP_logo.svg")}" alt="">
              <span>LipidProphet</span>
            </a>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">
              <span class="menu-icon" aria-hidden="true"></span>
              <span class="sr-only">Open menu</span>
            </button>
            <nav class="site-nav" id="site-navigation" aria-label="Primary navigation">
              ${links}
              <form class="site-search" role="search">
                <label class="sr-only" for="site-search-input">Search LipidProphet documentation</label>
                <div class="search-field">
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path></svg>
                  <input class="site-search-input" id="site-search-input" type="search" placeholder="Search" autocomplete="off" spellcheck="false" aria-controls="site-search-results" aria-expanded="false">
                </div>
                <div class="search-results" id="site-search-results" aria-label="Search results" hidden></div>
              </form>
            </nav>
          </div>
        </header>`;

      const toggle = this.querySelector(".menu-toggle");
      const nav = this.querySelector(".site-nav");
      const label = toggle.querySelector(".sr-only");
      const closeMenu = () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        label.textContent = "Open menu";
      };
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("is-open", !open);
        label.textContent = open ? "Open menu" : "Close menu";
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a")) closeMenu();
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
      });
      window.matchMedia("(min-width: 62.01rem)").addEventListener("change", closeMenu);

      const search = this.querySelector(".site-search");
      const input = search.querySelector(".site-search-input");
      const resultsPanel = search.querySelector(".search-results");
      let searchIndexPromise;

      const showPanel = () => {
        resultsPanel.hidden = false;
        input.setAttribute("aria-expanded", "true");
      };
      const hidePanel = () => {
        resultsPanel.hidden = true;
        input.setAttribute("aria-expanded", "false");
      };
      const showMessage = message => {
        resultsPanel.replaceChildren();
        const status = document.createElement("p");
        status.className = "search-message";
        status.setAttribute("role", "status");
        status.textContent = message;
        resultsPanel.appendChild(status);
        showPanel();
      };
      const renderResults = (matches, query) => {
        resultsPanel.replaceChildren();
        if (!matches.length) {
          showMessage(`No results for “${cleanText(query)}”`);
          return;
        }

        const terms = searchTerms(query);
        const summary = document.createElement("p");
        summary.className = "search-summary";
        summary.setAttribute("role", "status");
        summary.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"}`;
        resultsPanel.appendChild(summary);

        matches.forEach(match => {
          const link = document.createElement("a");
          link.className = "search-result";
          link.href = match.url;

          const location = document.createElement("span");
          location.className = "search-result-location";
          location.textContent = match.kind === "Section" ? match.pageTitle : "LipidProphet documentation";

          const title = document.createElement("span");
          title.className = "search-result-title";
          appendHighlightedText(title, match.title, terms);

          const excerpt = document.createElement("span");
          excerpt.className = "search-result-excerpt";
          appendHighlightedText(excerpt, match.excerpt, terms);

          link.append(location, title, excerpt);
          resultsPanel.appendChild(link);
        });
        showPanel();
      };
      const runSearch = async () => {
        const query = input.value;
        if (normalizeSearchText(query).length < 2) {
          if (query.length) showMessage("Type at least 2 characters");
          else hidePanel();
          return;
        }

        if (!searchIndexPromise) {
          showMessage("Searching documentation…");
          searchIndexPromise = buildSearchIndex(root);
        }

        try {
          const records = await searchIndexPromise;
          if (input.value !== query) return;
          if (!records.length) {
            showMessage("Search is temporarily unavailable");
            return;
          }
          renderResults(rankSearchResults(records, query), query);
        } catch (_) {
          if (input.value === query) showMessage("Search is temporarily unavailable");
        }
      };

      search.addEventListener("submit", event => {
        event.preventDefault();
        const firstResult = resultsPanel.querySelector(".search-result");
        if (firstResult) window.location.assign(firstResult.href);
      });
      input.addEventListener("input", runSearch);
      input.addEventListener("focus", () => {
        if (input.value) runSearch();
      });
      input.addEventListener("keydown", event => {
        if (event.key === "ArrowDown") {
          const firstResult = resultsPanel.querySelector(".search-result");
          if (firstResult) {
            event.preventDefault();
            firstResult.focus();
          }
        }
        if (event.key === "Escape") {
          hidePanel();
          input.blur();
        }
      });
      resultsPanel.addEventListener("keydown", event => {
        if (!event.target.matches(".search-result") || !["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
        event.preventDefault();
        const resultLinks = Array.from(resultsPanel.querySelectorAll(".search-result"));
        const currentIndex = resultLinks.indexOf(event.target);
        if (event.key === "Escape") {
          hidePanel();
          input.focus();
        } else if (event.key === "ArrowDown") {
          (resultLinks[currentIndex + 1] || resultLinks[0]).focus();
        } else {
          (resultLinks[currentIndex - 1] || input).focus();
        }
      });
      resultsPanel.addEventListener("click", event => {
        if (event.target.closest(".search-result")) hidePanel();
      });
      document.addEventListener("click", event => {
        if (!search.contains(event.target)) hidePanel();
      });
      document.addEventListener("keydown", event => {
        if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input, textarea, select, [contenteditable]")) {
          event.preventDefault();
          if (window.matchMedia("(max-width: 62rem)").matches && toggle.getAttribute("aria-expanded") !== "true") toggle.click();
          input.focus();
        }
      });
    }
  }

  class SiteFooter extends HTMLElement {
    connectedCallback() {
      const root = this.getAttribute("root") || ".";
      this.innerHTML = `
        <footer class="site-footer">
          <div class="container">
            <div class="footer-grid">
              <div>
                <div class="footer-brand">
                  <img src="${pathFrom(root, "img/LP_logo.svg")}" alt="">
                  <span>LipidProphet</span>
                </div>
                <p>A standalone confidence-scoring application for FDR-controlled lipid identification from MS² data.</p>
              </div>
              <div>
                <h2>Learn</h2>
                <ul class="footer-links">
                  <li><a href="${pathFrom(root, "tutorials/quick-start.html")}">Quick start</a></li>
                  <li><a href="${pathFrom(root, "tutorials/index.html")}">All tutorials</a></li>
                  <li><a href="${pathFrom(root, "downloads.html")}">Downloads &amp; study data</a></li>
                </ul>
              </div>
              <div>
                <h2>Project</h2>
                <ul class="footer-links">
                  <li><a href="${pathFrom(root, "publications.html")}">Research</a></li>
                  <li><a href="${pathFrom(root, "contact.html")}">Support</a></li>
                  <li><a href="${pathFrom(root, "publications.html#software")}">Source code</a></li>
                  <li><a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">Apache 2.0 license ↗</a></li>
                </ul>
              </div>
            </div>
            <div class="footer-bottom">
              <span>© <span data-current-year></span> LipidProphet contributors.</span>
            </div>
          </div>
        </footer>`;
      this.querySelector("[data-current-year]").textContent = new Date().getFullYear();
    }
  }

  customElements.define("site-header", SiteHeader);
  customElements.define("site-footer", SiteFooter);

  document.querySelectorAll("pre[data-copy]").forEach(pre => {
    const wrapper = document.createElement("div");
    wrapper.className = "copy-wrap";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = "Copied";
      } catch (_) {
        button.textContent = "Select text";
      }
      window.setTimeout(() => { button.textContent = "Copy"; }, 1800);
    });
    wrapper.appendChild(button);
  });

  const tocLinks = Array.from(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    const sections = tocLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach(link => link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-22% 0px -65% 0px" });
    sections.forEach(section => observer.observe(section));
  }
})();
