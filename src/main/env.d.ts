/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_STRIPE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
