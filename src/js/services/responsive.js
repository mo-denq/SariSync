/*
  FILE: src/js/services/responsive.js
  RESPONSIVE DESIGN HELPER
  This shared helper keeps typography readable on small phones and tablets.
  It calculates a restrained scale from the current viewport, then updates CSS
  variables used by headings, prices, labels, and spacing across every screen.
*/
(() => {
  const BASE_WIDTH = 390;
  const MIN_SCALE = 0.88;
  const MAX_SCALE = 1.22;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function getResponsiveMetrics(viewportWidth = window.innerWidth) {
    const scale = clamp(viewportWidth / BASE_WIDTH, MIN_SCALE, MAX_SCALE);
    return {
      scale,
      font: (size) => Math.round(size * scale),
      space: (size) => Math.round(size * scale),
    };
  }

  function applyResponsiveTokens() {
    const metrics = getResponsiveMetrics();
    const root = document.documentElement.style;

    root.setProperty('--responsive-heading-size', `${metrics.font(22)}px`);
    root.setProperty('--responsive-price-size', `${metrics.font(27)}px`);
    root.setProperty('--responsive-label-size', `${metrics.font(11)}px`);
    root.setProperty('--responsive-space', `${metrics.space(16)}px`);
  }

  window.SariSyncResponsive = { getResponsiveMetrics, applyResponsiveTokens };
  applyResponsiveTokens();
  window.addEventListener('resize', applyResponsiveTokens);
})();
