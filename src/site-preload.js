const { ipcRenderer } = require('electron');

const LOGIN_PATH_PATTERN = /\/login\.php/i;

function isLoginPage() {
  return LOGIN_PATH_PATTERN.test(window.location.pathname);
}

function findLoginForm() {
  return document.querySelector('form.form-grid') ||
    document.querySelector('form[method="post"]');
}

function findEmailInput(form) {
  return (
    form.querySelector('input[name="email"]') ||
    form.querySelector('input[type="email"]')
  );
}

function findPasswordInput(form) {
  return (
    form.querySelector('input[name="password"]') ||
    form.querySelector('input[type="password"]')
  );
}

function setInputValue(input, value) {
  if (!input || !value) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillLoginForm(credentials) {
  if (!credentials) {
    return;
  }

  const form = findLoginForm();
  if (!form) {
    return;
  }

  setInputValue(findEmailInput(form), credentials.email);
  setInputValue(findPasswordInput(form), credentials.password);
}

function hookLoginForm() {
  const form = findLoginForm();
  if (!form || form.dataset.aAmuAutofillHooked === '1') {
    return;
  }

  form.dataset.aAmuAutofillHooked = '1';

  form.addEventListener('submit', () => {
    const email = findEmailInput(form)?.value?.trim();
    const password = findPasswordInput(form)?.value ?? '';

    if (email && password) {
      ipcRenderer.invoke('auth-save-credentials', { email, password });
    }
  });
}

async function initAutofill() {
  if (!isLoginPage()) {
    return;
  }

  try {
    const credentials = await ipcRenderer.invoke('auth-get-credentials');

    const run = () => {
      fillLoginForm(credentials);
      hookLoginForm();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  } catch {
    // Autofill is optional; ignore preload failures.
  }
}

initAutofill();
