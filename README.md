# StoryTrail-HCI

Prototipo front-end de una plataforma de historias colaborativas ancladas a lugares reales de Lima. Es parte del proyecto final del curso Interacción Humano-Computador (Proyecto C: Plataforma de Narración Colaborativa y Espacial), Grupo 1.

Abres el mapa, eliges un lugar, lees lo que ocurrió allí y aportas un capítulo, una foto o una nueva parada. Las historias pueden continuar de un lugar a otro y formar rutas narrativas.

> Este repositorio contiene solo el front. No hay backend ni cuentas: los datos son simulados y se guardan en el navegador.

## Funcionalidades

- **Mapa como interfaz principal:** modos Leer y Crear sobre el mismo mapa, buscador, filtros y lista alternativa al mapa.
- **Lectura y colaboración:** capítulos, fotos, versiones, atribución y borradores guardados automáticamente.
- **Creación espacial:** anclar nodos y dibujar rutas, con paradas abiertas para autores nuevos.
- **Recorrido de rutas:** progreso por paradas, llegada simulada y opción de leer sin ir al lugar.
- **QR con tolerancia a fallos:** código correcto, dañado o ajeno, ingreso manual, modo sin señal y cartel imprimible.

## Cómo ejecutarlo

Requiere Node.js 22 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que muestra la terminal, normalmente <http://localhost:5173/>.

Para generar la versión de producción:

```bash
npm run build
```

## Escenarios para pruebas de usabilidad

| Escenario | Cómo reproducirlo |
| --- | --- |
| Conflicto entre autores | Abre Parque Kennedy, elige **Continuar aquí** y publica. Otra autora simulada publica primero, una sola vez por sesión. |
| Paradas abiertas | Abre Puente de los Suspiros o Parque de la Reserva, marcados con **+**. |
| Versiones de una historia | Abre Bajada de Baños y cambia entre sus dos versiones. |
| Fallos de QR | En **Escanear**, usa los botones de simulación: QR correcto, dañado, ajeno o sin señal. |
| Código manual | En **Escanear**, escribe un código como `ST-KEN1`, `ST-AMO2` o `ST-OLI5`. |
| Sin señal | Actívalo en **Escanear** o en **Tú**. Lo que publiques queda pendiente hasta desactivarlo. |

Entre participantes, ve a **Tú** y usa **Reiniciar para otra sesión de prueba**.

## Tecnologías

React, TypeScript, Vite, Leaflet con mapas de OpenStreetMap y `qrcode` para generar los carteles.

## Estructura

```text
src/
├── components/   Mapa y componentes compartidos
├── data/         Historias y autores de ejemplo
├── lib/          Versiones, distancias y navegación
├── panels/       Pantallas de la aplicación
├── state/        Estado y persistencia en el navegador
├── App.tsx       Composición general y rutas
└── styles.css    Sistema visual
```

## Limitaciones

- La cámara QR y el GPS están simulados.
- Las historias y autores son contenido de ejemplo. No son datos de investigación.
- Las coordenadas son aproximadas y las rutas se dibujan en línea recta entre paradas.
- Los mapas de OpenStreetMap se usan para pruebas. Un despliegue con tráfico real necesitaría otro proveedor.

## Uso de IA generativa

El código inicial del prototipo se generó con asistencia de Claude (Anthropic). El uso de IA se declara también en la metodología del informe del proyecto.
