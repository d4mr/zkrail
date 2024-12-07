/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THIRDWWEB_CLIENT_ID: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}