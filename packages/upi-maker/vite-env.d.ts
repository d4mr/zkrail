/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THIRDWEB_CLIENT_ID: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}