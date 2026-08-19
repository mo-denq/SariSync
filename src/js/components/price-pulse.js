/*
  FILE: src/js/components/price-pulse.js
  PURPOSE: Builds the Home dashboard's Price Pulse summary and recent
  price-change cards.

  RESPONSIBILITIES:
  - Select price records that represent a recent change.
  - Sort those records from newest to oldest.
  - Calculate old-to-new price differences.
  - Count today's increases and decreases.
  - Render the existing cards and no-updates message.

  BEGINNER NOTE:
  This component only prepares and displays Price Pulse content. Home still
  controls page navigation, product opening, and the empty-state action.
*/
(function initialisePricePulse() {
  function records(priceUpdates) {
    return [...priceUpdates]
      .sort((a, b) => {
        const time = product => product.updatedAt
          ? new Date(product.updatedAt).getTime()
          : 0;
        return time(b) - time(a);
      });
  }

  /* Home is a quick shift-start dashboard, not the audit trail. The list is
     already newest-first, so keeping the first record for each product gives
     one clear current card per product. The Updates tab still receives the
     complete unfiltered history, including typo corrections. */
  function latestRecordPerProduct(priceUpdates) {
    const seenProductIds = new Set();

    return records(priceUpdates).filter(record => {
      const key = record.productId || record.id;
      if (seenProductIds.has(key)) return false;
      seenProductIds.add(key);
      return true;
    });
  }

  function isToday(product) {
    if (!product.updatedAt) return false;

    const updatedAt = new Date(product.updatedAt);
    const now = new Date();
    return updatedAt.getFullYear() === now.getFullYear()
      && updatedAt.getMonth() === now.getMonth()
      && updatedAt.getDate() === now.getDate();
  }

  function difference(product) {
    if (
      product.previousPrice === undefined ||
      product.previousPrice === null ||
      product.previousPrice === ''
    ) {
      return null;
    }

    return Number(product.retail) - Number(product.previousPrice);
  }

  function card(product, options) {
    const { peso, productCard, activeDeviceName } = options;
    const priceDifference = difference(product);
    const isDecrease = product.direction === 'down';
    const isUnchangedRetail = product.direction === 'same';
    const label = product.direction === 'up'
      ? 'Increased'
      : product.direction === 'down'
        ? 'Decreased'
        : product.direction === 'same'
          ? 'Wholesale updated'
          : 'New price';
    const differenceText = priceDifference === null
      ? 'New price'
      : isUnchangedRetail
        ? 'Wholesale updated'
        : `${isDecrease ? '↓' : '↑'} ${peso(Math.abs(priceDifference))}`;
    const oldPrice = priceDifference === null
      ? '<span class="pulse-new-label">New price</span>'
      : `<span class="pulse-old">${peso(product.previousPrice)}</span>`;

    return `<button class="pulse-card ${isDecrease ? 'is-decrease' : 'is-increase'}" data-product="${product.productId || product.id}" type="button">
      <div class="pulse-card-head">${productCard.mark(product)}<span class="pulse-product"><strong>${product.name}</strong><small>${product.notes || 'Current store price'}</small></span><span class="pulse-badge">${label}</span></div>
      <div class="pulse-prices"><div class="pulse-old-wrap">${oldPrice}<span class="pulse-arrow">→</span></div><strong class="pulse-current">${peso(product.retail)}</strong><span class="pulse-difference">${differenceText}</span></div>
      <div class="pulse-meta">Updated by <b>${product.updatedBy || activeDeviceName}</b><span>•</span>${product.updated || 'Recently'}</div>
    </button>`;
  }

  function render(options) {
    const {
      container,
      priceUpdates,
      peso,
      productCard,
      activeDeviceName,
      onEmptyAction,
      priceHistoryError = null,
      onRetry
    } = options;

    /* Do not present a failed history request as "0 changes." Those are two
       different situations: an empty store has no records, while a loading
       error needs an honest retry message. */
    if (priceHistoryError) {
      container.innerHTML = '<div class="pulse-empty pulse-load-error"><strong>Unable to load recent price changes</strong><span>Check your connection, then try again.</span><button id="pulseRetry" type="button">Retry</button></div>';
      container.querySelector('#pulseRetry')?.addEventListener('click', onRetry);
      return;
    }
    /* `todayRecords` counts every saved action. `latestCards` is the cleaner
       one-card-per-product dashboard view requested for Home. */
    const allRecords = records(priceUpdates || []);
    const todayRecords = allRecords.filter(isToday);
    const latestCards = latestRecordPerProduct(allRecords);
    const affectedProducts = new Set(todayRecords.map(record => record.productId || record.id)).size;
    const increases = todayRecords.filter(product =>
      product.direction === 'up'
    ).length;
    const decreases = todayRecords.filter(product =>
      product.direction === 'down'
    ).length;

    container.innerHTML = `<div class="pulse-summary"><div><span class="section-kicker">TODAY'S ACTIVITY</span><strong>${todayRecords.length} price changes today</strong><small>${affectedProducts} product${affectedProducts === 1 ? '' : 's'} affected · Last update: ${todayRecords[0]?.updated || '—'}</small></div><div class="pulse-counts"><span class="up-count">${increases} increased</span><span class="down-count">${decreases} decreased</span></div></div>${latestCards.length ? `<div class="pulse-grid">${latestCards.slice(0, 6).map(product => card(product, { peso, productCard, activeDeviceName })).join('')}</div>` : '<div class="pulse-empty"><strong>No recent price changes</strong><span>Your latest product updates will appear here.</span><button id="emptyPulseAction" type="button">Update a price</button></div>'}`;

    container.querySelector('#emptyPulseAction')
      ?.addEventListener('click', onEmptyAction);
  }

  window.SariSyncPricePulse = {
    records,
    latestRecordPerProduct,
    difference,
    render
  };
})();
