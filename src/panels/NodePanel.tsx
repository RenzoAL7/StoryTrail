import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Camera, ChevronLeft, ChevronRight, CloudOff, Footprints, Heart, MapPinPlus, PenLine, QrCode } from 'lucide-react';
import { Avatar, GenreTag, PanelHeading } from '../components/ui';
import { buildThread, navigate, timeAgo } from '../lib/utils';
import { useStore } from '../state/store';

export function NodePanel({ id, onAddPlace }: { id: string; onAddPlace: (storyId: string) => void }) {
  const { state, actions } = useStore();
  const [poster, setPoster] = useState(false);
  const node = state.nodes.find((n) => n.id === id);
  const story = node && state.stories.find((s) => s.id === node.storyId);

  if (!node || !story) {
    return (
      <div className="panel">
        <PanelHeading title="Este lugar ya no existe" back="#/" />
        <p>Puede haber sido retirado por su autor. Vuelve al mapa para explorar otros.</p>
      </div>
    );
  }

  const thread = buildThread(state.chapters, node.id, state.choices);
  const stops = state.nodes.filter((n) => n.storyId === story.id).sort((a, b) => a.order - b.order);
  const position = stops.findIndex((n) => n.id === node.id);
  const prev = stops[position - 1];
  const next = stops[position + 1];
  const authors = new Set(
    state.chapters.filter((c) => stops.some((s) => s.id === c.nodeId)).map((c) => c.authorId),
  );
  const open = thread.length === 0;

  return (
    <div className="panel">
      <PanelHeading title={open ? node.place : story.title} back="#/">
        <p className="muted">
          {open ? story.title : node.place}
          {node.district && ` · ${node.district}`}
        </p>
      </PanelHeading>

      <div className="meta-row">
        <GenreTag genre={story.genre} />
        <span className="muted small">
          {authors.size === 1 ? '1 autor' : `${authors.size} autores`} · {story.readers} recorridos
        </span>
      </div>

      {stops.length > 1 && (
        <nav className="stops" aria-label="Paradas de la ruta">
          {prev ? (
            <a className="icon-btn" href={`#/n/${prev.id}`} aria-label={`Parada anterior: ${prev.place}`}>
              <ChevronLeft size={20} aria-hidden="true" />
            </a>
          ) : (
            <span className="icon-btn is-disabled" aria-hidden="true">
              <ChevronLeft size={20} />
            </span>
          )}
          <span className="stops__label">
            Parada {position + 1} de {stops.length}
          </span>
          {next ? (
            <a className="icon-btn" href={`#/n/${next.id}`} aria-label={`Parada siguiente: ${next.place}`}>
              <ChevronRight size={20} aria-hidden="true" />
            </a>
          ) : (
            <span className="icon-btn is-disabled" aria-hidden="true">
              <ChevronRight size={20} />
            </span>
          )}
          <a className="btn btn--small btn--ghost" href={`#/recorrer/${story.id}`}>
            <Footprints size={16} aria-hidden="true" /> Recorrer
          </a>
        </nav>
      )}

      {open ? (
        <div className="empty empty--open">
          <h2>Esta parada espera su historia</h2>
          <p>
            La ruta llega hasta aquí y nadie la ha escrito. Puedes empezar leyendo la parada anterior o escribir directamente.
          </p>
        </div>
      ) : (
        <div className="thread">
          {!open && <h2 className="scene">{node.title}</h2>}
          {thread.map(({ chapter, siblings, index, forkKey }) => {
            const author = state.users.find((u) => u.id === chapter.authorId);
            const liked = state.liked.includes(chapter.id);
            return (
              <article key={chapter.id} className="chapter">
                {siblings.length > 1 && (
                  <div className="versions">
                    <span>
                      Versión {index + 1} de {siblings.length}
                    </span>
                    <button
                      className="icon-btn"
                      disabled={index === 0}
                      aria-label="Versión anterior"
                      onClick={() => actions.setChoice(forkKey, siblings[index - 1].id)}
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={index === siblings.length - 1}
                      aria-label="Versión siguiente"
                      onClick={() => actions.setChoice(forkKey, siblings[index + 1].id)}
                    >
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {chapter.photo && <img className="chapter__photo" src={chapter.photo} alt={chapter.body || 'Foto del lugar aportada por un autor'} />}
                {chapter.body && <p className="serif chapter__body">{chapter.body}</p>}
                <footer className="chapter__foot">
                  <Avatar user={author} />
                  <span className="small">
                    {author?.name} · {timeAgo(chapter.createdAt)}
                    {chapter.pending && <em className="pending"> · Pendiente de enviar</em>}
                  </span>
                  <button
                    className={liked ? 'like is-on' : 'like'}
                    aria-pressed={liked}
                    aria-label={`Me gusta, ${chapter.likes}`}
                    onClick={() => actions.toggleLike(chapter.id)}
                  >
                    <Heart size={16} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} /> {chapter.likes}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {state.offline && (
        <p className="notice">
          <CloudOff size={16} aria-hidden="true" /> Sin señal. Esta es una copia guardada y lo que escribas se enviará al volver la conexión.
        </p>
      )}

      <div className="actions-sticky">
        <button className="btn btn--primary" onClick={() => navigate(`/n/${node.id}/escribir`)}>
          <PenLine size={18} aria-hidden="true" /> {open ? 'Escribir esta parada' : 'Continuar aquí'}
        </button>
        <button className="btn btn--ghost" onClick={() => navigate(`/n/${node.id}/escribir/foto`)}>
          <Camera size={18} aria-hidden="true" /> Foto
        </button>
        <button className="btn btn--ghost" onClick={() => onAddPlace(story.id)}>
          <MapPinPlus size={18} aria-hidden="true" /> Otro lugar
        </button>
      </div>

      <button className="link-btn" onClick={() => setPoster(true)}>
        <QrCode size={16} aria-hidden="true" /> Ver cartel QR de este lugar
      </button>

      {poster && <QrPoster place={node.place} story={story.title} code={node.qr} onClose={() => setPoster(false)} />}
    </div>
  );
}

function QrPoster(props: { place: string; story: string; code: string; onClose: () => void }) {
  const { place, story, code, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState('');

  useEffect(() => {
    dialog.current?.showModal();
    const url = `${window.location.origin}${window.location.pathname}#/q/${code}`;
    QRCode.toDataURL(url, { width: 520, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#20282B', light: '#FFFFFF' } }).then(setSrc);
  }, [code]);

  return (
    <dialog ref={dialog} className="poster" onClose={onClose}>
      <p className="poster__brand">StoryTrail</p>
      <h2>{place}</h2>
      <p className="serif">Aquí ocurre una escena de «{story}»</p>
      {src && <img src={src} alt={`Código QR de ${place}`} />}
      <p className="poster__code">
        Si no escanea, ingresa <strong>{code}</strong>
      </p>
      <p className="small muted">Solo abre la historia. No pide datos ni descargas.</p>
      <div className="poster__actions">
        <button className="btn btn--ghost" onClick={() => dialog.current?.close()}>
          Cerrar
        </button>
        <button className="btn btn--primary" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
    </dialog>
  );
}
