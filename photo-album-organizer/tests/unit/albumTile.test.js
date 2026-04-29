// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock navigate to avoid module resolution issues in test environment
vi.mock('../../src/main.js', () => ({ navigate: vi.fn(), showToast: vi.fn() }));

import { createAlbumTile } from '../../src/components/albumTile.js';
import { navigate } from '../../src/main.js';

function makeAlbum(overrides = {}) {
  return {
    id: 1,
    name: 'Summer 2025',
    date_label: '2025-07',
    photo_count: 12,
    cover_url: null,
    ...overrides,
  };
}

describe('createAlbumTile', () => {
  it('renders album name', () => {
    const tile = createAlbumTile(makeAlbum({ name: 'Vacation' }));
    expect(tile.querySelector('.album-name').textContent).toBe('Vacation');
  });

  it('renders photo count correctly (plural)', () => {
    const tile = createAlbumTile(makeAlbum({ photo_count: 5 }));
    expect(tile.querySelector('.album-count').textContent).toBe('5 photos');
  });

  it('renders photo count correctly (singular)', () => {
    const tile = createAlbumTile(makeAlbum({ photo_count: 1 }));
    expect(tile.querySelector('.album-count').textContent).toBe('1 photo');
  });

  it('renders cover image when cover_url is provided', () => {
    const tile = createAlbumTile(makeAlbum({ cover_url: '/api/image?path=%2Ftmp%2Fphoto.jpg' }));
    const img = tile.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('/api/image');
  });

  it('shows placeholder when cover_url is null', () => {
    const tile = createAlbumTile(makeAlbum({ cover_url: null }));
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.querySelector('.album-cover--placeholder')).toBeTruthy();
  });

  it('navigates to album on click', () => {
    const tile = createAlbumTile(makeAlbum({ id: 42 }));
    tile.click();
    expect(navigate).toHaveBeenCalledWith('#/album/42');
  });

  it('does not navigate when clicking the menu button', () => {
    vi.clearAllMocks();
    const tile = createAlbumTile(makeAlbum({ id: 42 }));
    tile.querySelector('.album-menu-btn').click();
    expect(navigate).not.toHaveBeenCalled();
  });
});
