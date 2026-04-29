import { navigate } from '../main.js';

/**
 * Create an album tile DOM element.
 *
 * @param {object} album - Album data from the API
 * @param {object} [callbacks] - Optional { onRename, onDelete }
 * @returns {HTMLElement}
 */
export function createAlbumTile(album, callbacks = {}) {
  const tile = document.createElement('article');
  tile.className = 'album-tile';
  tile.dataset.albumId = album.id;

  const cover = document.createElement('div');
  cover.className = 'album-cover';

  if (album.cover_url) {
    const img = document.createElement('img');
    img.src = album.cover_url;
    img.alt = album.name;
    img.loading = 'lazy';
    cover.appendChild(img);
  } else {
    cover.classList.add('album-cover--placeholder');
    cover.innerHTML = `<span class="album-cover__icon">🖼️</span>`;
  }

  const info = document.createElement('div');
  info.className = 'album-info';

  const name = document.createElement('h3');
  name.className = 'album-name';
  name.textContent = album.name;

  const count = document.createElement('span');
  count.className = 'album-count';
  count.textContent = album.photo_count === 1 ? '1 photo' : `${album.photo_count} photos`;

  info.appendChild(name);
  info.appendChild(count);

  // Context menu (rename / delete)
  const menu = document.createElement('div');
  menu.className = 'album-menu';
  menu.innerHTML = `<button class="album-menu-btn" aria-label="Album options" title="Options">⋯</button>`;

  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'album-menu-dropdown hidden';
  menuDropdown.innerHTML = `
    <button class="album-menu-item" data-action="rename">Rename</button>
    <button class="album-menu-item album-menu-item--danger" data-action="delete">Delete</button>
  `;
  menu.appendChild(menuDropdown);

  menu.querySelector('.album-menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle('hidden');
  });

  menuDropdown.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.add('hidden');
    const newName = window.prompt('Rename album:', album.name);
    if (newName && newName.trim() && newName.trim() !== album.name) {
      callbacks.onRename?.(newName.trim());
    }
  });

  menuDropdown.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.add('hidden');
    callbacks.onDelete?.();
  });

  // Close dropdown when clicking elsewhere
  document.addEventListener('click', () => menuDropdown.classList.add('hidden'));

  tile.appendChild(cover);
  tile.appendChild(info);
  tile.appendChild(menu);

  // Navigate into album on tile click (not on menu click)
  tile.addEventListener('click', (e) => {
    if (e.target.closest('.album-menu')) return;
    navigate(`#/album/${album.id}`);
  });

  return tile;
}
