import { useEffect, useState } from 'react';
import { PanelHeading } from '../components/ui';
import { navigate, timeAgo } from '../lib/utils';
import { useStore } from '../state/store';

export function ActivityPanel() {
  const { state, actions } = useStore();
  // Snapshot unread ids on entry so the dots stay visible during this visit.
  const [unread] = useState(() => new Set(state.activity.filter((a) => !a.read).map((a) => a.id)));
  useEffect(() => {
    actions.markActivityRead();
  }, [actions, state.activity.length]);

  return (
    <div className="panel">
      <PanelHeading title="Actividad">
        <p className="muted">Lo que pasa en tus historias y rutas</p>
      </PanelHeading>
      {state.activity.length === 0 ? (
        <div className="empty">
          <p>Aún no hay novedades.</p>
        </div>
      ) : (
        <ul className="list">
          {state.activity.map((item) => (
            <li key={item.id}>
              <a className="row" href={item.href}>
                {unread.has(item.id) && <span className="dot" aria-label="Nuevo" />}
                <span className="row__main">
                  <span>{item.text}</span>
                  <span className="muted small">{timeAgo(item.createdAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProfilePanel() {
  const { state, actions, toast } = useStore();
  const mine = state.chapters.filter((c) => c.authorId === 'me');
  const drafts = Object.entries(state.drafts);
  const walked = Object.values(state.progress).reduce((sum, list) => sum + list.length, 0);
  const nodeOf = (id: string) => state.nodes.find((n) => n.id === id);

  return (
    <div className="panel">
      <PanelHeading title="Tu recorrido" />
      <dl className="stats">
        <div>
          <dt>Aportes</dt>
          <dd>{mine.length}</dd>
        </div>
        <div>
          <dt>Paradas leídas</dt>
          <dd>{walked}</dd>
        </div>
        <div>
          <dt>Borradores</dt>
          <dd>{drafts.length}</dd>
        </div>
      </dl>

      {drafts.length > 0 && (
        <>
          <h2 className="section-title">Borradores</h2>
          <ul className="list">
            {drafts.map(([nodeId, draft]) => (
              <li key={nodeId}>
                <a className="row" href={`#/n/${nodeId}/escribir`}>
                  <span className="row__main">
                    <strong>{nodeOf(nodeId)?.place ?? 'Lugar retirado'}</strong>
                    <span className="serif clamp">{draft.body}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      {mine.length > 0 && (
        <>
          <h2 className="section-title">Tus aportes</h2>
          <ul className="list">
            {mine.map((c) => (
              <li key={c.id}>
                <a className="row" href={`#/n/${c.nodeId}`}>
                  <span className="row__main">
                    <strong>{nodeOf(c.nodeId)?.place}</strong>
                    <span className="serif clamp">{c.body || 'Foto'}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Prototipo</h2>
      <label className="switch">
        <input type="checkbox" checked={state.offline} onChange={(e) => actions.setOffline(e.target.checked)} />
        Simular que no hay señal
      </label>
      <button
        className="btn btn--ghost btn--wide"
        onClick={() => {
          actions.reset();
          navigate('/');
          toast('Datos de ejemplo restaurados.');
        }}
      >
        Reiniciar para otra sesión de prueba
      </button>
      <p className="muted small">Todo se guarda solo en este navegador. No hay servidor ni cuentas.</p>
    </div>
  );
}
