/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_ASAAS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
