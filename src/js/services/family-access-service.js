/*
  FILE: src/js/services/family-access-service.js
  PURPOSE: Keeps Family Access data requests and invitation sharing separate
  from the page layout.

  RESPONSIBILITIES:
  - Reuse the authenticated Supabase client already owned by auth-session.js.
  - Load only the signed-in person's store and its active family members.
  - Build and share a store-code invitation without exposing any password.

  BEGINNER NOTE:
  The browser never receives a service-role key. The reviewed Supabase
  function verifies auth.uid() before returning any membership information.
*/
(function initialiseFamilyAccessService() {
  const maximumAccounts = window.SariSyncConstants.MAX_ACTIVE_ACCOUNTS;

  function getClient() {
    if (!window.SariSyncAuthSession?.getClient) {
      throw new Error('The Family Access service is still loading. Refresh and try again.');
    }

    return window.SariSyncAuthSession.getClient();
  }

  function friendlyError(error) {
    const message = String(error?.message || '');

    if (/PGRST202|could not find the function|get_my_family_access/i.test(message)) {
      return new Error('Family Access needs its reviewed Supabase setup before members can be displayed.');
    }

    if (/failed to fetch|network|load failed/i.test(message)) {
      return new Error('SariSync could not reach Family Access. Check your connection and try again.');
    }

    return new Error(message || 'Unable to load Family Access. Please try again.');
  }

  async function getFamilyAccess() {
    const { data, error } = await getClient().rpc('get_my_family_access');
    if (error) throw friendlyError(error);

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      throw new Error('No active store membership was found for this account.');
    }

    const first = rows[0];
    const members = rows.map(row => ({
      userId: row.member_user_id,
      name: row.member_name || 'Family member',
      email: row.member_email || 'Email not available',
      role: row.member_role || 'member',
      status: row.member_status || 'active',
      joinedAt: row.member_joined_at || null
    }));

    return {
      storeId: first.store_id,
      storeName: window.SariSyncUtils.formatStoreName(first.store_name),
      storeCode: first.store_code,
      currentRole: first.viewer_role,
      members,
      activeCount: members.length,
      maximumAccounts,
      availableSpaces: Math.max(0, maximumAccounts - members.length)
    };
  }

  function invitationMessage(storeName, storeCode) {
    return `You are invited to join ${storeName} on SariSync. Create your own account using your email and password, then select Join a Family Store and enter this store code: ${storeCode}.`;
  }

  async function copyText(text) {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Copying is unavailable in this browser. Write down the store code instead.');
    }

    await navigator.clipboard.writeText(text);
  }

  async function shareInvitation(storeName, storeCode) {
    const text = invitationMessage(storeName, storeCode);

    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${storeName} on SariSync`, text });
        return 'shared';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
      }
    }

    await copyText(text);
    return 'copied';
  }

  window.SariSyncFamilyAccessService = {
    copyText,
    getFamilyAccess,
    invitationMessage,
    shareInvitation
  };
})();
