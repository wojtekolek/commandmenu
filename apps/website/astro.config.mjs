import react from "@astrojs/react"
import tailwind from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
  server: {
    port: 3500,
  },
  vite: {
    plugins: [tailwind()],
  },
  integrations: [react()],
})
