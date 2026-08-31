(function () {
  "use strict";

  const navItems = [
    ["home", "Home", "index.html"],
    ["tutorials", "Tutorials", "tutorials/index.html"],
    ["downloads", "Downloads", "downloads.html"],
    ["research", "Research", "publications.html"],
    ["support", "Support", "contact.html"]
  ];

  function pathFrom(root, path) {
    return `${root.replace(/\/$/, "")}/${path}`;
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
              <a class="nav-github" href="https://github.com/HartlerLab/LipidProphet" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
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
                  <li><a href="${pathFrom(root, "downloads.html")}">Downloads &amp; manual</a></li>
                </ul>
              </div>
              <div>
                <h2>Project</h2>
                <ul class="footer-links">
                  <li><a href="${pathFrom(root, "publications.html")}">Research</a></li>
                  <li><a href="${pathFrom(root, "contact.html")}">Support</a></li>
                  <li><a href="https://github.com/HartlerLab/LipidProphet" target="_blank" rel="noopener noreferrer">Source code ↗</a></li>
                  <li><a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">Apache 2.0 license ↗</a></li>
                </ul>
              </div>
            </div>
            <div class="footer-bottom">
              <span>© <span data-current-year></span> LipidProphet contributors.</span>
              <span>Built for reproducible lipidomics.</span>
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
