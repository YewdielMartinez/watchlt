/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta neutra para eliminar azules y amarillos
        primary: '#1F2937',      // gris oscuro (glass, bordes)
        secondary: '#0B0D12',    // casi negro (fondos base)
        tertiary: '#FFFFFF',     // texto principal
        accent: '#9CA3AF'        // gris medio (resaltados sutiles)
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
