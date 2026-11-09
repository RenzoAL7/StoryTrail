import type { AppState, Chapter, Story, StoryNode, User } from '../types';

// All stories and authors below are invented sample content for the prototype.
// They are not research data and must not be reported as such.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const users: User[] = [
  { id: 'me', name: 'Tú' },
  { id: 'u-mara', name: 'Mara Quispe' },
  { id: 'u-teo', name: 'Teo Salazar' },
  { id: 'u-ines', name: 'Inés Rojas' },
  { id: 'u-bruno', name: 'Bruno Huamán' },
  { id: 'u-sol', name: 'Sol Vargas' },
];

const stories: Story[] = [
  { id: 's-gato', title: 'El gato que sabía la hora', genre: 'ficcion', authorId: 'u-mara', readers: 38 },
  { id: 's-olivo', title: 'El olivo que responde', genre: 'leyenda', authorId: 'u-teo', readers: 21 },
  { id: 's-huaca', title: 'Domingos frente a la huaca', genre: 'recuerdo', authorId: 'u-ines', readers: 14 },
  { id: 's-agua', title: 'Lo que guarda el agua', genre: 'ficcion', authorId: 'u-bruno', readers: 9 },
  { id: 's-bote', title: 'El bote número siete', genre: 'recuerdo', authorId: 'u-sol', readers: 17 },
];

const nodes: StoryNode[] = [
  { id: 'n-kennedy', storyId: 's-gato', order: 0, title: 'La primera campanada', place: 'Parque Kennedy', district: 'Miraflores', lat: -12.1219, lng: -77.03, qr: 'ST-KEN1', conflictDemo: true },
  { id: 'n-amor', storyId: 's-gato', order: 1, title: 'El mensaje en la banca', place: 'Parque del Amor', district: 'Miraflores', lat: -12.1268, lng: -77.0369, qr: 'ST-AMO2' },
  { id: 'n-banos', storyId: 's-gato', order: 2, title: 'Escalones contados', place: 'Bajada de Baños', district: 'Barranco', lat: -12.1499, lng: -77.0241, qr: 'ST-BAN3' },
  { id: 'n-puente', storyId: 's-gato', order: 3, title: 'Parada abierta', place: 'Puente de los Suspiros', district: 'Barranco', lat: -12.1494, lng: -77.0222, qr: 'ST-PUE4' },
  { id: 'n-olivar', storyId: 's-olivo', order: 0, title: 'La pregunta en voz baja', place: 'Parque El Olivar', district: 'San Isidro', lat: -12.1024, lng: -77.0362, qr: 'ST-OLI5' },
  { id: 'n-huaca', storyId: 's-huaca', order: 0, title: 'El camino al colegio', place: 'Huaca Pucllana', district: 'Miraflores', lat: -12.1106, lng: -77.0336, qr: 'ST-HUA6' },
  { id: 'n-plaza', storyId: 's-agua', order: 0, title: 'La pileta seca', place: 'Plaza Mayor', district: 'Cercado de Lima', lat: -12.0464, lng: -77.03, qr: 'ST-PLA7' },
  { id: 'n-reserva', storyId: 's-agua', order: 1, title: 'Parada abierta', place: 'Parque de la Reserva', district: 'Cercado de Lima', lat: -12.07, lng: -77.034, qr: 'ST-RES8' },
  { id: 'n-expo', storyId: 's-bote', order: 0, title: 'Remar sin avanzar', place: 'Parque de la Exposición', district: 'Cercado de Lima', lat: -12.0617, lng: -77.0366, qr: 'ST-EXP9' },
];

function chapter(
  id: string,
  nodeId: string,
  parentId: string | null,
  authorId: string,
  ageHours: number,
  likes: number,
  body: string,
  now: number,
): Chapter {
  return { id, nodeId, parentId, authorId, kind: 'capitulo', body, createdAt: now - ageHours * HOUR, likes };
}

export function createSeed(): AppState {
  const now = Date.now();
  const chapters: Chapter[] = [
    chapter('c-1', 'n-kennedy', null, 'u-mara', 210, 24,
      'Todos en el parque conocían al gato gris, pero solo Rosa notó que se sentaba frente a la iglesia un minuto antes de cada campanada. Una tarde, el gato no miró a la torre. La miró a ella, y luego caminó hacia el mar.',
      now),
    chapter('c-2', 'n-amor', null, 'u-teo', 160, 15,
      'Rosa lo siguió hasta una banca de mosaicos. Bajo una pata del gato había un papel doblado, escrito con su propia letra: «Baja antes de que oscurezca. Cuenta los escalones».',
      now),
    chapter('c-3', 'n-banos', null, 'u-ines', 90, 12,
      'Eran setenta y uno. Siempre habían sido setenta. Rosa volvió a contarlos desde abajo y el escalón sobrante seguía ahí, húmedo, como recién puesto.',
      now),
    chapter('c-3b', 'n-banos', null, 'u-sol', 42, 7,
      'Contó sesenta y nueve. Faltaba uno, justo donde el gato se había detenido a esperarla. Rosa estiró el pie sobre el hueco que nadie más parecía ver.',
      now),
    chapter('c-4', 'n-olivar', null, 'u-teo', 300, 31,
      'Dicen que si le preguntas algo en voz baja al olivo más viejo, escuchas la respuesta esa misma noche, en boca de alguien que no sabe que te la está dando.',
      now),
    chapter('c-5', 'n-olivar', 'c-4', 'u-bruno', 120, 11,
      'Un vecino juraba haberlo probado. Preguntó si debía vender la casa, y esa noche el taxista, sin venir a cuento, le dijo: «Las paredes también extrañan».',
      now),
    chapter('c-6', 'n-huaca', null, 'u-ines', 72, 19,
      'De camino al colegio cruzábamos frente a la huaca y mi abuelo siempre bajaba la voz, como si alguien estuviera durmiendo adentro. Nunca le pregunté por qué. Todavía la bajo.',
      now),
    chapter('c-7', 'n-plaza', null, 'u-bruno', 48, 6,
      'La mañana en que la pileta amaneció seca, el fondo tenía escrita una dirección. Nadie la borró. Para el mediodía, media ciudad había decidido no ir a comprobarla.',
      now),
    chapter('c-8', 'n-expo', null, 'u-sol', 30, 9,
      'Mi papá alquilaba siempre el bote número siete y remaba en círculos para que la vuelta durara más. Yo creía que no sabía remar. Tardé veinte años en entenderlo.',
      now),
  ];

  return {
    users,
    stories,
    nodes,
    chapters,
    activity: [
      { id: 'a-1', text: 'Sol Vargas añadió otra versión en «Escalones contados».', href: '#/n/n-banos', createdAt: now - 42 * HOUR, read: false },
      { id: 'a-2', text: 'La ruta «Lo que guarda el agua» busca quien escriba su segunda parada.', href: '#/n/n-reserva', createdAt: now - 2 * DAY, read: false },
    ],
    drafts: {},
    choices: {},
    progress: {},
    liked: [],
    conflictDone: [],
    offline: false,
    tipDismissed: false,
  };
}

export const CONFLICT_REPLY =
  'Rosa todavía no se había decidido a seguirlo cuando una mujer se sentó a su lado y, sin mirarla, le preguntó si ella también había venido por el gato.';
export const CONFLICT_AUTHOR = 'u-sol';
