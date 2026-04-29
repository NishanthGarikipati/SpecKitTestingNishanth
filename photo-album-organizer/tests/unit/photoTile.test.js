// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createPhotoTile } from '../../src/components/photoTile.js';

function makePhoto(overrides = {}) {
  return {
    id: 42,
    filename: 'beach.jpg',
    thumbnail_url: '/api/image?path=%2Ftmp%2Fbeach.jpg',
    capture_date: '2024-07-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('createPhotoTile', () => {
  it('creates a figure element with correct class', () => {
    const tile = createPhotoTile(makePhoto());
    expect(tile.tagName).toBe('FIGURE');
    expect(tile.className).toBe('photo-tile');
  });

  it('sets the data-photo-id attribute', () => {
    const tile = createPhotoTile(makePhoto({ id: 99 }));
    expect(tile.dataset.photoId).toBe('99');
  });

  it('renders an img with correct src and alt', () => {
    const photo = makePhoto();
    const tile = createPhotoTile(photo);
    const img = tile.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.src).toContain('beach.jpg');
    expect(img.alt).toBe('beach.jpg');
  });

  it('sets lazy loading and async decoding on img', () => {
    const img = createPhotoTile(makePhoto()).querySelector('img');
    expect(img.loading).toBe('lazy');
    expect(img.decoding).toBe('async');
  });

  it('renders a figcaption with filename', () => {
    const tile = createPhotoTile(makePhoto({ filename: 'sunset.png' }));
    const caption = tile.querySelector('figcaption');
    expect(caption).not.toBeNull();
    expect(caption.textContent).toBe('sunset.png');
  });

  it('dispatches open-lightbox event with photo detail on click', () => {
    const photo = makePhoto();
    const tile = createPhotoTile(photo);
    document.body.appendChild(tile);

    let received = null;
    document.body.addEventListener('open-lightbox', (e) => {
      received = e.detail;
    });

    tile.click();
    expect(received).toEqual(photo);

    document.body.removeChild(tile);
  });

  it('event bubbles up from the tile', () => {
    const photo = makePhoto({ id: 77 });
    const tile = createPhotoTile(photo);
    document.body.appendChild(tile);

    let bubbled = false;
    document.body.addEventListener('open-lightbox', () => {
      bubbled = true;
    });

    tile.click();
    expect(bubbled).toBe(true);

    document.body.removeChild(tile);
  });
});
