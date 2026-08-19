/*
  FILE: src/js/pages/profile.js
  PURPOSE: Profile-page controller for the current SariSync family member.

  RESPONSIBILITIES:
  - Render the member's initials, display name, mobile number, and email.
  - Display the Profile Information and Profile Photo options.
  - Hide the Home branding while Profile is open.
  - Use the shared Page Header component.

  The visible profile information is read from Supabase and saved through the
  protected profile service. Email and password changes remain Supabase Auth
  actions, so the email is shown but not edited on this page.
*/
(function initialiseProfilePage() {
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function render(context) {
    if (!context) return;

    const {
      screen,
      homePage,
      session,
      activeDeviceName,
      setHomeHeader
    } = context;

    setHomeHeader(false);
    homePage.hidden = true;
    screen.hidden = false;

    window.SariSyncPageHeader.mount(screen, {
      kicker: 'ACCOUNT',
      title: 'Manage Profile',
      description: 'Edit your profile information and photo.',
      backTarget: 'Settings'
    });
    screen.insertAdjacentHTML('beforeend', '<div id="profileContent" class="profile-content">Loading profile...</div>');
    const content = document.getElementById('profileContent');

    try {
      const profile = await window.SariSyncProfileDataService.getMyProfile();
      const name = profile?.full_name || activeDeviceName;
      const mobile = profile?.mobile_number || session.mobile || '';
      const email = profile?.email || session.email || 'Email address not available';
      content.innerHTML = `
        <div class="profile-card">
          <div class="profile-avatar-large">${window.SariSyncUtils.initials(name)}</div>
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(mobile || 'Mobile number not added')}</span><span>${escapeHtml(email)}</span></div>
        </div>
        <form id="profileForm" class="profile-edit-form">
          <div class="form-row"><label for="profileFullName">FULL NAME</label><input id="profileFullName" required value="${escapeHtml(name)}" /></div>
          <div class="form-row"><label for="profileMobile">MOBILE NUMBER (OPTIONAL)</label><input id="profileMobile" inputmode="tel" value="${escapeHtml(mobile)}" /></div>
          <div class="form-row"><label>EMAIL ADDRESS</label><output class="profile-email-readonly">${escapeHtml(email)}</output><small>Email and password changes are handled securely through Supabase Authentication later.</small></div>
          <button class="save-button" type="submit">Save profile</button>
        </form>
        <p class="profile-photo-note">Profile photo upload needs the separate private Supabase Storage setup before it can safely be enabled.</p>`;

      document.getElementById('profileForm').addEventListener('submit', async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button');
        button.disabled = true;
        button.textContent = 'Saving...';
        try {
          const saved = await window.SariSyncProfileDataService.updateMyProfile({
            fullName: document.getElementById('profileFullName').value,
            mobileNumber: document.getElementById('profileMobile').value
          });
          session.deviceName = saved?.full_name || document.getElementById('profileFullName').value;
          session.mobile = saved?.mobile_number || '';
          window.SariSyncLocalStorage.saveJson(window.SariSyncLocalStorage.KEYS.SESSION, session);
          window.SariSyncToast.show('Profile saved');
          render(context);
        } catch (error) {
          window.SariSyncToast.show(error.message || 'Could not save your profile.');
        } finally {
          button.disabled = false;
          button.textContent = 'Save profile';
        }
      });
    } catch (error) {
      content.innerHTML = `<div class="category-empty"><strong>Unable to load your profile</strong><span>${escapeHtml(error.message || 'Refresh and try again.')}</span></div>`;
    }
  }

  window.SariSyncProfile = { render };
})();
