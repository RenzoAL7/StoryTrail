import { Check, Footprints, PenLine, QrCode, RotateCcw } from 'lucide-react';
import { GenreTag, PanelHeading } from '../components/ui';
import { buildThread, distanceMeters, formatDistance, ME_POSITION } from '../lib/utils';
import { useStore } from '../state/store';

export function RoutesPanel() {
  const { state } = useStore();
  const routes = state.stories
    .map((story) => ({ story, stops: state.nodes.filter((n) => n.storyId === story.id).sort((a, b) => a.order - b.order) }))
    .filter((r) => r.stops.length > 1);

  return (
    <div className="panel">
      <PanelHeading title="Rutas narrativas">
        <p className="muted">Historias que continúan de un lugar a otro</p>
      </PanelHeading>
      <ul className="list">
        {routes.map(({ story, stops }) => {
          const visited = state.progress[story.id]?.length ?? 0;
          let length = 0;
          stops.slice(1).forEach((stop, i) => (length += distanceMeters(stops[i], stop)));
          return (
            <li key={story.id}>
              <a className="row" href={`#/recorrer/${story.id}`}>
                <span className="row__main">
                  <strong className="serif route-title">{story.title}</strong>
                  <span className="small muted">
                    {stops[0].place} → {stops[stops.length - 1].place}
                  </span>
                  <span className="small">
                    {stops.length} paradas · {formatDistance(length)}
                    {visited > 0 && ` · vas en ${visited}/${stops.length}`}
                  </span>
                </span>
                <span className="row__side">
                  <GenreTag genre={story.genre} />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WalkPanel({ storyId }: { storyId: string }) {
  const { state, actions, toast } = useStore();
  const story = state.stories.find((s) => s.id === storyId);
  if (!story) {
    return (
      <div className="panel">
        <PanelHeading title="Esta ruta ya no existe" back="#/rutas" />
      </div>
    );
  }

  const stops = state.nodes.filter((n) => n.storyId === story.id).sort((a, b) => a.order - b.order);
  const visited = state.progress[story.id] ?? [];
  const current = stops.find((n) => !visited.includes(n.id));
  const lastId = visited[visited.length - 1];
  const last = stops.find((n) => n.id === lastId);
  const lastThread = last ? buildThread(state.chapters, last.id, state.choices) : [];
  const from = last ?? ME_POSITION;
  const done = !current;
  const finishers = story.readers + (done ? 1 : 0);

  const arrive = (remote: boolean) => {
    if (!current) return;
    actions.visit(story.id, current.id);
    if (remote) toast('Leído a distancia. La parada queda marcada en tu ruta.');
  };

  return (
    <div className="panel">
      <PanelHeading title={story.title} back="#/rutas">
        <p className="muted">{finishers} personas recorrieron esta ruta</p>
      </PanelHeading>

      <ol className="progress" aria-label={`Progreso: ${visited.length} de ${stops.length} paradas`}>
        {stops.map((stop, i) => {
          const isDone = visited.includes(stop.id);
          const isCurrent = stop.id === current?.id;
          return (
            <li key={stop.id} className={isDone ? 'is-done' : isCurrent ? 'is-current' : ''}>
              <a href={`#/n/${stop.id}`} aria-label={`${stop.place}${isDone ? ', leída' : isCurrent ? ', siguiente' : ''}`}>
                {isDone ? <Check size={14} aria-hidden="true" /> : i + 1}
              </a>
            </li>
          );
        })}
      </ol>

      {last && (
        <section className="reading" aria-live="polite">
          <p className="small muted">Llegaste a {last.place}</p>
          {lastThread.length === 0 ? (
            <div className="empty empty--open">
              <p>Nadie ha escrito esta parada todavía.</p>
              <a className="btn btn--primary" href={`#/n/${last.id}/escribir`}>
                <PenLine size={18} aria-hidden="true" /> Escribirla tú
              </a>
            </div>
          ) : (
            <>
              {lastThread.map(({ chapter }) => (
                <p key={chapter.id} className="serif chapter__body">
                  {chapter.body}
                </p>
              ))}
              <a className="link-btn" href={`#/n/${last.id}`}>
                Ver versiones y autores
              </a>
            </>
          )}
        </section>
      )}

      {current ? (
        <section className="next-stop">
          <p className="small muted">{last ? 'Siguiente parada' : 'Empieza en'}</p>
          <h2>{current.place}</h2>
          <p className="muted small">A {formatDistance(distanceMeters(from, current))} · el texto se abre al llegar</p>
          <div className="stack">
            <button className="btn btn--primary" onClick={() => arrive(false)}>
              <Footprints size={18} aria-hidden="true" /> Ya llegué (GPS simulado)
            </button>
            <a className="btn btn--ghost" href={`#/qr/ruta/${current.qr}`}>
              <QrCode size={18} aria-hidden="true" /> Confirmar con QR
            </a>
            <button className="link-btn" onClick={() => arrive(true)}>
              No puedo ir, leer desde aquí
            </button>
          </div>
        </section>
      ) : (
        <section className="next-stop">
          <h2>Terminaste esta ruta</h2>
          <p>La historia todavía puede crecer. Añade la parada que falta o vuelve a recorrerla.</p>
          <div className="stack">
            <a className="btn btn--primary" href={`#/n/${stops[stops.length - 1].id}`}>
              <PenLine size={18} aria-hidden="true" /> Continuar la historia
            </a>
            <button className="btn btn--ghost" onClick={() => actions.restartRoute(story.id)}>
              <RotateCcw size={18} aria-hidden="true" /> Recorrer de nuevo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
