const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 204) return null;

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return json;
}

// ---- Albums ----

export function getAlbums() {
  return request('/albums');
}

export function createAlbum(name) {
  return request('/albums', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateAlbum(id, data) {
  return request(`/albums/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAlbum(id) {
  return request(`/albums/${id}`, { method: 'DELETE' });
}

export function reorderAlbums(orderedIds) {
  return request('/albums/order', {
    method: 'PATCH',
    body: JSON.stringify({ order: orderedIds }),
  });
}

// ---- Photos ----

export function getPhotos(albumId) {
  return request(`/albums/${albumId}/photos`);
}

export function addPhotos(albumId, photos) {
  return request(`/albums/${albumId}/photos`, {
    method: 'POST',
    body: JSON.stringify({ photos }),
  });
}

export function deletePhoto(albumId, photoId) {
  return request(`/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' });
}

// ---- Image URL ----

export function imageUrl(filePath) {
  return `${BASE}/image?path=${encodeURIComponent(filePath)}`;
}
