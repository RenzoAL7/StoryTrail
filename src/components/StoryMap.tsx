import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LIMA_BOUNDS, ME_POSITION } from '../lib/utils';
import type { Genre, LatLng, Story, StoryNode } from '../types';

const ICONS = {
  ficcion: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.6 7.6"/>',
  leyenda: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  recuerdo: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  open: '<path d="M12 5v14M5 12h14"/>',
  done: '<path d="M20 6 9 17l-5-5"/>',
};

function svg(inner: string): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function pinIcon(genre: Genre, opts: { open: boolean; visited: boolean; selected: boolean; count: number }) {
  const glyph = opts.visited ? ICONS.done : opts.open ? ICONS.open : ICONS[genre];
  const classes = ['pin', `pin--${genre}`, opts.open && 'is-open', opts.visited && 'is-visited', opts.selected && 'is-selected']
    .filter(Boolean)
    .join(' ');
  const count = opts.count > 1 ? `<span class="pin__count">${opts.count}</span>` : '';
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="${classes}"><span class="pin__glyph">${svg(glyph)}</span></span>${count}`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function draftIcon(label: string) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin pin--draft"><span class="pin__glyph"><b>${label}</b></span></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export interface MapDraft {
  points: LatLng[];
  /** A single point can be fine-tuned by dragging. */
  draggable: boolean;
}

interface Props {
  nodes: StoryNode[];
  stories: Story[];
  chapterCount: Record<string, number>;
  visited: Set<string>;
  selectedId?: string;
  activeStoryId?: string;
  focus?: LatLng[];
  draft?: MapDraft;
  placing: boolean;
  onNodeClick: (id: string) => void;
  onMapClick: (p: LatLng) => void;
  onDraftMove: (p: LatLng) => void;
  mapRef: React.RefObject<L.Map | null>;
}

export function StoryMap(props: Props) {
  const { nodes, stories, chapterCount, visited, selectedId, activeStoryId, focus, draft, placing, mapRef } = props;
  const el = useRef<HTMLDivElement>(null);
  const layers = useRef<{ routes: L.LayerGroup; pins: L.LayerGroup; draft: L.LayerGroup } | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      center: [-12.098, -77.031],
      zoom: 13,
      minZoom: 11,
      maxBounds: [
        [LIMA_BOUNDS.south, LIMA_BOUNDS.west],
        [LIMA_BOUNDS.north, LIMA_BOUNDS.east],
      ],
      zoomControl: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const me = L.divIcon({ className: 'me-dot', iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker([ME_POSITION.lat, ME_POSITION.lng], { icon: me, interactive: false, keyboard: false }).addTo(map);

    layers.current = {
      routes: L.layerGroup().addTo(map),
      pins: L.layerGroup().addTo(map),
      draft: L.layerGroup().addTo(map),
    };
    map.on('click', (e: L.LeafletMouseEvent) => latest.current.onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    const group = layers.current;
    if (!group) return;
    group.routes.clearLayers();
    group.pins.clearLayers();

    for (const story of stories) {
      const stops = nodes.filter((n) => n.storyId === story.id).sort((a, b) => a.order - b.order);
      if (stops.length < 2) continue;
      const active = story.id === activeStoryId;
      const line = stops.map((n) => [n.lat, n.lng] as [number, number]);
      if (active) L.polyline(line, { color: '#FAF6EE', weight: 9, opacity: 0.9, interactive: false }).addTo(group.routes);
      L.polyline(line, {
        className: `trail trail--${story.genre}`,
        weight: active ? 4 : 2.5,
        opacity: active ? 1 : 0.55,
        dashArray: active ? undefined : '2 7',
        lineCap: 'round',
        interactive: false,
      }).addTo(group.routes);
    }

    for (const node of nodes) {
      const story = stories.find((s) => s.id === node.storyId);
      if (!story) continue;
      const count = chapterCount[node.id] ?? 0;
      const open = count === 0;
      const description = open ? `${node.place}: parada abierta` : `${node.place}: ${story.title}`;
      const marker = L.marker([node.lat, node.lng], {
        icon: pinIcon(story.genre, { open, visited: visited.has(node.id), selected: node.id === selectedId, count }),
        title: description,
        alt: description,
        riseOnHover: true,
        zIndexOffset: node.id === selectedId ? 1000 : 0,
      });
      marker.on('click', () => latest.current.onNodeClick(node.id));
      marker.on('keypress', (e: L.LeafletKeyboardEvent) => {
        if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') latest.current.onNodeClick(node.id);
      });
      marker.addTo(group.pins);
    }
  }, [nodes, stories, chapterCount, visited, selectedId, activeStoryId]);

  useEffect(() => {
    const group = layers.current;
    if (!group) return;
    group.draft.clearLayers();
    if (!draft || draft.points.length === 0) return;
    if (draft.points.length > 1) {
      L.polyline(draft.points.map((p) => [p.lat, p.lng] as [number, number]), {
        className: 'trail trail--draft',
        weight: 4,
        dashArray: '8 8',
        interactive: false,
      }).addTo(group.draft);
    }
    draft.points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: draftIcon(String(i + 1)),
        draggable: draft.draggable,
        title: draft.draggable ? 'Arrastra para ajustar la ubicación' : `Parada ${i + 1}`,
        zIndexOffset: 2000,
      });
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        latest.current.onDraftMove({ lat: pos.lat, lng: pos.lng });
      });
      marker.addTo(group.draft);
    });
  }, [draft]);

  const focusKey = focus?.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || focus.length === 0) return;
    const sheet = window.matchMedia('(max-width: 860px)').matches
      ? (document.querySelector('.side') as HTMLElement | null)?.offsetHeight ?? 0
      : 0;
    map.flyToBounds(L.latLngBounds(focus.map((p) => [p.lat, p.lng] as [number, number])), {
      paddingTopLeft: [40, 90],
      paddingBottomRight: [40, sheet + 40],
      maxZoom: 15,
      duration: 0.6,
    });
    // focusKey captures the value of `focus`; the array identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, mapRef]);

  return <div ref={el} className={placing ? 'map is-placing' : 'map'} role="application" aria-label="Mapa de historias de Lima" />;
}
