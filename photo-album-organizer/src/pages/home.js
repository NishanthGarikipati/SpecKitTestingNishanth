import '../styles/home.css';
import { getAlbums, createAlbum, deleteAlbum, updateAlbum, reorderAlbums } from '../services/api.js';
import { createAlbumTile } from '../components/albumTile.js';
import { navigate, showToast } from '../main.js';

let savedScrollY = 0;

export function getHomeScrollY() {
  return savedScrollY;
}

// ---- Format date_label "YYYY-MM" → "Month YYYY" ----
function formatDateLabel(label) {
  const [year, month] = label.split('-');
  if (!month) return year;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ---- New Album Modal ----
function openCreateModal(onCreated) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title');

  modal.innerHTML = `
    <h2 id="modal-title">New Album</h2>
    <div class="form-field">
      <label for="album-name-input">Album name</label>
      <input id="album-name-input" type="text" placeholder="e.g. Summer 2025" maxlength="255" autocomplete="off" />
    </div>
    <div id="modal-error" style="color:var(--color-danger);font-size:var(--font-size-sm);margin-top:var(--space-2);min-height:1.2em"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-submit">Create</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const input = modal.querySelector('#album-name-input');
  const errorEl = modal.querySelector('#modal-error');
  input.focus();

  function close() { backdrop.remove(); }

  modal.querySelector('#modal-cancel').addEventListener('click', close);

  modal.querySelector('#modal-submit').addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) { errorEl.textContent = 'Album name is required.'; return; }
    errorEl.textContent = '';
    try {
      const album = await createAlbum(name);
      close();
      onCreated(album);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modal.querySelector('#modal-submit').click();
    if (e.key === 'Escape') close();
  });

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}

// ---- Drag-and-drop ----
function initDragAndDrop(container) {
  let draggedTile = null;

  container.addEventListener('dragstart', (e) => {
    draggedTile = e.target.closest('[data-album-id]');
    if (!draggedTile) return;
    draggedTile.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTile.dataset.albumId);
  });

  container.addEventListener('dragend', () => {
    if (draggedTile) {
      draggedTile.classList.remove('dragging');
      draggedTile = null;
    }
    container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('[data-album-id]');
    if (!target || target === draggedTile) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));

    if (e.clientY < midY) {
      container.insertBefore(draggedTile, target);
    } else {
      container.insertBefore(draggedTile, target.nextSibling);
    }
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const orderedIds = [...container.querySelectorAll('[data-album-id]')]
      .map((el) => Number(el.dataset.albumId));
    try {
      await reorderAlbums(orderedIds);
    } catch (err) {
      showToast(err.message);
    }
  });
}

// ---- Main render ----
export async function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Restore scroll position
  requestAnimationFrame(() => { window.scrollTo(0, savedScrollY); });

  // Page header
  const header = document.createElement('header');
  header.className = 'page-header';
  header.innerHTML = `
    <h1>Photo Albums</h1>
    <button class="btn btn-primary" id="new-album-btn">+ New Album</button>
  `;
  app.appendChild(header);

  const albumsSection = document.createElement('main');
  albumsSection.className = 'albums-container';
  app.appendChild(albumsSection);

  async function loadAndRender() {
    albumsSection.innerHTML = '';

    let albums;
    try {
      albums = await getAlbums();
    } catch (err) {
      albumsSection.innerHTML = `<p class="error-message">Failed to load albums: ${err.message}</p>`;
      return;
    }

    if (albums.length === 0) {
      albumsSection.innerHTML = `
        <div class="empty-state">
          <p>No albums yet — create your first!</p>
        </div>`;
      return;
    }

    // Group albums by date_label descending
    const groups = new Map();
    for (const album of albums) {
      const key = album.date_label || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(album);
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => b.localeCompare(a));

    const tilesContainer = document.createElement('div');
    tilesContainer.className = 'album-tiles-container';

    for (const key of sortedKeys) {
      const section = document.createElement('section');
      section.className = 'date-group';

      const heading = document.createElement('h2');
      heading.className = 'date-group-heading';
      heading.textContent = formatDateLabel(key);
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'album-grid';

      for (const album of groups.get(key)) {
        const tile = createAlbumTile(album, {
          onRename: async (newName) => {
            try {
              await updateAlbum(album.id, { name: newName });
              loadAndRender();
            } catch (err) {
              showToast(err.message);
            }
          },
          onDelete: async () => {
            if (!window.confirm(`Delete album "${album.name}"? This cannot be undone.`)) return;
            try {
              await deleteAlbum(album.id);
              loadAndRender();
            } catch (err) {
              showToast(err.message);
            }
          },
        });
        tile.setAttribute('draggable', 'true');
        tile.dataset.albumId = album.id;
        grid.appendChild(tile);
      }

      section.appendChild(grid);
      tilesContainer.appendChild(section);
    }

    initDragAndDrop(tilesContainer);
    albumsSection.appendChild(tilesContainer);
  }

  header.querySelector('#new-album-btn').addEventListener('click', () => {
    openCreateModal(() => loadAndRender());
  });

  // Save scroll before navigating away
  window.addEventListener('hashchange', () => {
    savedScrollY = window.scrollY;
  }, { once: true });

  await loadAndRender();
}
