/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Au-delà, la bande d'outils tient sur une seule ligne : il reste
        // assez de place pour écrire le libellé de chaque rayon sous sa
        // pastille, comme avant la compaction du bandeau.
        '3xl': '1900px',
      },
    },
  },
  plugins: [],
};
