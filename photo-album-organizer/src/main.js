import './styles/main.css';

// ---- Toast notification ----

let toastContainer;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'error') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- Hash router ----

const routes = {
  '/': () => import('./pages/home.js').then((m) => m.renderHome()),
  '/album': (id) => import('./pages/album.js').then((m) => m.renderAlbum(id)),
};

const app = document.getElementById('app');

export function navigate(hash) {
  window.location.hash = hash;
}

async function handleRoute() {
  const hash = window.location.hash.replace('#', '') || '/';
  app.innerHTML = '';

  if (hash === '/') {
    await routes['/']();
  } else {
    const match = hash.match(/^\/album\/(\d+)$/);
    if (match) {
      await routes['/album'](Number(match[1]));
    } else {
      app.innerHTML = '<p style="padding:2rem">Page not found.</p>';
    }
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
