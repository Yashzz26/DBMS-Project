const form = document.querySelector('#login-form');
const errorMessage = document.querySelector('#login-error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const formData = new FormData(form);
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username: formData.get('username'),
      password: formData.get('password')
    })
  });

  if (response.ok) {
    window.location.href = '/index.html';
    return;
  }

  const result = await response.json();
  errorMessage.textContent = result.error || 'Unable to sign in';
});
