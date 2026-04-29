import '../styles/album.css';
import { getPhotos, addPhotos } from '../services/api.js';
import { getCaptureDate, getEffectiveDate } from '../services/exif.js';
import { createPhotoTile } from '../components/photoTile.js';
import { navigate, showToast } from '../main.js';
import { getHomeScrollY } from './home.js';

export async function renderAlbum(albumId) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // ---- Header ----
  const header = document.createElement('header');
  header.className = 'album-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost back-btn';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => {
    navigate('#/');
    // Restore home scroll after navigation settles
    requestAnimationFrame(() => window.scrollTo(0, getHomeScrollY()));
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary';
  addBtn.textContent = '+ Add Photos';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  header.appendChild(backBtn);
  header.appendChild(addBtn);
  header.appendChild(fileInput);
  app.appendChild(header);

  // ---- Photo grid ----
  const grid = document.createElement('div');
  grid.className = 'photo-grid';
  app.appendChild(grid);

  // ---- Lightbox ----
  const lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close btn btn-ghost" aria-label="Close preview">✕</button>
    <img class="lightbox-img" src="" alt="Full-size preview" />
  `;
  app.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('.lightbox-img');
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });

  grid.addEventListener('open-lightbox', (e) => {
    lightboxImg.src = `/api/image?path=${encodeURIComponent(e.detail.file_path)}`;
    lightboxImg.alt = e.detail.filename;
    lightbox.showModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.open) lightbox.close();
  });

  // ---- Load photos ----
  async function loadPhotos() {
    grid.innerHTML = '';
    let photos;
    try {
      photos = await getPhotos(albumId);
    } catch (err) {
      grid.innerHTML = `<p class="error-message">Failed to load photos: ${err.message}</p>`;
      return;
    }

    if (photos.length === 0) {
      grid.innerHTML = `<p class="empty-state-inline">No photos yet — add some!</p>`;
      return;
    }

    for (const photo of photos) {
      grid.appendChild(createPhotoTile(photo));
    }
  }

  // ---- Add photos handler ----
  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    fileInput.value = '';

    const photoData = await Promise.all(
      files.map(async (file) => {
        const captureDate = await getCaptureDate(file);
        const fallbackDate = await getEffectiveDate(file);
        return {
          file_path: file.path || file.name, // Electron sets file.path; fallback to name
          filename: file.name,
          capture_date: captureDate,
          fallback_date: fallbackDate,
          mime_type: file.type,
        };
      })
    );

    try {
      const result = await addPhotos(albumId, photoData);
      if (result.skipped_duplicates > 0) {
        showToast(`${result.skipped_duplicates} duplicate(s) skipped.`, 'success');
      }
      await loadPhotos();
    } catch (err) {
      showToast(err.message);
    }
  });

  await loadPhotos();
}
