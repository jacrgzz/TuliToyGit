// Textos y enlaces de la landing en un solo lugar. Diseño de Angel Cervantes; textos según la skill
// marca-tuli: solo lo que Tuli hace hoy, sin lenguaje clínico ni promesas (no hay tienda, juegos ni chat).

export type NavLink = { label: string; href: string };
export type NavColumn = { title: string; links: NavLink[] };

export const LEFT_COLUMNS: NavColumn[] = [
  {
    title: "Explora",
    links: [
      { label: "Inicio", href: "#inicio" },
      { label: "Qué es", href: "#que-es" },
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Preguntas", href: "#preguntas" },
    ],
  },
  {
    title: "Para quién",
    links: [
      { label: "Familias", href: "#familias" },
      { label: "Docentes", href: "#docentes" },
      { label: "Privacidad", href: "#privacidad" },
    ],
  },
];

export const RIGHT_COLUMN: NavColumn = {
  title: "Mi cuenta",
  links: [{ label: "Iniciar sesión", href: "/login" }],
};

export type Tile = { title: string; text: string; href: string; bg: string; ink: string; span: string };

// Orden = orden de la ola. Escritorio 4×3 (bento), teléfono 2×4. Colores con contraste AA para su texto.
export const TILES: Tile[] = [
  {
    title: "Conoce a Tuli",
    text: "Un juguete para apretar y una caja que mide el ambiente del salón.",
    href: "#que-es",
    bg: "#6341c4",
    ink: "#ffffff",
    span: "col-span-2 md:row-span-2",
  },
  { title: "Cómo funciona", text: "Juguete, caja y panel: tres pasos.", href: "#como-funciona", bg: "#ff8f3d", ink: "#3b1f5c", span: "" },
  {
    title: "Para familias",
    text: "Cómo le fue en el día, en lenguaje sencillo.",
    href: "#familias",
    bg: "#ffd9ec",
    ink: "#3b1f5c",
    span: "md:row-span-2",
  },
  { title: "Para docentes", text: "El ambiente del salón y lo que se repite.", href: "#docentes", bg: "#fbf8ff", ink: "#3b1f5c", span: "" },
  { title: "Privacidad", text: "No graba audio ni usa cámaras.", href: "#privacidad", bg: "#c9b1f5", ink: "#3b1f5c", span: "" },
  {
    title: "Entrar",
    text: "Si tu escuela ya usa Tuli, entra aquí.",
    href: "/login",
    bg: "#7652d6",
    ink: "#ffffff",
    span: "md:col-span-2",
  },
  { title: "Preguntas", text: "Lo que Tuli hace y lo que no.", href: "#preguntas", bg: "#ffe7d2", ink: "#3b1f5c", span: "" },
];

/** Secciones de abajo del grid: cada enlace "#id" de arriba debe existir aquí (lo revisa un test). */
export const SECTION_IDS = ["inicio", "que-es", "como-funciona", "familias", "docentes", "privacidad", "preguntas"] as const;

export const STEPS = [
  { title: "Juguete", text: "El niño lo presiona cuando lo necesita. Solo se guarda la hora de cada pulsación." },
  { title: "Caja del salón", text: "Mide ruido, luz, temperatura y humedad del espacio. No graba audio ni usa cámaras." },
  { title: "Panel", text: "Cruza ambos datos y muestra qué condiciones se repiten antes de cada momento." },
];

export const FOR_FAMILIES = [
  "Cómo le fue hoy, comparado con sus propios días. Nunca con otros niños.",
  "Su semana en una vista y preguntas para platicar con el docente.",
  "Usar el juguete no es algo malo: es una forma de regularse.",
];

export const FOR_TEACHERS = [
  "Cómo va el salón hoy: ruido, temperatura y luz frente a lo recomendado.",
  "Lo que se repite antes de los momentos de cada niño, con su nivel de evidencia.",
  "Una pantalla con semáforo de ruido para proyectar, sin datos de ningún niño.",
];

export const PRIVACY = [
  "La caja mide niveles (ruido, luz, temperatura y humedad). No graba audio ni usa cámaras.",
  "Una familia solo ve a su niño y un docente solo ve su salón.",
  "Los niños aparecen con alias o iniciales.",
];

export const FAQ = [
  {
    q: "¿Tuli diagnostica algo?",
    a: "No. Tuli no es un dispositivo médico. Muestra coincidencias entre el ambiente y los momentos en que se usa el juguete, y una coincidencia no es una causa.",
  },
  {
    q: "¿La caja graba lo que se dice en el salón?",
    a: "No. Solo mide qué tan alto es el ruido, además de la luz, la temperatura y la humedad.",
  },
  {
    q: "¿Quién ve los datos de mi niño?",
    a: "Tú y su docente. Una familia nunca ve a otros niños, y un docente solo ve su salón.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "La escuela da de alta el juguete y la caja, y vincula tu cuenta con tu niño. Después entras desde Iniciar sesión.",
  },
];
