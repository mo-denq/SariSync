/*
  FILE: src/js/navigation.js
  PURPOSE: Shared navigation controller for the current SariSync web prototype.

  RESPONSIBILITIES:
  - Switch between the Home, Browse, Updates, and Settings views.
  - Keep the correct bottom-navigation button highlighted.
  - Add and control Back buttons on secondary views.
  - Open the initial view requested through a URL such as ?view=Settings.

  IMPORTANT:
  This file controls movement between views only. The HTML for each view is
  still rendered by pages/home/home.js. During the later Phase 5 folder
  migration, this is the shared navigation file described by the Phase 5 plan.
*/
(function initialiseSariSyncNavigation() {
  const mainPages = new Set(['Home', 'Browse', 'Updates', 'Settings']);
  let activePage = 'Home';

  function setActiveTab(page) {
    document.querySelectorAll('.nav-item').forEach(button => {
      button.classList.toggle('active', button.dataset.nav === page);
    });
  }

  function goTo(page) {
    const destination = mainPages.has(page) ? page : 'Home';

    setActiveTab(destination);
    activePage = destination;

    if (typeof window.renderSecondaryPage === 'function') {
      window.renderSecondaryPage(destination);
    }
  }

  function attachBackButton(target = 'Home') {
    const intro = document.querySelector('#secondaryPage .page-intro');
    if (!intro) return;

    intro.querySelector('.page-back')?.remove();
    intro.insertAdjacentHTML(
      'afterbegin',
      '<button class="page-back" type="button" aria-label="Go back"><span aria-hidden="true">&larr;</span></button>'
    );

    intro.querySelector('.page-back')?.addEventListener('click', () => {
      const navigateBack = () => {
        if (typeof target === 'function') {
          target();
          return;
        }
        goTo(target);
      };

      if (window.SariSyncPageTransition) {
        window.SariSyncPageTransition.back(
          document.getElementById('secondaryPage'),
          navigateBack
        );
      } else {
        navigateBack();
      }
    });
  }

  window.SariSyncNavigation = {
    goTo,
    attachBackButton,
    getActivePage: () => activePage
  };

  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => goTo(button.dataset.nav));
  });

  document.getElementById('viewUpdates')?.addEventListener('click', () => goTo('Updates'));
  document.getElementById('viewCategories')?.addEventListener('click', () => goTo('Browse'));

  const requestedView = new URLSearchParams(window.location.search).get('view') || 'Home';
  goTo(requestedView);
})();
