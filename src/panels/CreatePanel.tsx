import { useState } from 'react';
import { Crosshair, MapPin, Route, Undo2 } from 'lucide-react';
import { GenrePicker, PanelHeading } from '../components/ui';
import { distanceMeters, navigate } from '../lib/utils';
import { useStore } from '../state/store';
import type { Genre, LatLng } from '../types';

export type CreateFlow =
  | { tool: 'none' }
  | { tool: 'pin'; point?: LatLng; extendStoryId?: string }
  | { tool: 'route'; points: LatLng[]; details: boolean };

const MIN_BODY = 30;
export const MAX_STOPS = 8;

interface Props {
  flow: CreateFlow;
  setFlow: (flow: CreateFlow) => void;
  addPoint: (p: LatLng) => void;
  center: () => LatLng;
}

export function CreatePanel({ flow, setFlow, addPoint, center }: Props) {
  const { state } = useStore();
  if (flow.tool === 'pin') return <PinFlow flow={flow} setFlow={setFlow} addPoint={addPoint} center={center} />;
  if (flow.tool === 'route') return <RouteFlow flow={flow} setFlow={setFlow} addPoint={addPoint} center={center} />;

  const open = state.nodes.filter((n) => !state.chapters.some((c) => c.nodeId === n.id));
  return (
    <div className="panel">
      <PanelHeading title="¿Qué quieres crear?" />
      <div className="tools">
        <button className="tool" onClick={() => setFlow({ tool: 'pin' })}>
          <MapPin size={22} aria-hidden="true" />
          <span>
            <strong>Anclar nodo</strong>
            <small>Una escena en un punto del mapa</small>
          </span>
        </button>
        <button className="tool" onClick={() => setFlow({ tool: 'route', points: [], details: false })}>
          <Route size={22} aria-hidden="true" />
          <span>
            <strong>Dibujar ruta</strong>
            <small>Una historia que avanza por varios lugares</small>
          </span>
        </button>
      </div>
      {open.length > 0 && (
        <>
          <h2 className="section-title">¿Sin idea? Empieza por una parada abierta</h2>
          <ul className="list">
            {open.map((node) => (
              <li key={node.id}>
                <a className="row" href={`#/n/${node.id}`}>
                  <span className="row__main">
                    <strong>{node.place}</strong>
                    <span className="serif">{state.stories.find((s) => s.id === node.storyId)?.title}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PinFlow({ flow, setFlow, addPoint, center }: Props & { flow: Extract<CreateFlow, { tool: 'pin' }> }) {
  const { state, actions, toast } = useStore();
  const extend = flow.extendStoryId ? state.stories.find((s) => s.id === flow.extendStoryId) : undefined;
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [genre, setGenre] = useState<Genre>('ficcion');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();

  const cancel = () => setFlow({ tool: 'none' });

  if (!flow.point) {
    return (
      <div className="panel">
        <PanelHeading title={extend ? 'Elige el siguiente lugar' : 'Anclar nodo'} />
        <p>Toca el mapa donde ocurre la escena.</p>
        <div className="actions-row">
          <button className="btn btn--ghost" onClick={() => addPoint(center())}>
            <Crosshair size={18} aria-hidden="true" /> Usar el centro del mapa
          </button>
          <button className="btn btn--ghost" onClick={cancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const point = flow.point;
  const nearby = state.nodes.find((n) => distanceMeters(n, point) < 60);

  const submit = () => {
    if (!place.trim()) return setError('Indica el nombre del lugar.');
    if (!title.trim()) return setError('Ponle un título a la escena.');
    if (body.trim().length < MIN_BODY) return setError(`Escribe al menos ${MIN_BODY} caracteres de historia.`);
    setError(undefined);
    const stop = { ...point, place: place.trim(), title: title.trim() };
    if (extend) {
      const id = actions.addStop(extend.id, { ...stop, body: body.trim() });
      setFlow({ tool: 'none' });
      navigate(`/n/${id}`);
      toast('Nueva parada añadida a la ruta.', { actionLabel: 'Deshacer', action: () => { actions.removeNode(id); navigate('/'); } });
      return;
    }
    const id = actions.createStory({ title: title.trim(), genre, stops: [stop], firstBody: body.trim() });
    setFlow({ tool: 'none' });
    navigate(`/n/${id}`);
    toast('Tu historia ya está en el mapa.');
  };

  return (
    <div className="panel">
      <PanelHeading title={extend ? `Nueva parada de «${extend.title}»` : 'Nuevo nodo'} />
      <p className="role-note">Arrastra el marcador si quieres ajustar el punto.</p>
      {nearby && (
        <p className="notice">
          Ya existe una historia a pocos metros, en {nearby.place}. <a href={`#/n/${nearby.id}`}>Ver si prefieres continuarla</a>
        </p>
      )}
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="field">
          <label htmlFor="place">Nombre del lugar</label>
          <input id="place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ej. Café de la esquina" />
        </div>
        <div className="field">
          <label htmlFor="title">Título de la escena</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {!extend && <GenrePicker value={genre} onChange={setGenre} />}
        <div className="field">
          <label htmlFor="scene">Qué pasa aquí</label>
          <textarea id="scene" className="serif" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions-row">
          <button type="submit" className="btn btn--primary">
            Publicar en el mapa
          </button>
          <button type="button" className="btn btn--ghost" onClick={cancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function RouteFlow({ flow, setFlow, addPoint, center }: Props & { flow: Extract<CreateFlow, { tool: 'route' }> }) {
  const { actions, toast } = useStore();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>('ficcion');
  const [places, setPlaces] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>();
  const { points } = flow;

  if (!flow.details) {
    const remaining = 2 - points.length;
    return (
      <div className="panel">
        <PanelHeading title="Dibujar ruta" />
        <p aria-live="polite">
          {points.length === 0 && 'Toca el mapa para marcar la primera parada.'}
          {points.length === 1 && 'Bien. Toca el siguiente lugar por donde pasa la historia.'}
          {points.length >= 2 && `${points.length} paradas. Puedes añadir más o terminar.`}
        </p>
        <div className="actions-row">
          <button className="btn btn--ghost" onClick={() => addPoint(center())} disabled={points.length >= MAX_STOPS}>
            <Crosshair size={18} aria-hidden="true" /> Usar el centro
          </button>
          <button
            className="btn btn--ghost"
            disabled={points.length === 0}
            onClick={() => setFlow({ ...flow, points: points.slice(0, -1) })}
          >
            <Undo2 size={18} aria-hidden="true" /> Quitar última
          </button>
        </div>
        <div className="actions-row">
          <button
            className="btn btn--primary"
            onClick={() => {
              if (remaining > 0) return setError(`Una ruta necesita al menos 2 paradas. Falta ${remaining}.`);
              setError(undefined);
              setFlow({ ...flow, details: true });
            }}
          >
            Terminar ruta
          </button>
          <button className="btn btn--ghost" onClick={() => setFlow({ tool: 'none' })}>
            Cancelar
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const submit = () => {
    if (!title.trim()) return setError('Ponle un título a la ruta.');
    if (!places[0]?.trim()) return setError('Indica al menos el nombre de la primera parada.');
    if (body.trim().length < MIN_BODY) return setError(`Escribe al menos ${MIN_BODY} caracteres para abrir la historia.`);
    const stops = points.map((p, i) => ({
      ...p,
      place: places[i]?.trim() || `Parada ${i + 1}`,
      title: i === 0 ? 'Inicio' : 'Parada abierta',
    }));
    const id = actions.createStory({ title: title.trim(), genre, stops, firstBody: body.trim() });
    setFlow({ tool: 'none' });
    navigate(`/n/${id}`);
    toast(`Ruta publicada. ${stops.length - 1} paradas esperan autores.`);
  };

  return (
    <div className="panel">
      <PanelHeading title="Detalles de la ruta" />
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="field">
          <label htmlFor="route-title">Título de la historia</label>
          <input id="route-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <GenrePicker value={genre} onChange={setGenre} />
        {points.map((_, i) => (
          <div className="field" key={i}>
            <label htmlFor={`stop-${i}`}>Lugar de la parada {i + 1}{i > 0 && ' (opcional)'}</label>
            <input
              id={`stop-${i}`}
              value={places[i] ?? ''}
              onChange={(e) => {
                const next = [...places];
                next[i] = e.target.value;
                setPlaces(next);
              }}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="route-body">Cómo empieza, en la parada 1</label>
          <textarea id="route-body" className="serif" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="help">
            <span>Las demás paradas quedan abiertas para que otros las escriban, o tú después.</span>
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions-row">
          <button type="submit" className="btn btn--primary">
            Publicar ruta
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setFlow({ ...flow, details: false })}>
            Volver al mapa
          </button>
        </div>
      </form>
    </div>
  );
}
