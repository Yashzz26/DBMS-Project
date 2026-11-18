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
