import { Search, X } from 'lucide-react';
import { GenreTag } from '../components/ui';
import { GENRES, ME_POSITION, distanceMeters, formatDistance } from '../lib/utils';
import { useStore } from '../state/store';
import type { Genre, StoryNode } from '../types';

interface Props {
  nodes: StoryNode[];
  query: string;
  genre: Genre | null;
  onQuery: (q: string) => void;
  onGenre: (g: Genre | null) => void;
}

export function ExplorePanel({ nodes, query, genre, onQuery, onGenre }: Props) {
  const { state, actions } = useStore();
  const sorted = [...nodes].sort((a, b) => distanceMeters(ME_POSITION, a) - distanceMeters(ME_POSITION, b));
  const openCount = nodes.filter((n) => !state.chapters.some((c) => c.nodeId === n.id)).length;

  return (
    <div className="panel">
      <header className="panel-head">
        <div className="panel-head__text">
          <h1>Historias cerca de ti</h1>
          <p className="muted" aria-live="polite">
            {nodes.length === 1 ? '1 lugar' : `${nodes.length} lugares`}
            {openCount > 0 && ` · ${openCount === 1 ? '1 parada abierta' : `${openCount} paradas abiertas`}`}
          </p>
        </div>
      </header>

      {!state.tipDismissed && (
        <div className="tip">
          <p>Toca un marcador para leer lo que pasó en ese lugar. El signo + indica una parada que espera autor.</p>
          <button className="icon-btn" onClick={actions.dismissTip} aria-label="Cerrar sugerencia">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Busca un lugar, distrito o historia"
          aria-label="Buscar historias"
        />
      </div>

      <div className="chips" role="group" aria-label="Filtrar por tipo">
        <button className={genre === null ? 'chip is-on' : 'chip'} aria-pressed={genre === null} onClick={() => onGenre(null)}>
          Todas
        </button>
        {(Object.keys(GENRES) as Genre[]).map((g) => (
          <button key={g} className={genre === g ? 'chip is-on' : 'chip'} aria-pressed={genre === g} onClick={() => onGenre(g)}>
            {GENRES[g].label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <p>No encontramos historias con ese filtro.</p>
          <button
            className="btn btn--ghost"
            onClick={() => {
              onQuery('');
              onGenre(null);
            }}
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <ul className="list">
          {sorted.map((node) => {
            const story = state.stories.find((s) => s.id === node.storyId);
            if (!story) return null;
            const open = !state.chapters.some((c) => c.nodeId === node.id);
            return (
              <li key={node.id}>
                <a className="row" href={`#/n/${node.id}`}>
                  <span className="row__main">
                    <strong>{node.place}</strong>
                    <span className="serif">{open ? 'Espera que alguien la escriba' : story.title}</span>
                  </span>
                  <span className="row__side">
                    <GenreTag genre={story.genre} />
                    <span className="muted small">{formatDistance(distanceMeters(ME_POSITION, node))}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">Distancias desde una ubicación simulada en Miraflores. Las historias son de ejemplo.</p>
    </div>
  );
}
