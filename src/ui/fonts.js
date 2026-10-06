const FONT_BASE_URL = new URL(
  `${import.meta.env.BASE_URL}fonts/`,
  window.location.href,
);

const definitions = [
  {
    family: 'Fraunces Variable',
    file: 'fraunces-latin-full-normal.woff2',
    descriptors: { style: 'normal', weight: '100 900' },
  },
  {
    family: 'Plus Jakarta Sans Variable',
    file: 'plus-jakarta-sans-latin-wght-normal.woff2',
    descriptors: { style: 'normal', weight: '200 800' },
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-400-normal.woff2',
    descriptors: { style: 'normal', weight: '400' },
  },
  {
    family: 'IBM Plex Mono',
    file: 'ibm-plex-mono-latin-600-normal.woff2',
    descriptors: { style: 'normal', weight: '600' },
  },
];

export function loadLocalFonts() {
  if (!('FontFace' in window) || !document.fonts) return Promise.resolve([]);

  const loads = definitions.map(({ family, file, descriptors }) => {
    const url = new URL(file, FONT_BASE_URL).href;
    const face = new FontFace(family, `url("${url}") format("woff2")`, descriptors);
    document.fonts.add(face);
    return face.load();
  });

  return Promise.allSettled(loads);
}
