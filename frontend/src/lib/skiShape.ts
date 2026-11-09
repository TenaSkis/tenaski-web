// lib/skiShape.ts
//
// Geometría optimizada y altamente realista para el editor "Crea tu diseño".
// Representa la silueta exacta y proporcionada de un esquí moderno de freeride/all-mountain
// con un sidecut parabólico fluido, espátula progresiva y cola redondeada.

export const CANVAS_WIDTH = 220
export const CANVAS_HEIGHT = 900

// Perfil de esquí hiperrealista con sidecut parabólico:
// - Espátula (Nose) aerodinámica y progresiva en la parte superior.
// - Hombro superior ancho para flotabilidad.
// - Línea de cotas (Sidecut) continua decreciente hacia una cintura estilizada en el centro.
// - Transición fluida hacia una cola (Tail) moderadamente ancha y perfectamente rematada.
export const SKI_PATH =
  'M110,20 ' +
  'C126,20 156,32 161,65 ' +   // Espátula (Nose) redondeada y aerodinámica tipo Movement Vertex
  'C163,85 160,180 156,280 ' +  // Descenso muy gradual y recto propio de un esquí de travesía
  'C150,400 144,460 144,520 ' + // Cintura central más ancha (X=144, ancho=68px) y muy progresiva
  'C144,580 149,660 152,740 ' + // Línea de cotas posterior muy suave hacia la cola
  'C154,800 155,855 154,870 ' + // Hombro inferior de la cola (Casi recto con el canto)
  'C153,880 135,885 110,885 ' + // Cola plana con esquinas sutilmente redondeadas (Flat/Square Tail)
  'C85,885 67,880 66,870 ' +    // Simetría izquierda: Cola plana
  'C65,855 66,800 68,740 ' +    // Simetría izquierda: Hombro inferior de la cola
  'C71,660 76,580 76,520 ' +    // Simetría izquierda: Cintura central (X=76, ancho total = 68px)
  'C76,460 70,400 64,280 ' +    // Simetría izquierda: Línea recta superior
  'C60,180 57,85 59,65 ' +      // Simetría izquierda: Hombro de la espátula
  'C61,32 94,20 110,20 Z'      // Cierre perfecto en la punta de la espátula

export type Zone = { x: number; y: number; width: number; height: number }

// Zonas de trabajo adaptadas a la nueva geometría estilizada del esquí
export const NOSE_ZONE: Zone = { x: 58, y: 60, width: 104, height: 220 }
export const TAIL_ZONE: Zone = { x: 60, y: 620, width: 104, height: 220 }

// Tamaño base (a escala 1) de cualquier imagen/logo colocado por el usuario
export const LOGO_BASE_SIZE = 60

// Tamaño base (a escala 1) de cualquier texto colocado por el usuario
export const TEXT_BASE_FONT_SIZE = 24

// Color base del esquí — tono madera premium/crema texturizado
export const SKI_BASE_COLOR = '#e8ded0'

// Logo de marca que se muestra sobre la espátula al elegir un acabado
export const BRAND_LOGO_URL = '/img/logoo.webp'
export const BRAND_LOGO_X = 110   // centro horizontal (ajústalo)
export const BRAND_LOGO_Y = 110   // posición vertical, encima del nose
export const BRAND_LOGO_SIZE = 60 // tamaño en px dentro del canvas