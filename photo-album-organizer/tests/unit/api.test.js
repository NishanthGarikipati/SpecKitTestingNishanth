import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  reorderAlbums,
  getPhotos,
  addPhotos,
  deletePhoto,
  imageUrl,
} from '../../src/services/api.js';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

describe('api service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAlbums', () => {
    it('returns parsed JSON on 200', async () => {
      globalThis.fetch = mockFetch(200, [{ id: 1, name: 'Test' }]);
      const result = await getAlbums();
      expect(result).toEqual([{ id: 1, name: 'Test' }]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it('throws Error when response is not ok', async () => {
      globalThis.fetch = mockFetch(500, { error: 'Server error' });
      await expect(getAlbums()).rejects.toThrow('Server error');
    });
  });

  describe('createAlbum', () => {
    it('posts name and returns created album', async () => {
      globalThis.fetch = mockFetch(201, { id: 2, name: 'New Album' });
      const result = await createAlbum('New Album');
      expect(result).toEqual({ id: 2, name: 'New Album' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Album' }),
        })
      );
    });
  });

  describe('updateAlbum', () => {
    it('patches and returns updated album', async () => {
      globalThis.fetch = mockFetch(200, { id: 1, name: 'Renamed' });
      const result = await updateAlbum(1, { name: 'Renamed' });
      expect(result).toEqual({ id: 1, name: 'Renamed' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums/1',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('deleteAlbum', () => {
    it('returns null on 204', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true, json: vi.fn() });
      const result = await deleteAlbum(1);
      expect(result).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('reorderAlbums', () => {
    it('patches order and returns result', async () => {
      globalThis.fetch = mockFetch(200, { updated: 3 });
      const result = await reorderAlbums([3, 1, 2]);
      expect(result).toEqual({ updated: 3 });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums/order',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ order: [3, 1, 2] }),
        })
      );
    });
  });

  describe('getPhotos', () => {
    it('fetches photos for an album', async () => {
      globalThis.fetch = mockFetch(200, [{ id: 10, filename: 'a.jpg' }]);
      const result = await getPhotos(5);
      expect(result).toEqual([{ id: 10, filename: 'a.jpg' }]);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums/5/photos',
        expect.any(Object)
      );
    });
  });

  describe('addPhotos', () => {
    it('posts photo array and returns result', async () => {
      const photos = [{ file_path: '/tmp/a.jpg', filename: 'a.jpg', mime_type: 'image/jpeg', capture_date: null }];
      globalThis.fetch = mockFetch(201, { added: 1, skipped_duplicates: 0, photos });
      const result = await addPhotos(5, photos);
      expect(result.added).toBe(1);
    });
  });

  describe('deletePhoto', () => {
    it('returns null on 204', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 204, ok: true, json: vi.fn() });
      const result = await deletePhoto(5, 10);
      expect(result).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/albums/5/photos/10',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('imageUrl', () => {
    it('returns encoded URL', () => {
      const url = imageUrl('/photos/my image.jpg');
      expect(url).toBe('/api/image?path=%2Fphotos%2Fmy%20image.jpg');
    });
  });

  describe('error handling', () => {
    it('uses fallback message when error field is missing', async () => {
      globalThis.fetch = mockFetch(400, {});
      await expect(getAlbums()).rejects.toThrow('Request failed: 400');
    });
  });
});
