/*
  FILE: src/js/pages/settings.js
  PURPOSE: Settings-page controller for store and account controls.

  RESPONSIBILITIES:
  - Render current store information and the store code.
  - Open the shared Family Access view for account invitations and members.
  - Display Manage Profile and store-management options.
  - Copy the store code.
  - Open the shared Import Price List and Export Backup actions.
  - Sign out safely from both Supabase and the browser prototype session.
  - Use the shared Page Header component.

  Profile rendering and shared toast messages remain in their existing
  workflows. CSV actions are provided by services/csv-service.js.
*/
(function initialiseSettingsPage() {
  function render(context) {
    if (!context) return;

    const {
      screen,
      activeStoreName,
      productCount,
      categoryCount,
      storeCode,
      csvService,
      onFamilyAccess,
      onCategoryManagement,
      onArchivedProducts,
      isOwner
    } = context;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'STORE CONTROLS',
      title: 'Settings',
      description: 'Manage shared access and price-book preferences.',
      backTarget: 'Home'
    });
    screen.insertAdjacentHTML('beforeend', `
      <div class="store-card">
        <span class="eyebrow">CURRENT STORE</span>
        <strong>${activeStoreName}</strong>
        <p>${productCount} shared products · Up to ${window.SariSyncConstants.MAX_ACTIVE_ACCOUNTS} active accounts</p>
        <div class="store-code-panel">
          <span class="eyebrow">STORE CODE</span>
          <strong>${storeCode}</strong>
          <p>Share this code only with trusted household members.</p>
          <button id="copyStoreCode" type="button">Copy code</button>
        </div>
      </div>

      <div class="settings-list">
        <div class="settings-subheading">Account</div>
        <div class="settings-card">
          <div>
            <strong>Manage Profile</strong>
            <span>Edit your profile information and photo.</span>
          </div>
          <button type="button" data-profile="true" aria-label="Manage Profile">›</button>
        </div>

        <div class="settings-card settings-card-danger">
          <div>
            <strong>Sign out</strong>
            <span>Sign out of this device and return to Login.</span>
          </div>
          <button id="signOutFromSettings" type="button" aria-label="Sign out">Sign out</button>
        </div>

        <div class="settings-card">
          <div>
            <strong>Refresh price book</strong>
            <span>Load the latest products and prices on this device.</span>
          </div>
          <button id="settingsRefresh" type="button" aria-label="Refresh price book">›</button>
        </div>

        <div class="settings-card">
          <div>
            <strong>Family Access</strong>
            <span>Invite family members and manage store access.</span>
          </div>
          <button id="openFamilyAccess" type="button" aria-label="Open Family Access">›</button>
        </div>

        <div class="settings-card">
          <div>
            <strong>Manage categories</strong>
            <span>${isOwner ? `${categoryCount} store categories` : 'Only the store owner can manage categories.'}</span>
          </div>
          <button id="openCategoryManagement" type="button" aria-label="Manage categories" ${isOwner ? '' : 'disabled'}>›</button>
        </div>

        <div class="settings-subheading">Store Management</div>
        ${isOwner ? `
        <div class="settings-card">
          <div>
            <strong>Archived products</strong>
            <span>View and restore items removed from active lookup.</span>
          </div>
          <button id="openArchivedProducts" type="button" aria-label="Open archived products">›</button>
        </div>` : ''}
        <div class="settings-card">
          <div>
            <strong>Import pricelist</strong>
            <span>${isOwner ? 'Upload CSV or Excel price data' : 'Only the store owner can import products.'}</span>
          </div>
          <button id="secondaryImportButton" type="button" aria-label="Import pricelist" ${isOwner ? '' : 'disabled'}>›</button>
        </div>
        <p id="csvImportStatus" class="settings-import-status" hidden role="status"></p>

        <div class="settings-card">
          <div>
            <strong>Backup data</strong>
            <span>Download a CSV copy of your book</span>
          </div>
          <button id="secondaryBackupButton" type="button">›</button>
        </div>
        <div class="settings-card"><div><strong>Quick app guide</strong><span>Search, Scan, Edit, and Save—a short refresher.</span></div><button id="openQuickGuide" type="button" aria-label="Open quick app guide">›</button></div>
      </div>`);

    document.getElementById('openQuickGuide')?.addEventListener('click', () => window.SariSyncQuickGuide.openFromSettings());
    document.getElementById('settingsRefresh')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Refreshing…';
      try { await window.SariSyncRefresh.request('manual'); }
      finally { button.disabled = false; button.textContent = '›'; }
    });

    document.getElementById('copyStoreCode')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(storeCode);
        window.SariSyncToast.show('Store code copied');
      } catch {
        window.SariSyncToast.show(`Store code: ${storeCode}`);
      }
    });

    document.getElementById('secondaryImportButton')?.addEventListener(
      'click',
      () => { if (isOwner) csvService.openImportPicker(); else window.SariSyncToast.show('Only the store owner can import products.'); }
    );
    document.getElementById('secondaryBackupButton')?.addEventListener(
      'click',
      csvService.exportPriceBook
    );

    document.getElementById('openFamilyAccess')?.addEventListener('click', () => {
      if (typeof onFamilyAccess === 'function') {
        onFamilyAccess();
        return;
      }

      window.SariSyncToast.show('Family Access is still loading. Refresh and try again.');
    });

    document.getElementById('openCategoryManagement')?.addEventListener('click', () => {
      if (!isOwner) { window.SariSyncToast.show('Only the store owner can manage categories.'); return; }
      if (typeof onCategoryManagement === 'function') {
        onCategoryManagement();
        return;
      }

      window.SariSyncToast.show('Category Management is still loading. Refresh and try again.');
    });

    document.getElementById('openArchivedProducts')?.addEventListener('click', () => {
      if (typeof onArchivedProducts === 'function') {
        onArchivedProducts();
        return;
      }

      window.SariSyncToast.show('Archived products is still loading. Refresh and try again.');
    });

    document.getElementById('signOutFromSettings')?.addEventListener('click', async () => {
      const signOutButton = document.getElementById('signOutFromSettings');
      signOutButton.disabled = true;
      signOutButton.textContent = 'Signing out...';

      try {
        if (!window.SariSyncAuthSession) {
          throw new Error('The sign-out service is still loading. Refresh and try again.');
        }

        await window.SariSyncAuthSession.signOut();
        window.location.assign(window.SariSyncAuthSession.getLoginPageUrl());
      } catch (error) {
        signOutButton.disabled = false;
        signOutButton.textContent = 'Sign out';
        window.SariSyncToast.show(error.message || 'Unable to sign out. Please try again.');
      }
    });
  }

  window.SariSyncSettings = { render };
})();
