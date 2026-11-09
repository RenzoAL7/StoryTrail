export type Genre = 'ficcion' | 'leyenda' | 'recuerdo';
export type ChapterKind = 'capitulo' | 'foto';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
}

export interface Story {
  id: string;
  title: string;
  genre: Genre;
  authorId: string;
  /** Readers who finished the route, excluding the current user. */
  readers: number;
}

export interface StoryNode extends LatLng {
  id: string;
  storyId: string;
  order: number;
  title: string;
  place: string;
  district: string;
  qr: string;
  /** Usability-test scenario: another author publishes while the user writes. */
  conflictDemo?: boolean;
}

export interface Chapter {
  id: string;
  nodeId: string;
  parentId: string | null;
  authorId: string;
  kind: ChapterKind;
  body: string;
  photo?: string;
  createdAt: number;
  likes: number;
  pending?: boolean;
}

export interface Activity {
  id: string;
  text: string;
  href: string;
  createdAt: number;
  read: boolean;
}

export interface Draft {
  body: string;
  updatedAt: number;
}

export interface AppState {
  users: User[];
  stories: Story[];
  nodes: StoryNode[];
  chapters: Chapter[];
  activity: Activity[];
  drafts: Record<string, Draft>;
  /** Selected version at each fork, keyed by `${nodeId}:${parentId ?? 'root'}`. */
  choices: Record<string, string>;
  /** Visited node ids per story. */
  progress: Record<string, string[]>;
  liked: string[];
  conflictDone: string[];
  offline: boolean;
  tipDismissed: boolean;
}
