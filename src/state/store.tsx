import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CONFLICT_AUTHOR, CONFLICT_REPLY, createSeed } from '../data/seed';
import { forkKey, newQrCode, uid } from '../lib/utils';
import type { Activity, AppState, Chapter, ChapterKind, Genre, LatLng, StoryNode } from '../types';

const STORAGE_KEY = 'storytrail.v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // Storage can be blocked or corrupted; the prototype still runs from the seed.
  }
  return createSeed();
}

export interface Toast {
  id: string;
  message: string;
  tone: 'ok' | 'error';
  actionLabel?: string;
  action?: () => void;
}

export interface NewStop extends LatLng {
  place: string;
  title: string;
  body?: string;
}

interface PublishInput {
  nodeId: string;
  parentId: string | null;
  kind: ChapterKind;
  body: string;
  photo?: string;
}

function createNode(storyId: string, order: number, stop: NewStop): StoryNode {
  return {
    id: uid('n'),
    storyId,
    order,
    title: stop.title,
    place: stop.place,
    district: '',
    lat: stop.lat,
    lng: stop.lng,
    qr: newQrCode(),
  };
}

function firstChapter(nodeId: string, body: string): Chapter {
  return {
    id: uid('c'),
    nodeId,
    parentId: null,
    authorId: 'me',
    kind: 'capitulo',
    body,
    createdAt: Date.now(),
    likes: 0,
  };
}

function useStoreValue() {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded (large photos): keep working in memory.
    }
  }, [state]);

  const dismissToast = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: Partial<Pick<Toast, 'tone' | 'actionLabel' | 'action'>>) => {
      const id = uid('t');
      setToasts((list) => [...list.slice(-1), { id, message, tone: 'ok', ...options }]);
      window.setTimeout(() => dismissToast(id), options?.action ? 7000 : 4000);
    },
    [dismissToast],
  );

  const actions = useMemo(() => {
    const addActivity = (text: string, href: string) => {
      const item: Activity = { id: uid('a'), text, href, createdAt: Date.now(), read: false };
      setState((s) => ({ ...s, activity: [item, ...s.activity] }));
    };

    return {
      publishChapter(input: PublishInput): Chapter {
        const offline = stateRef.current.offline;
        const created: Chapter = {
          id: uid('c'),
          authorId: 'me',
          createdAt: Date.now(),
          likes: 0,
          pending: offline || undefined,
          ...input,
        };
        setState((s) => {
          const drafts = { ...s.drafts };
          delete drafts[input.nodeId];
          return {
            ...s,
            drafts,
            chapters: [...s.chapters, created],
            choices: { ...s.choices, [forkKey(input.nodeId, input.parentId)]: created.id },
          };
        });
        if (!offline) {
          const node = stateRef.current.nodes.find((n) => n.id === input.nodeId);
          window.setTimeout(() => {
            addActivity(`Mara Quispe leyó tu aporte en «${node?.place ?? 'este lugar'}».`, `#/n/${input.nodeId}`);
          }, 9000);
        }
        return created;
      },
      removeChapter(id: string) {
        setState((s) => ({ ...s, chapters: s.chapters.filter((c) => c.id !== id) }));
      },
      /** Simulates another author publishing on the same point while the user writes. */
      injectConflict(nodeId: string, parentId: string | null): Chapter {
        const theirs: Chapter = {
          id: uid('c'),
          nodeId,
          parentId,
          authorId: CONFLICT_AUTHOR,
          kind: 'capitulo',
          body: CONFLICT_REPLY,
          createdAt: Date.now(),
          likes: 0,
        };
        setState((s) => ({
          ...s,
          chapters: [...s.chapters, theirs],
          conflictDone: [...s.conflictDone, nodeId],
        }));
        return theirs;
      },
      setChoice(key: string, chapterId: string) {
        setState((s) => ({ ...s, choices: { ...s.choices, [key]: chapterId } }));
      },
      toggleLike(chapterId: string) {
        setState((s) => {
          const liked = s.liked.includes(chapterId);
          return {
            ...s,
            liked: liked ? s.liked.filter((id) => id !== chapterId) : [...s.liked, chapterId],
            chapters: s.chapters.map((c) =>
              c.id === chapterId ? { ...c, likes: c.likes + (liked ? -1 : 1) } : c,
            ),
          };
        });
      },
      saveDraft(nodeId: string, body: string) {
        setState((s) => {
          const drafts = { ...s.drafts };
          if (body.trim()) drafts[nodeId] = { body, updatedAt: Date.now() };
          else delete drafts[nodeId];
          return { ...s, drafts };
        });
      },
      createStory(input: { title: string; genre: Genre; stops: NewStop[]; firstBody: string }): string {
        const storyId = uid('s');
        const nodes = input.stops.map((stop, order) => createNode(storyId, order, stop));
        const chapter = firstChapter(nodes[0].id, input.firstBody);
        setState((s) => ({
          ...s,
          stories: [...s.stories, { id: storyId, title: input.title, genre: input.genre, authorId: 'me', readers: 0 }],
          nodes: [...s.nodes, ...nodes],
          chapters: [...s.chapters, chapter],
        }));
        return nodes[0].id;
      },
      removeStory(storyId: string) {
        setState((s) => {
          const ids = new Set(s.nodes.filter((n) => n.storyId === storyId).map((n) => n.id));
          return {
            ...s,
            stories: s.stories.filter((st) => st.id !== storyId),
            nodes: s.nodes.filter((n) => n.storyId !== storyId),
            chapters: s.chapters.filter((c) => !ids.has(c.nodeId)),
          };
        });
      },
      addStop(storyId: string, stop: NewStop): string {
        const order = stateRef.current.nodes.filter((n) => n.storyId === storyId).length;
        const node = createNode(storyId, order, stop);
        const chapter = stop.body ? firstChapter(node.id, stop.body) : null;
        setState((s) => ({
          ...s,
          nodes: [...s.nodes, node],
          chapters: chapter ? [...s.chapters, chapter] : s.chapters,
        }));
        return node.id;
      },
      removeNode(nodeId: string) {
        setState((s) => ({
          ...s,
          nodes: s.nodes.filter((n) => n.id !== nodeId),
          chapters: s.chapters.filter((c) => c.nodeId !== nodeId),
        }));
      },
      visit(storyId: string, nodeId: string) {
        setState((s) => {
          const visited = s.progress[storyId] ?? [];
          if (visited.includes(nodeId)) return s;
          return { ...s, progress: { ...s.progress, [storyId]: [...visited, nodeId] } };
        });
      },
      restartRoute(storyId: string) {
        setState((s) => ({ ...s, progress: { ...s.progress, [storyId]: [] } }));
      },
      setOffline(offline: boolean) {
        const pending = stateRef.current.chapters.filter((c) => c.pending).length;
        setState((s) => ({
          ...s,
          offline,
          chapters: offline ? s.chapters : s.chapters.map((c) => (c.pending ? { ...c, pending: undefined } : c)),
        }));
        if (!offline && pending > 0) {
          toast(pending === 1 ? 'Volvió la señal. Tu aporte ya se publicó.' : `Volvió la señal. Se publicaron ${pending} aportes.`);
        }
      },
      markActivityRead() {
        setState((s) => ({ ...s, activity: s.activity.map((a) => ({ ...a, read: true })) }));
      },
      dismissTip() {
        setState((s) => ({ ...s, tipDismissed: true }));
      },
      reset() {
        setState(createSeed());
      },
    };
  }, [toast]);

  return { state, actions, toasts, toast, dismissToast };
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
