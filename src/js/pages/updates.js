/*
  FILE: src/js/pages/updates.js
  PURPOSE: Updates-page controller for recent SariSync price changes.

  RESPONSIBILITIES:
  - Render the complete real recent-price-history list from Supabase.
  - Show the previous and new price, updater, and the exact displayed date/time.
  - Mark each history row so the shared product workflow can open its product.
  - Use the shared Product Card and Page Header components.

  Product data and editing remain outside this file so Updates can stay focused
  on display behavior.
*/
(function initialiseUpdatesPage() {
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function updateRows(priceUpdates, { peso, productCard, priceHistoryError = null }) {
    // A failed request is not the same as an empty price history.
    if (priceHistoryError) {
      return '<div class="last-updated history-load-error"><strong>Unable to load saved price updates.</strong><span>Check your connection, then try again.</span><button id="updatesRetry" type="button">Retry</button></div>';
    }

    if (!priceUpdates.length) {
      return '<div class="last-updated">No price changes have been saved yet.</div>';
    }

    return priceUpdates.map(update => {
      const oldPrice = update.previousPrice === null || update.previousPrice === undefined
        ? 'New price'
        : peso(update.previousPrice);
      const newPrice = peso(update.retail);
      const direction = update.direction === 'down' ? 'down' : 'up';

      return `<button class="update-row" data-product="${escapeHtml(update.productId)}" type="button">
        ${productCard.mark(update)}
        <span>
          <strong>${escapeHtml(update.name)}</strong>
          <small>${escapeHtml(oldPrice)} → ${escapeHtml(newPrice)}</small>
          <small class="update-row-meta">Updated by ${escapeHtml(update.updatedBy)} · ${escapeHtml(update.updated || 'Recently')}</small>
        </span>
        <span class="price-change ${direction === 'down' ? 'down' : ''}">
          ${direction === 'down' ? 'Decreased' : 'Increased'}<br>
          <span class="browse-price">${newPrice}</span>
        </span>
      </button>`;
    }).join('');
  }

  function render(context) {
    if (!context) return;

    const {
      screen,
      priceUpdates,
      peso,
      productCard,
      priceHistoryError,
      onRetry
    } = context;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'PRICE PULSE',
      title: 'Recent updates',
      description: 'See every recent price change in one place.',
      backTarget: 'Home'
    });
    screen.insertAdjacentHTML('beforeend', `
      <div class="update-list">
        ${updateRows(priceUpdates || [], { peso, productCard, priceHistoryError })}
      </div>`);

    screen.querySelector('#updatesRetry')?.addEventListener('click', onRetry);
  }

  window.SariSyncUpdates = { render, updateRows };
})();
