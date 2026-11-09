import { useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import { Bell, ChevronDown, ChevronUp, CloudOff, Map as MapIcon, Route, ScanLine, UserRound, X } from 'lucide-react';
import { StoryMap } from './components/StoryMap';
import type { MapDraft } from './components/StoryMap';
import { insideLima, navigate, useHashPath } from './lib/utils';
import { AccountRoutes } from './panels/AccountRoutes';
import { CreatePanel, MAX_STOPS } from './panels/CreatePanel';
import type { CreateFlow } from './panels/CreatePanel';
import { EditorPanel } from './panels/EditorPanel';
import { ExplorePanel } from './panels/ExplorePanel';
import { NodePanel } from './panels/NodePanel';
import { QrPanel } from './panels/QrPanel';
import { RoutesPanel, WalkPanel } from './panels/RoutesPanels';
import { useStore } from './state/store';
import type { Genre, LatLng } from './types';

type Size = 'peek' | 'half' | 'full';

const NAV = [
  { href: '#/', label: 'Mapa', icon: MapIcon, match: (s: string) => s === '' || s === 'n' },
  { href: '#/rutas', label: 'Rutas', icon: Route, match: (s: string) => s === 'rutas' || s === 'recorrer' },
  { href: '#/qr', label: 'Escanear', icon: ScanLine, match: (s: string) => s === 'qr' || s === 'q' },
  { href: '#/actividad', label: 'Actividad', icon: Bell, match: (s: string) => s === 'actividad' },
  { href: '#/perfil', label: 'Tú', icon: UserRound, match: (s: string) => s === 'perfil' },
];

export function App() {
  const { state, toasts, toast, dismissToast } = useStore();
  const path = useHashPath();
  const parts = path.split('/').filter(Boolean);
  const section = parts[0] ?? '';

  const [writing, setWriting] = useState(false);
  const [flow, setFlow] = useState<CreateFlow>({ tool: 'none' });
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sizeOverride, setSizeOverride] = useState<Size | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => setSizeOverride(null), [path, writing, flow.tool]);

  const nodeId = section === 'n' ? parts[1] : undefined;
  const isEditor = section === 'n' && parts[2] === 'escribir';
  const walkStory = section === 'recorrer' ? parts[1] : undefined;
  const onHome = section === '';
  const creating = onHome && writing;
  const placing = creating && ((flow.tool === 'pin' && !flow.point) || (flow.tool === 'route' && !flow.details));

  const chapterCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of state.chapters) counts[c.nodeId] = (counts[c.nodeId] ?? 0) + 1;
    return counts;
  }, [state.chapters]);

  const visited = useMemo(() => new Set(Object.values(state.progress).flat()), [state.progress]);

  const visibleNodes = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return state.nodes.filter((n) => {
      const story = state.stories.find((s) => s.id === n.storyId);
      if (!story || (genre && story.genre !== genre)) return false;
      return !q || `${n.place} ${n.district} ${story.title}`.toLocaleLowerCase('es').includes(q);
    });
  }, [state.nodes, state.stories, query, genre]);

  const selected = nodeId ? state.nodes.find((n) => n.id === nodeId) : undefined;
  const activeStoryId = walkStory ?? selected?.storyId;

  const focus = useMemo<LatLng[] | undefined>(() => {
    if (selected) return [selected];
    if (!walkStory) return undefined;
    const stops = state.nodes.filter((n) => n.storyId === walkStory);
    const current = stops.sort((a, b) => a.order - b.order).find((n) => !state.progress[walkStory]?.includes(n.id));
    return current ? [current] : stops;
  }, [selected, walkStory, state.nodes, state.progress]);

  const draft = useMemo<MapDraft | undefined>(() => {
    if (!creating) return undefined;
    if (flow.tool === 'pin' && flow.point) return { points: [flow.point], draggable: true };
    if (flow.tool === 'route') return { points: flow.points, draggable: false };
    return undefined;
  }, [creating, flow]);

  const addPoint = (p: LatLng) => {
    if (!insideLima(p)) {
      toast('Ese punto está fuera de Lima. Elige uno dentro del mapa.', { tone: 'error' });
      return;
    }
    if (flow.tool === 'pin') setFlow({ ...flow, point: p });
    if (flow.tool === 'route' && !flow.details) {
      if (flow.points.length >= MAX_STOPS) {
        toast(`Una ruta admite hasta ${MAX_STOPS} paradas.`, { tone: 'error' });
        return;
      }
      setFlow({ ...flow, points: [...flow.points, p] });
    }
  };

  const center = (): LatLng => {
    const c = mapRef.current?.getCenter();
    return c ? { lat: c.lat, lng: c.lng } : { lat: -12.1, lng: -77.03 };
  };

  const startAddPlace = (storyId: string) => {
    setWriting(true);
    setFlow({ tool: 'pin', extendStoryId: storyId });
    navigate('/');
  };

  const setMode = (next: boolean) => {
    setWriting(next);
    setFlow({ tool: 'none' });
  };

  let defaultSize: Size = 'half';
  if (onHome && !writing) defaultSize = 'peek';
  if (creating && flow.tool === 'none') defaultSize = 'half';
  if (placing) defaultSize = 'peek';
  if (creating && !placing && flow.tool !== 'none') defaultSize = 'full';
  if (isEditor || section === 'qr' || section === 'q' || section === 'actividad' || section === 'perfil') defaultSize = 'full';
  const size = sizeOverride ?? defaultSize;
  const nextSize: Size = size === 'peek' ? 'half' : size === 'half' ? 'full' : 'half';

  const unread = state.activity.filter((a) => !a.read).length;
  const rolePill = creating || isEditor ? 'Escribiendo' : 'Leyendo';

  let panel;
  if (section === 'n' && nodeId && isEditor) panel = <EditorPanel key={path} nodeId={nodeId} photoMode={parts[3] === 'foto'} />;
  else if (section === 'n' && nodeId) panel = <NodePanel id={nodeId} onAddPlace={startAddPlace} />;
  else if (section === 'rutas') panel = <RoutesPanel />;
  else if (section === 'recorrer' && walkStory) panel = <WalkPanel storyId={walkStory} />;
  else if (section === 'qr' && parts[1] === 'ruta') panel = <QrPanel key={path} initialCode={parts[2]} fromRoute={parts[2]} />;
  else if (section === 'qr') panel = <QrPanel key={path} />;
  else if (section === 'q') panel = <QrPanel key={path} initialCode={parts[1]} />;
  else if (section === 'actividad' || section === 'perfil') panel = <AccountRoutes section={section} />;
  else if (creating) panel = <CreatePanel flow={flow} setFlow={setFlow} addPoint={addPoint} center={center} />;
  else panel = <ExplorePanel nodes={visibleNodes} query={query} genre={genre} onQuery={setQuery} onGenre={setGenre} />;

  return (
    <div className="app">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">StoryTrail</span>
        <span className="brand__role">{rolePill}</span>
      </div>

      <nav className="nav" aria-label="Principal">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.match(section);
          return (
            <a key={item.href} href={item.href} className={active ? 'nav__item is-active' : 'nav__item'} aria-current={active ? 'page' : undefined}>
              <span className="nav__icon">
                <Icon size={21} aria-hidden="true" />
                {item.label === 'Actividad' && unread > 0 && <span className="badge">{unread}</span>}
              </span>
              {item.label}
              {item.label === 'Actividad' && unread > 0 && <span className="sr-only"> ({unread} sin leer)</span>}
            </a>
          );
        })}
      </nav>

      <main className="map-wrap">
        <StoryMap
          mapRef={mapRef}
          nodes={onHome && !writing ? visibleNodes : state.nodes}
          stories={state.stories}
          chapterCount={chapterCount}
          visited={visited}
          selectedId={nodeId}
          activeStoryId={activeStoryId}
          focus={focus}
          draft={draft}
          placing={placing}
          onNodeClick={(id) => {
            if (!placing) navigate(`/n/${id}`);
          }}
          onMapClick={(p) => {
            if (placing) addPoint(p);
          }}
          onDraftMove={(p) => {
            if (flow.tool === 'pin') setFlow({ ...flow, point: p });
          }}
        />

        <div className="map-top">
          {onHome && (
            <div className="segmented" role="group" aria-label="Modo del mapa">
              <button className={!writing ? 'is-on' : ''} aria-pressed={!writing} onClick={() => setMode(false)}>
                Leer
              </button>
              <button className={writing ? 'is-on' : ''} aria-pressed={writing} onClick={() => setMode(true)}>
                Crear
              </button>
            </div>
          )}
          {placing && (
            <p className="map-hint" role="status">
              {flow.tool === 'pin' ? 'Toca dónde ocurre la escena' : 'Toca cada parada en orden'}
              <button aria-label="Cancelar" onClick={() => setFlow({ tool: 'none' })}>
                <X size={16} aria-hidden="true" />
              </button>
            </p>
          )}
          {state.offline && (
            <p className="offline" role="status">
              <CloudOff size={15} aria-hidden="true" /> Sin señal
            </p>
          )}
        </div>
      </main>

      <aside className="side" data-size={size}>
        <button
          className="handle"
          aria-label={nextSize === 'full' || nextSize === 'half' && size === 'peek' ? 'Expandir panel' : 'Reducir panel'}
          onClick={() => setSizeOverride(nextSize)}
        >
          <span className="handle__bar" aria-hidden="true" />
          {size === 'full' ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
        </button>
        <div className="side__scroll">{panel}</div>
      </aside>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={t.tone === 'error' ? 'toast toast--error' : 'toast'}>
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.();
                  dismissToast(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
