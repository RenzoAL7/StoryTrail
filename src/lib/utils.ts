import { useSyncExternalStore } from 'react';
import type { Chapter, Genre, LatLng } from '../types';

export interface ThreadItem {
  chapter: Chapter;
  siblings: Chapter[];
  index: number;
  forkKey: string;
}

export function forkKey(nodeId: string, parentId: string | null): string {
  return `${nodeId}:${parentId ?? 'root'}`;
}

export function childrenOf(chapters: Chapter[], nodeId: string, parentId: string | null): Chapter[] {
  return chapters
    .filter((c) => c.nodeId === nodeId && c.parentId === parentId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Walks the chapter tree of a node, following the version chosen at each fork. */
export function buildThread(
  chapters: Chapter[],
  nodeId: string,
  choices: Record<string, string>,
): ThreadItem[] {
  const thread: ThreadItem[] = [];
  let parent: string | null = null;
  for (;;) {
    const siblings = childrenOf(chapters, nodeId, parent);
    if (siblings.length === 0) return thread;
    const key = forkKey(nodeId, parent);
    const selected: Chapter = siblings.find((c) => c.id === choices[key]) ?? siblings[0];
    thread.push({ chapter: selected, siblings, index: siblings.indexOf(selected), forkKey: key });
    parent = selected.id;
  }
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function timeAgo(ts: number): string {
  const minutes = Math.round((ts - Date.now()) / 60_000);
  if (Math.abs(minutes) < 1) return 'ahora';
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newQrCode(): string {
  return `ST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Accepts lowercase, spaces and a missing hyphen so typed codes are forgiven. */
export function normalizeQr(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.startsWith('ST') ? `ST-${clean.slice(2)}` : clean;
}

export const GENRES: Record<Genre, { label: string }> = {
  ficcion: { label: 'Ficción' },
  leyenda: { label: 'Leyenda urbana' },
  recuerdo: { label: 'Recuerdo' },
};

export const ME_POSITION: LatLng = { lat: -12.1201, lng: -77.0292 };

export const LIMA_BOUNDS = { south: -12.3, north: -11.85, west: -77.2, east: -76.85 };

export function insideLima(p: LatLng): boolean {
  return (
    p.lat >= LIMA_BOUNDS.south &&
    p.lat <= LIMA_BOUNDS.north &&
    p.lng >= LIMA_BOUNDS.west &&
    p.lng <= LIMA_BOUNDS.east
  );
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHashPath(): string {
  return useSyncExternalStore(subscribeHash, () => window.location.hash.replace(/^#/, '') || '/');
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function compressImage(file: File, maxSide = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid image'));
    };
    img.src = url;
  });
}
