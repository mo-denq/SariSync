/*
  FILE: src/js/pages/family-access.js
  PURPOSE: Renders the owner/member view for one store's shared access.

  RESPONSIBILITIES:
  - Show the current store, store code, account capacity, and active members.
  - Let only the owner open the invitation panel and share the store code.
  - Display clear loading, empty, and retry states.
  - Reuse the shared Page Header and existing application shell.

  IMPORTANT:
  This page never asks for, displays, or retrieves a password. Each family
  member creates their own personal SariSync account before joining a store.
*/
(function initialiseFamilyAccessPage() {
  let renderRequest = 0;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function roleLabel(role) {
    return String(role).toLowerCase() === 'owner' ? 'Owner' : 'Member';
  }

  function memberInitials(name) {
    return window.SariSyncUtils.initials(name || 'Family Member');
  }

  function renderLoading(container) {
    container.innerHTML = `
      <div class="family-access-state" role="status">
        <div class="home-auth-spinner" aria-hidden="true"></div>
        <strong>Loading family access...</strong>
        <span>SariSync is checking the members of this store.</span>
      </div>`;
  }

  function renderError(container, message, retry) {
    container.innerHTML = `
      <div class="family-access-state family-access-state--error" role="alert">
        <strong>Family Access could not be loaded</strong>
        <span>${escapeHtml(message)}</span>
        <button id="retryFamilyAccess" class="family-secondary-button" type="button">Retry</button>
      </div>`;
    container.querySelector('#retryFamilyAccess')?.addEventListener('click', retry);
  }

  function membersMarkup(members) {
    if (!members.length) {
      return `
        <div class="family-access-state">
          <strong>No active family members</strong>
          <span>Active members will appear here after they join the store.</span>
        </div>`;
    }

    return members.map(member => `
      <article class="family-member-card">
        <span class="family-member-avatar" aria-hidden="true">${escapeHtml(memberInitials(member.name))}</span>
        <div class="family-member-details">
          <strong>${escapeHtml(member.name)}</strong>
          <span>${escapeHtml(member.email)}</span>
        </div>
        <span class="family-role-badge family-role-badge--${escapeHtml(member.role)}">${roleLabel(member.role)}</span>
      </article>`).join('');
  }

  function renderAccess(container, access) {
    const isOwner = access.currentRole === 'owner';
    const isFull = access.availableSpaces === 0;
    const spacesLabel = isFull
      ? 'No member spaces available'
      : `${access.availableSpaces} member ${access.availableSpaces === 1 ? 'space' : 'spaces'} available`;

    container.innerHTML = `
      <section class="family-store-card" aria-labelledby="familyStoreName">
        <span class="eyebrow">CURRENT STORE</span>
        <h3 id="familyStoreName">${escapeHtml(access.storeName)}</h3>
        <div class="family-store-code-row">
          <div>
            <span class="eyebrow">STORE CODE</span>
            <strong>${escapeHtml(access.storeCode)}</strong>
          </div>
          <button id="familyCopyCode" class="family-code-button" type="button">Copy store code</button>
        </div>
      </section>

      <section class="family-capacity-card" aria-label="Active account capacity">
        <div>
          <span class="eyebrow">ACTIVE ACCOUNTS</span>
          <strong>${access.activeCount} of ${access.maximumAccounts} accounts</strong>
          <p>${spacesLabel}</p>
        </div>
        <span class="family-capacity-count" aria-hidden="true">${access.activeCount}/${access.maximumAccounts}</span>
      </section>

      ${isOwner ? `
        <section class="family-owner-actions" aria-labelledby="inviteFamilyHeading">
          <div>
            <span class="eyebrow">OWNER ACTION</span>
            <h3 id="inviteFamilyHeading">Invite a family member</h3>
            <p>They will create their own account, then use this store code.</p>
          </div>
          <button id="openFamilyInvite" class="family-primary-button" type="button" aria-expanded="false" ${isFull ? 'disabled' : ''}>
            ${isFull ? 'Store is full' : 'Invite family member'}
          </button>
        </section>

        <section id="familyInvitePanel" class="family-invite-panel" hidden>
          <div class="family-invite-heading">
            <div>
              <span class="eyebrow">SHARE STORE ACCESS</span>
              <h3>Invite with the store code</h3>
            </div>
            <button id="closeFamilyInvite" class="family-close-button" type="button" aria-label="Close invitation panel">&times;</button>
          </div>
          <p>Each family member creates their own SariSync account. Share this code after they register.</p>
          <div class="family-invite-code">${escapeHtml(access.storeCode)}</div>
          <div class="family-invite-buttons">
            <button id="familyPanelCopy" class="family-secondary-button" type="button">Copy code</button>
            <button id="familyShareInvite" class="family-primary-button" type="button">Share invitation</button>
          </div>
        </section>` : `
        <div class="family-member-note">
          You are connected as a member. Only the store owner can invite additional family members.
        </div>`}

      <section class="family-member-section" aria-labelledby="familyMembersHeading">
        <div class="family-section-heading">
          <div>
            <span class="eyebrow">SHARED ACCESS</span>
            <h3 id="familyMembersHeading">Current family members</h3>
          </div>
          <span>${access.activeCount} active</span>
        </div>
        <div class="family-member-list">${membersMarkup(access.members)}</div>
      </section>`;

    bindActions(container, access);
  }

  function showToast(message) {
    window.SariSyncToast.show(message);
  }

  async function copyStoreCode(access) {
    try {
      await window.SariSyncFamilyAccessService.copyText(access.storeCode);
      showToast('Store code copied');
    } catch (error) {
      showToast(error.message || `Store code: ${access.storeCode}`);
    }
  }

  async function shareInvitation(access) {
    try {
      const result = await window.SariSyncFamilyAccessService.shareInvitation(
        access.storeName,
        access.storeCode
      );
      if (result === 'copied') showToast('Invitation copied. You can paste it into a message.');
      if (result === 'shared') showToast('Invitation shared');
    } catch (error) {
      showToast(error.message || 'Unable to share the invitation.');
    }
  }

  function bindActions(container, access) {
    container.querySelector('#familyCopyCode')?.addEventListener('click', () => copyStoreCode(access));
    container.querySelector('#familyPanelCopy')?.addEventListener('click', () => copyStoreCode(access));
    container.querySelector('#familyShareInvite')?.addEventListener('click', () => shareInvitation(access));

    const openButton = container.querySelector('#openFamilyInvite');
    const panel = container.querySelector('#familyInvitePanel');
    const closeButton = container.querySelector('#closeFamilyInvite');

    openButton?.addEventListener('click', () => {
      panel.hidden = false;
      openButton.setAttribute('aria-expanded', 'true');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    closeButton?.addEventListener('click', () => {
      panel.hidden = true;
      openButton?.setAttribute('aria-expanded', 'false');
      openButton?.focus();
    });
  }

  async function render(context) {
    if (!context) return;

    const { screen, homePage, setHomeHeader } = context;
    const requestId = ++renderRequest;

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'ACCOUNT ACCESS',
      title: 'Family Access',
      description: 'Invite family members and manage who shares this store.',
      backTarget: 'Settings'
    });
    screen.insertAdjacentHTML('beforeend', '<div id="familyAccessContent"></div>');

    const content = screen.querySelector('#familyAccessContent');
    renderLoading(content);

    const retry = () => render(context);

    try {
      const access = await window.SariSyncFamilyAccessService.getFamilyAccess();
      if (requestId !== renderRequest || !screen.querySelector('#familyAccessContent')) return;
      renderAccess(content, access);
    } catch (error) {
      if (requestId !== renderRequest || !screen.querySelector('#familyAccessContent')) return;
      renderError(content, error.message, retry);
    }
  }

  window.SariSyncFamilyAccess = { render };
})();
