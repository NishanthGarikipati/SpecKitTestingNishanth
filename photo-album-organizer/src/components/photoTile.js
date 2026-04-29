/**
 * Photo thumbnail tile component.
 *
 * Dispatches a custom `open-lightbox` event on the tile's container
 * when clicked, carrying the full photo object as event.detail.
 */
export function createPhotoTile(photo) {
  const figure = document.createElement('figure');
  figure.className = 'photo-tile';
  figure.dataset.photoId = photo.id;

  const img = document.createElement('img');
  img.src = photo.thumbnail_url;
  img.alt = photo.filename;
  img.loading = 'lazy';
  img.decoding = 'async';

  const caption = document.createElement('figcaption');
  caption.className = 'photo-caption';
  caption.textContent = photo.filename;

  figure.appendChild(img);
  figure.appendChild(caption);

  figure.addEventListener('click', () => {
    figure.dispatchEvent(
      new CustomEvent('open-lightbox', {
        bubbles: true,
        detail: photo,
      })
    );
  });

  return figure;
}
