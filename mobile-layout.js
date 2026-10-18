(() => {
  "use strict";
  if (window.__cwhMobileInitialized) return;
  window.__cwhMobileInitialized = true;
  const narrow = window.matchMedia("(max-width: 767px)");
  const originalLayouts = new WeakMap();
  const lastApplied = new WeakMap();
  let dialog = null;

  function enhanceTables() {
    document.querySelectorAll("#quarto-document-content table").forEach(table => {
      if (table.closest(".responsive-table-scroll")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "responsive-table-scroll";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Tabel cu derulare orizontală");
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function zoomDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "mobile-chart-dialog";
    dialog.setAttribute("aria-label", "Grafic mărit");
    dialog.innerHTML =
      '<div class="mobile-chart-dialog__toolbar">' +
      '<strong>Grafic mărit · deplasează imaginea pentru detalii</strong>' +
      '<button type="button" aria-label="Închide graficul">Închide ✕</button></div>' +
      '<div class="mobile-chart-dialog__viewport"><img alt="Grafic statistic mărit"></div>';
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function enhanceStaticFigures() {
    document.querySelectorAll("#quarto-document-content .cell-output-display img").forEach(img => {
      if (img.dataset.mobileZoomReady || img.closest(".js-plotly-plot")) return;
      img.dataset.mobileZoomReady = "1";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mobile-chart-expand";
      button.textContent = "Mărește graficul ↗";
      button.setAttribute("aria-label", "Deschide graficul la rezoluția originală");
      button.addEventListener("click", () => {
        const modal = zoomDialog();
        const zoomed = modal.querySelector("img");
        zoomed.src = img.currentSrc || img.src;
        zoomed.alt = img.alt || "Grafic statistic";
        modal.showModal();
        modal.querySelector(".mobile-chart-dialog__viewport").scrollTo(0, 0);
      });
      const target = img.closest("figure") || img;
      target.insertAdjacentElement("afterend", button);
    });
  }

  function layoutBackup(plot) {
    if (!originalLayouts.has(plot)) {
      const layout = plot.layout || {};
      originalLayouts.set(plot, {
        width: layout.width ?? null,
        height: layout.height ?? null,
        autosize: layout.autosize ?? true,
        showlegend: layout.showlegend ?? true,
        margin: Object.assign({}, layout.margin || {}),
        titleSize: layout.title?.font?.size ?? null,
        paperColor: layout.paper_bgcolor ?? null,
        fontColor: layout.font?.color ?? null
      });
    }
    return originalLayouts.get(plot);
  }

  function resizePlotly() {
    if (!window.Plotly || !window.Plotly.relayout) return;
    document.querySelectorAll("#quarto-document-content .js-plotly-plot").forEach(plot => {
      if (!plot._fullLayout) return; // Ignore unfinished async Plotly renders.
      const mobile = narrow.matches;
      const width = Math.max(270, Math.floor((plot.parentElement || plot).getBoundingClientRect().width));
      const marker = (mobile ? "m" : "d") + ":" + width;
      if (lastApplied.get(plot) === marker) return;
      lastApplied.set(plot, marker);
      // Leave an untouched desktop chart alone; only restore one altered on mobile.
      if (!mobile && !originalLayouts.has(plot)) return;
      const prior = layoutBackup(plot);
      const isGeo = Boolean(plot._fullLayout.geo);
      let settings;
      if (mobile) {
        settings = {
          width: width,
          height: isGeo ? Math.max(330, Math.min(440, Math.round(width * 1.02))) : 420,
          autosize: false,
          "margin.l": isGeo ? 2 : 43,
          "margin.r": isGeo ? 2 : 18,
          "margin.t": isGeo ? 88 : 55,
          "margin.b": isGeo ? 48 : 58,
          "title.font.size": 12,
          paper_bgcolor: "#ffffff",
          "font.color": "#263238"
        };
        if (isGeo) settings.showlegend = false;
      } else {
        settings = {
          width: prior.width,
          height: prior.height,
          autosize: prior.autosize,
          showlegend: prior.showlegend,
          "margin.l": prior.margin.l ?? null,
          "margin.r": prior.margin.r ?? null,
          "margin.t": prior.margin.t ?? null,
          "margin.b": prior.margin.b ?? null,
          "title.font.size": prior.titleSize,
          paper_bgcolor: prior.paperColor,
          "font.color": prior.fontColor
        };
      }
      window.Plotly.relayout(plot, settings).catch(() => {
        lastApplied.delete(plot);
      });
    });
  }

  let pending = false;
  function scheduleResize() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      resizePlotly();
    });
  }
  function start() {
    enhanceTables();
    enhanceStaticFigures();
    scheduleResize();
    window.addEventListener("resize", scheduleResize, { passive: true });
    window.addEventListener("orientationchange", scheduleResize, { passive: true });
    window.addEventListener("load", scheduleResize, { once: true });
    [200, 800, 1800, 3500].forEach(delay => window.setTimeout(scheduleResize, delay));
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(scheduleResize);
      const main = document.getElementById("quarto-document-content");
      if (main) observer.observe(main);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
