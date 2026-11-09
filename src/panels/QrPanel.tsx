import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudOff, FlaskConical, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react';
import { PanelHeading } from '../components/ui';
import { ME_POSITION, distanceMeters, formatDistance, navigate, normalizeQr } from '../lib/utils';
import { useStore } from '../state/store';
import type { StoryNode } from '../types';

type Result =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'damaged' }
  | { kind: 'unknown'; code: string }
  | { kind: 'found'; node: StoryNode };

export function QrPanel({ initialCode, fromRoute }: { initialCode?: string; fromRoute?: string }) {
  const { state, actions, toast } = useStore();
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [code, setCode] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const resolve = (raw: string) => {
    const normalized = normalizeQr(raw);
    const node = state.nodes.find((n) => n.qr === normalized);
    setResult(node ? { kind: 'found', node } : { kind: 'unknown', code: raw.trim() });
  };

  const simulate = (next: () => void) => {
    setResult({ kind: 'reading' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, 700);
  };

  useEffect(() => {
    if (initialCode && !fromRoute) resolve(initialCode);
    return () => window.clearTimeout(timer.current);
    // Only the code present when the panel opens is auto-resolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const open = (node: StoryNode) => {
    actions.visit(node.storyId, node.id);
    navigate(fromRoute ? `/recorrer/${node.storyId}` : `/n/${node.id}`);
  };

  const nearby = [...state.nodes].sort((a, b) => distanceMeters(ME_POSITION, a) - distanceMeters(ME_POSITION, b)).slice(0, 3);
  const expected = initialCode ?? state.nodes[0]?.qr ?? 'ST-KEN1';

  return (
    <div className="panel">
      <PanelHeading title="Escanear un lugar" back={fromRoute ? `#/recorrer/${state.nodes.find((n) => n.qr === fromRoute)?.storyId ?? ''}` : undefined}>
        <p className="muted">Apunta al cartel de StoryTrail</p>
      </PanelHeading>

      <div className={`viewfinder is-${result.kind}`} aria-hidden="true">
        <span className="viewfinder__frame" />
        <ScanLine size={36} />
      </div>
      <p className="sr-only" aria-live="polite">
        {result.kind === 'reading' ? 'Leyendo código' : ''}
      </p>

      {result.kind === 'found' && (
        <section className="result result--ok">
          <h2>
            <CheckCircle2 size={18} aria-hidden="true" /> {result.node.place}
          </h2>
          <p className="serif">{state.stories.find((s) => s.id === result.node.storyId)?.title}</p>
          <p className="small trust">
            <ShieldCheck size={15} aria-hidden="true" /> Código registrado en StoryTrail. Solo abre esta historia, sin pedir datos ni descargas.
          </p>
          {state.offline && (
            <p className="notice">
              <CloudOff size={16} aria-hidden="true" /> Sin señal. Abrirás la copia guardada en tu teléfono.
            </p>
          )}
          <button className="btn btn--primary btn--wide" onClick={() => open(result.node)}>
            {fromRoute ? 'Confirmar llegada' : 'Abrir historia'}
          </button>
        </section>
      )}

      {result.kind === 'damaged' && (
        <section className="result result--bad" role="alert">
          <h2>
            <TriangleAlert size={18} aria-hidden="true" /> No pudimos leer el código
          </h2>
          <p>Puede estar dañado o con poca luz. Acércate, limpia la cámara o escribe el código impreso debajo del QR.</p>
          <button className="link-btn" onClick={() => toast('Gracias. Avisamos que este cartel necesita cambio.')}>
            Reportar cartel dañado
          </button>
        </section>
      )}

      {result.kind === 'unknown' && (
        <section className="result result--bad" role="alert">
          <h2>
            <TriangleAlert size={18} aria-hidden="true" /> «{result.code}» no es de StoryTrail
          </h2>
          <p>Revisa las letras del código. Por seguridad no abrimos enlaces externos. ¿Estás en alguno de estos lugares?</p>
          <ul className="list list--tight">
            {nearby.map((n) => (
              <li key={n.id}>
                <a className="row" href={`#/n/${n.id}`}>
                  <span className="row__main">
                    <strong>{n.place}</strong>
                  </span>
                  <span className="muted small">{formatDistance(distanceMeters(ME_POSITION, n))}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="code-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) simulate(() => resolve(code));
        }}
      >
        <label htmlFor="qr-code">¿No escanea? Escribe el código</label>
        <div className="code-form__row">
          <input id="qr-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ST-KEN1" autoCapitalize="characters" autoComplete="off" />
          <button className="btn btn--primary" type="submit">
            Buscar
          </button>
        </div>
      </form>

      <details className="test-panel" open>
        <summary>
          <FlaskConical size={15} aria-hidden="true" /> Simular escaneo para pruebas
        </summary>
        <p className="small muted">La cámara está simulada para que todas las personas prueben las mismas situaciones.</p>
        <div className="chips">
          <button className="chip" onClick={() => simulate(() => resolve(expected))}>
            QR correcto
          </button>
          <button className="chip" onClick={() => simulate(() => setResult({ kind: 'damaged' }))}>
            QR dañado
          </button>
          <button className="chip" onClick={() => simulate(() => resolve('http://promo-gratis.example'))}>
            QR ajeno
          </button>
          <button className={state.offline ? 'chip is-on' : 'chip'} aria-pressed={state.offline} onClick={() => actions.setOffline(!state.offline)}>
            Sin señal
          </button>
        </div>
      </details>
    </div>
  );
}
