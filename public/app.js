async function apiFetch(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error('Unable to connect to the backend. Check that the server and MongoDB are running.');
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `Request failed with status ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

window.apiFetch = apiFetch;

function setupLogout() {
  const logoutButton = document.querySelector('#logout');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login.html';
  });
}

window.setupLogout = setupLogout;

function setupAppLayout() {
  if (document.querySelector('.app-shell')) return;
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  if (!header || !main) return;

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  header.className = 'sidebar';

  const inner = header.querySelector('.header-inner');
  if (inner) {
    inner.className = 'sidebar-inner';
    const logout = inner.querySelector('#logout');
    const nav = inner.querySelector('.site-nav');
    if (logout) {
      const footer = document.createElement('div');
      footer.className = 'sidebar-footer';
      const title = document.createElement('strong');
      title.textContent = 'Repair Shop';
      footer.append(title, logout);
      header.append(footer);
    }
    if (nav) header.insertBefore(nav, inner);
  }

  main.classList.add('workspace');
  const brand = header.querySelector('.brand');
  if (brand) {
    brand.classList.add('brand');
    brand.innerHTML = `<span class="brand-mark">R</span><span>${brand.textContent}</span>`;
  }

  const nav = header.querySelector('.site-nav');
  if (nav) {
    nav.querySelectorAll('a').forEach((link) => {
      const labels = {
        'index.html': '⌂',
        'customers.html': '○',
        'devices.html': '▣',
        'requests.html': '◷',
        'reports.html': '▥'
      };
      const key = link.getAttribute('href')?.split('/').pop();
      link.innerHTML = `<span>${labels[key] || '○'}</span><span>${link.textContent}</span>`;
    });
  }

  header.after(main);
  shell.append(header, main);
  document.body.prepend(shell);
}

window.setupAppLayout = setupAppLayout;

document.addEventListener('DOMContentLoaded', () => {
  setupAppLayout();
});
