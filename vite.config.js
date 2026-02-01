import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        study: './study.html',
        roleplay: './roleplay.html',
        account: './account.html',
        admin: './admin.html',
      }
    }
  },
  server: {
    middlewareMode: false,
  }
})
