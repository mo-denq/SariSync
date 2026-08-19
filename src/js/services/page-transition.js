/*
  FILE: src/js/services/page-transition.js
  PURPOSE: Provides the shared, minimal animation used before leaving a page
  through a Back action.

  The transition is intentionally short so it communicates direction without
  slowing down price lookup. Reduced-motion users skip the animation.
*/
(function initialisePageTransition() {
  function back(element, navigate) {
    if (typeof navigate !== 'function') return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!element || reduceMotion) {
      navigate();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      element.classList.remove('page-exit-back');
      navigate();
    };

    element.classList.add('page-exit-back');
    element.addEventListener('animationend', finish, { once: true });
    window.setTimeout(finish, 240);
  }

  window.SariSyncPageTransition = { back };
})();
