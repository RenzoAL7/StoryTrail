import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Feather, Heart, Moon } from 'lucide-react';
import { GENRES } from '../lib/utils';
import type { Genre, User } from '../types';

const GENRE_ICON = { ficcion: Feather, leyenda: Moon, recuerdo: Heart };

export function GenreTag({ genre }: { genre: Genre }) {
  const Icon = GENRE_ICON[genre];
  return (
    <span className={`tag tag--${genre}`}>
      <Icon size={13} aria-hidden="true" />
      {GENRES[genre].label}
    </span>
  );
}

export function Avatar({ user }: { user?: User }) {
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span className={user?.id === 'me' ? 'avatar avatar--me' : 'avatar'} aria-hidden="true">
      {initials}
    </span>
  );
}

export function PanelHeading({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <header className="panel-head">
      {back && (
        <a className="icon-btn" href={back} aria-label="Volver">
          <ArrowLeft size={20} aria-hidden="true" />
        </a>
      )}
      <div className="panel-head__text">
        <h1 ref={ref} tabIndex={-1}>
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}

export function GenrePicker({ value, onChange }: { value: Genre; onChange: (g: Genre) => void }) {
  return (
    <fieldset className="field">
      <legend>Tipo de historia</legend>
      <div className="chips">
        {(Object.keys(GENRES) as Genre[]).map((g) => (
          <label key={g} className={value === g ? 'chip is-on' : 'chip'}>
            <input type="radio" name="genre" className="sr-only" checked={value === g} onChange={() => onChange(g)} />
            {GENRES[g].label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
