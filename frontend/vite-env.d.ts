/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CERTIFICATE_REGISTRY_ADDRESS?: string;
  readonly VITE_CHAIN_RPC_URL?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
