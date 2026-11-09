import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Trash2 } from 'lucide-react';
import { PanelHeading } from '../components/ui';
import { buildThread, childrenOf, compressImage, navigate } from '../lib/utils';
import { useStore } from '../state/store';
import type { Chapter } from '../types';

const MIN = 30;
const MAX = 1200;

export function EditorPanel({ nodeId, photoMode }: { nodeId: string; photoMode: boolean }) {
  const { state, actions, toast } = useStore();
  const node = state.nodes.find((n) => n.id === nodeId);
  const story = node && state.stories.find((s) => s.id === node.storyId);

  const [body, setBody] = useState(photoMode ? '' : state.drafts[nodeId]?.body ?? '');
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState<Chapter>();
  const restored = useRef(!photoMode && Boolean(state.drafts[nodeId]?.body));

  // The insertion point is fixed when writing starts, so a publication by someone
  // else is detected as a conflict instead of silently moving this text.
  const [parentId, setParentId] = useState<string | null>(() => {
    const thread = buildThread(state.chapters, nodeId, state.choices);
    return thread.length ? thread[thread.length - 1].chapter.id : null;
  });

  useEffect(() => {
    if (photoMode) return;
    const handle = window.setTimeout(() => actions.saveDraft(nodeId, body), 500);
    return () => window.clearTimeout(handle);
  }, [body, nodeId, photoMode, actions]);

  if (!node || !story) {
    return (
      <div className="panel">
        <PanelHeading title="Este lugar ya no existe" back="#/" />
      </div>
    );
  }

  const parent = state.chapters.find((c) => c.id === parentId);
  const parentAuthor = parent && state.users.find((u) => u.id === parent.authorId);
  const length = body.trim().length;

  const finish = (publishParent: string | null) => {
    const created = actions.publishChapter({ nodeId, parentId: publishParent, kind: photoMode ? 'foto' : 'capitulo', body: body.trim(), photo });
    navigate(`/n/${nodeId}`);
    toast(state.offline ? 'Guardado. Se publicará cuando vuelva la señal.' : 'Publicado en el mapa.', {
      actionLabel: 'Deshacer',
      action: () => {
        actions.removeChapter(created.id);
        actions.saveDraft(nodeId, created.body);
        toast('Publicación retirada. Tu texto sigue en borrador.');
      },
    });
  };

  const submit = () => {
    if (photoMode && !photo) return setError('Elige una foto para publicar.');
    if (!photoMode && length < MIN) return setError(`Escribe al menos ${MIN} caracteres. Te faltan ${MIN - length}.`);
    if (length > MAX) return setError(`Recorta el texto a ${MAX} caracteres.`);
    setError(undefined);
    if (node.conflictDemo && !state.conflictDone.includes(nodeId) && !state.offline) {
      return setConflict(actions.injectConflict(nodeId, parentId));
    }
    finish(parentId);
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
      setError(undefined);
    } catch {
      setError('No pudimos abrir esa imagen. Prueba con un JPG o PNG.');
    }
  };

  const others = childrenOf(state.chapters, nodeId, parentId).length;
  const conflictAuthor = conflict && state.users.find((u) => u.id === conflict.authorId);

  return (
    <div className="panel">
      <PanelHeading title={photoMode ? 'Añadir una foto' : 'Escribir aquí'} back={`#/n/${nodeId}`}>
        <p className="muted">
          {node.place} · {story.title}
        </p>
      </PanelHeading>

      <p className="role-note">Sigues en el mismo mapa. Al publicar, tu aporte queda anclado a este punto.</p>

      {parent && !conflict && (
        <div className="context">
          <p className="small muted">Continúas después de {parentAuthor?.name}:</p>
          <p className="serif">{parent.body}</p>
          {others > 0 && (
            <p className="small">
              Ya {others === 1 ? 'hay 1 continuación' : `hay ${others} continuaciones`} en este punto. La tuya se sumará como otra versión.
            </p>
          )}
        </div>
      )}

      {conflict ? (
        <div className="conflict" role="alertdialog" aria-labelledby="conflict-title">
          <h2 id="conflict-title">
            <AlertTriangle size={18} aria-hidden="true" /> {conflictAuthor?.name} publicó en este punto mientras escribías
          </h2>
          <p className="serif">{conflict.body}</p>
          <p className="small">Tu texto sigue intacto. No se ha publicado nada todavía.</p>
          <div className="stack">
            <button className="btn btn--primary" onClick={() => finish(parentId)}>
              Publicar como otra versión
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setParentId(conflict.id);
                setConflict(undefined);
              }}
            >
              Adaptar y seguir después de su capítulo
            </button>
          </div>
        </div>
      ) : (
        <form
          className="form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {photoMode && (
            <div className="field">
              {photo ? (
                <div className="photo-preview">
                  <img src={photo} alt="Vista previa de la foto elegida" />
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => setPhoto(undefined)}>
                    <Trash2 size={16} aria-hidden="true" /> Quitar
                  </button>
                </div>
              ) : (
                <label className="dropzone">
                  <ImagePlus size={24} aria-hidden="true" />
                  Elegir foto
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                </label>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="body">{photoMode ? 'Descripción de la foto (opcional)' : 'Tu parte de la historia'}</label>
            <textarea
              id="body"
              className="serif"
              rows={photoMode ? 3 : 9}
              value={body}
              maxLength={MAX + 100}
              aria-invalid={Boolean(error)}
              aria-describedby="body-help"
              onChange={(e) => setBody(e.target.value)}
              placeholder={photoMode ? 'Qué se ve y por qué importa aquí' : '¿Qué pasa en este lugar?'}
            />
            <p id="body-help" className="help">
              <span>{!photoMode && (restored.current ? 'Recuperamos tu borrador.' : body ? 'Borrador guardado en este dispositivo.' : '')}</span>
              <span className={length > MAX ? 'over' : ''}>
                {length} / {MAX}
              </span>
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn--primary btn--wide">
            {state.offline ? 'Guardar para enviar luego' : 'Publicar en el mapa'}
          </button>
        </form>
      )}
    </div>
  );
}
