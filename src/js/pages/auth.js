/*
  FILE: src/js/pages/auth.js
  PURPOSE: Renders SariSync sign-in, registration, and account-setup screens.

  RESPONSIBILITIES:
  - Sign users in with Supabase email/password authentication.
  - Register users and collect profile display details.
  - Check whether the signed-in user belongs to a store.
  - Let a new user create or join one family price book.
  - Save the existing prototype session before moving to Home.

  IMPORTANT:
  Store operations use protected Supabase database functions in
  docs/phase-8-account-setup.sql. This browser file never contains a secret
  service-role key and never decides who is allowed to access a store.
*/
import { supabase } from '../services/supabase.js';
import {
  createMyStore,
  getMyStoreAccess,
  joinStore
} from '../services/store-access.js';

const authScreen = document.getElementById('authScreen');
const { titleCase } = window.SariSyncUtils;
const { MAX_ACTIVE_ACCOUNTS } = window.SariSyncConstants;

let screen = 'choice';
let registration = {};
let activeUser = null;
let completedStore = null;

const brand = () => `
  <div class="auth-brand">
    <div class="brand-mark" aria-hidden="true"><span>₱</span></div>
    <div><h1>SariSync</h1><p>Your family's shared price book</p></div>
  </div>`;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function back(target) {
  return `<button class="auth-back" data-screen="${target}" type="button" aria-label="Go back">←</button>`;
}

function authStatus(message = '', type = 'error') {
  return message
    ? `<p class="auth-status auth-status--${type}" role="status">${escapeHtml(message)}</p>`
    : '';
}

/* Reuses the same accessible Show/Hide control wherever a password is typed.
   The password stays hidden by default. This only changes what is visible on
   the current screen; it does not change, save, or send the password. */
function passwordField(id, label, autocomplete, placeholder) {
  return `<div class="form-row">
    <label for="${id}">${label}</label>
    <div class="auth-password-control">
      <input id="${id}" required autocomplete="${autocomplete}" type="password" minlength="8" placeholder="${placeholder}" />
      <button class="auth-password-toggle" data-password-toggle="${id}" type="button" aria-label="Show password" aria-pressed="false" title="Show password">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>
      </button>
    </div>
  </div>`;
}

function accountSetupChoices(message = '') {
  const personName = escapeHtml(activeUser?.user_metadata?.full_name || activeUser?.email || 'there');
  return `${brand()}${back('choice')}
    <h2 class="auth-heading">Set up your store</h2>
    <p class="auth-copy">Welcome, ${personName}. Create a new shared price book or join one your family already uses.</p>
    ${authStatus(message)}
    <div class="auth-actions">
      <button class="auth-primary" data-screen="create-store" type="button">Create my store<small>Start a shared price book for your family</small></button>
      <button class="auth-secondary" data-screen="join-store" type="button">Join a family store<small>Use a store code shared by your family</small></button>
    </div>
    <button class="auth-text-button" id="signOutButton" type="button">Sign out</button>`;
}

function render() {
  if (screen === 'choice') {
    authScreen.innerHTML = `${brand()}
      <h2 class="auth-heading">Your prices, always clear.</h2>
      <p class="auth-copy">Log in or create your own personal SariSync account.</p>
      <div class="auth-actions">
        <button class="auth-primary" data-screen="login" type="button">Log in<small>Use your email address and password</small></button>
        <button class="auth-secondary" data-screen="register" type="button">Create an account<small>Create your personal SariSync login</small></button>
      </div>
      <p class="auth-footer">Up to ${MAX_ACTIVE_ACCOUNTS} active personal accounts can share one family store.</p>`;
  }

  if (screen === 'login') {
    authScreen.innerHTML = `${brand()}${back('choice')}
      <h2 class="auth-heading">Welcome back</h2>
      <p class="auth-copy">Log in with the email address and password for your SariSync account.</p>
      <form id="loginForm" class="auth-form-card">
        <div class="form-row"><label for="loginEmail">EMAIL ADDRESS</label><input id="loginEmail" required autocomplete="email" inputmode="email" type="email" placeholder="you@example.com" /></div>
        ${passwordField('loginPassword', 'PASSWORD', 'current-password', 'Enter your password')}
        <button class="save-button" type="submit">Log in</button>
      </form>
      <div class="auth-actions"><button class="auth-secondary" data-screen="register" type="button">Create an account<small>Create your personal SariSync login</small></button></div>`;
  }

  if (screen === 'register') {
    authScreen.innerHTML = `${brand()}${back('choice')}
      <h2 class="auth-heading">Create your account</h2>
      <p class="auth-copy">Use one email address for your personal SariSync account.</p>
      <form id="registerForm" class="auth-form-card">
        <div class="form-row"><label for="fullName">FULL NAME</label><input id="fullName" data-title-case required autocomplete="name" placeholder="e.g. Maria Santos" /></div>
        <div class="form-row"><label for="mobileNumber">MOBILE NUMBER (OPTIONAL)</label><input id="mobileNumber" autocomplete="tel" inputmode="tel" type="tel" placeholder="09XX XXX XXXX" /></div>
        <div class="form-row"><label for="registerEmail">EMAIL ADDRESS</label><input id="registerEmail" required autocomplete="email" inputmode="email" type="email" placeholder="you@example.com" /></div>
        ${passwordField('registerPassword', 'PASSWORD', 'new-password', 'At least 8 characters')}
        ${passwordField('confirmPassword', 'CONFIRM PASSWORD', 'new-password', 'Enter your password again')}
        <button class="save-button" type="submit">Create account</button>
      </form>`;
  }

  if (screen === 'check-email') {
    authScreen.innerHTML = `${brand()}
      <h2 class="auth-heading">Check your email</h2>
      <p class="auth-copy">We sent a confirmation link to <strong>${escapeHtml(registration.email)}</strong>. Open it to confirm your account, then return here and log in.</p>
      <div class="auth-actions"><button class="auth-primary" data-screen="login" type="button">Go to log in</button></div>
      <p class="auth-footer">Your store setup will be completed after account confirmation.</p>`;
  }

  if (screen === 'checking-access') {
    authScreen.innerHTML = `${brand()}
      <h2 class="auth-heading">Checking your store access</h2>
      <p class="auth-copy">Please wait while SariSync finds your shared price book.</p>
      ${authStatus('Checking account setup…', 'info')}`;
  }

  if (screen === 'setup-choice') {
    authScreen.innerHTML = accountSetupChoices();
  }

  if (screen === 'setup-error') {
    authScreen.innerHTML = accountSetupChoices(
      'Account setup is not ready yet. Run the Phase 8 Account Setup Functions SQL file in Supabase, then try again.'
    );
  }

  if (screen === 'create-store') {
    authScreen.innerHTML = `${brand()}${back('setup-choice')}
      <h2 class="auth-heading">Create your store</h2>
      <p class="auth-copy">These details identify your family's shared price book.</p>
      <form id="createStoreForm" class="auth-form-card">
        <div class="form-row"><label for="storeName">STORE NAME</label><input id="storeName" data-title-case required autocomplete="organization" placeholder="e.g. 4YZ Mini Store" /></div>
        <div class="form-row"><label for="storeBarangay">BARANGAY</label><input id="storeBarangay" required placeholder="e.g. Mambog IV" /></div>
        <div class="form-row"><label for="storeCity">CITY / MUNICIPALITY</label><input id="storeCity" required placeholder="e.g. Bacoor City" /></div>
        <div class="form-row"><label for="storeProvince">PROVINCE</label><input id="storeProvince" required placeholder="e.g. Cavite" /></div>
        <div class="form-row"><label for="storeAddress">EXACT STREET ADDRESS (OPTIONAL)</label><input id="storeAddress" autocomplete="street-address" placeholder="Street, subdivision, or landmark" /></div>
        <button class="save-button" type="submit">Create store</button>
      </form>`;
  }

  if (screen === 'join-store') {
    authScreen.innerHTML = `${brand()}${back('setup-choice')}
      <h2 class="auth-heading">Join a family store</h2>
      <p class="auth-copy">Use your own email and password, then enter the store code shared by the owner. You will see the same family price book.</p>
      <form id="joinStoreForm" class="auth-form-card">
        <div class="form-row"><label for="joinStoreCode">STORE CODE</label><input id="joinStoreCode" required autocapitalize="characters" autocomplete="off" placeholder="e.g. 4YZ-A1B2C3D4" /></div>
        <button class="save-button" type="submit">Join store</button>
      </form>`;
  }

  if (screen === 'store-code') {
    authScreen.innerHTML = `${brand()}
      <h2 class="auth-heading">Your store is ready</h2>
      <p class="auth-copy">Share this code only with family members you want to add to your price book.</p>
      <div class="code-box"><span>YOUR STORE CODE</span><strong>${escapeHtml(completedStore?.store_code || '')}</strong></div>
      <div class="device-note">You are connected as the ${escapeHtml(completedStore?.role || 'owner')}.</div>
      <div class="auth-actions"><button class="auth-primary" id="continueHomeButton" type="button">Continue to Home</button></div>`;
  }

  bindForms();
}

function setLoading(button, loading, label) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = label;
}

function showFormError(form, error, fallback) {
  /* A failed sign-in must never create a second JavaScript error. During a
     page re-render the original form can be gone, so safely fall back to the
     permanent auth screen and still show a clear message to the user. */
  const target = form?.querySelector && form?.insertAdjacentHTML
    ? form
    : authScreen;
  const message = fallback === undefined && typeof error === 'string'
    ? error
    : (window.SariSyncFeedback?.messageFor(error, fallback)
      || fallback
      || 'Something went wrong. Please try again.');
  target.querySelector('.auth-status')?.remove();
  target.insertAdjacentHTML('afterbegin', authStatus(message));
}

function bindForms() {
  document.querySelectorAll('[data-title-case]').forEach(input => {
    input.addEventListener('blur', () => {
      input.value = titleCase(input.value);
    });
  });

  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;

      const willShowPassword = input.type === 'password';
      input.type = willShowPassword ? 'text' : 'password';
      button.setAttribute('aria-label', willShowPassword ? 'Hide password' : 'Show password');
      button.setAttribute('title', willShowPassword ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', String(willShowPassword));
      button.classList.toggle('is-visible', willShowPassword);
      input.focus({ preventScroll: true });
    });
  });

  document.getElementById('loginForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    setLoading(button, true, 'Logging in…');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        showFormError(event.currentTarget, error, 'Unable to log in. Check your email address and password.');
        setLoading(button, false, 'Log in');
        return;
      }

      await routeSignedInUser(data.user);
    } catch (error) {
      showFormError(event.currentTarget, error, 'Unable to log in. Please try again.');
      setLoading(button, false, 'Log in');
    }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fullName = titleCase(document.getElementById('fullName').value);
    const mobileNumber = document.getElementById('mobileNumber').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showFormError(form, 'The passwords do not match.');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    setLoading(button, true, 'Creating account…');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        data: { full_name: fullName, mobile_number: mobileNumber }
      }
    });

    if (error) {
      showFormError(form, error, 'Unable to create the account. Please try again.');
      setLoading(button, false, 'Create account');
      return;
    }

    registration = { fullName, mobileNumber, email };
    screen = 'check-email';
    render();
  });

  document.getElementById('createStoreForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    setLoading(button, true, 'Creating store…');

    try {
      completedStore = await createMyStore({
        storeName: window.SariSyncUtils.formatStoreName(document.getElementById('storeName').value),
        barangay: document.getElementById('storeBarangay').value.trim(),
        city: document.getElementById('storeCity').value.trim(),
        province: document.getElementById('storeProvince').value.trim(),
        streetAddress: document.getElementById('storeAddress').value.trim()
      });
      screen = 'store-code';
      render();
    } catch (error) {
      showFormError(form, error, 'Unable to create your store. Please try again.');
      setLoading(button, false, 'Create store');
    }
  });

  document.getElementById('joinStoreForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    setLoading(button, true, 'Joining store…');

    try {
      completedStore = await joinStore(document.getElementById('joinStoreCode').value.trim());
      await continueToHome(completedStore);
    } catch (error) {
      showFormError(form, error, 'Unable to join that store. Please try again.');
      setLoading(button, false, 'Join store');
    }
  });

  document.getElementById('joinStoreCode')?.addEventListener('input', event => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/\s+/g, '');
  });

  document.getElementById('continueHomeButton')?.addEventListener('click', () => {
    continueToHome(completedStore);
  });

  document.getElementById('signOutButton')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    activeUser = null;
    completedStore = null;
    window.SariSyncLocalStorage.remove(window.SariSyncLocalStorage.KEYS.SESSION);
    screen = 'choice';
    render();
  });
}

async function routeSignedInUser(user) {
  activeUser = user;
  screen = 'checking-access';
  render();

  try {
    const storeAccess = await getMyStoreAccess();
    if (storeAccess) {
      await continueToHome(storeAccess);
      return;
    }
    screen = 'setup-choice';
  } catch (error) {
    console.error('Unable to check store access:', error);
    screen = 'setup-error';
  }

  render();
}

async function continueToHome(storeAccess) {
  const { data } = await supabase.auth.getUser();
  const user = activeUser || data.user;
  if (!user || !storeAccess) return;

  window.SariSyncLocalStorage.saveJson(window.SariSyncLocalStorage.KEYS.SESSION, {
    userId: user.id,
    userEmail: user.email,
    storeId: storeAccess.store_id,
    storeCode: storeAccess.store_code,
    storeName: storeAccess.store_name,
    role: storeAccess.role,
    deviceName: storeAccess.full_name || user.user_metadata?.full_name || user.email
  });

  // Use one explicit app-wide URL after login. This keeps the installed web
  // app inside its own window instead of handing the user back to a browser tab.
  const homeUrl = new URL('/index.html', window.location.origin);
  window.location.replace(homeUrl.href);
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-screen]');
  if (!button) return;
  screen = button.dataset.screen;
  render();
});

render();

supabase.auth.getSession().then(({ data }) => {
  if (data.session?.user) routeSignedInUser(data.session.user);
});
