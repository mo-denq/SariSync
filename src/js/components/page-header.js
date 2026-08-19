/*
  FILE: src/js/components/page-header.js
  PURPOSE: Renders the consistent heading used by every secondary SariSync
  screen.

  RESPONSIBILITIES:
  - Render the section label, page title, and short description.
  - Preserve the existing page-intro, section-kicker, heading, and paragraph
    CSS classes.
  - Add the shared Back arrow when a Back destination or action is provided.

  This component does not control the rest of a page. Each page appends its own
  unique content after mounting this header.
*/
(function initialisePageHeaderComponent() {
  function mount(container, options) {
    const {
      kicker,
      title,
      description,
      backTarget = null,
      onBack = null
    } = options;

    container.innerHTML = `
      <div class="page-intro">
        <span class="section-kicker">${kicker}</span>
        <h2>${title}</h2>
        <p>${description}</p>
      </div>
    `;

    if (onBack || backTarget) {
      window.SariSyncNavigation.attachBackButton(onBack || backTarget);
    }
  }

  window.SariSyncPageHeader = { mount };
})();
