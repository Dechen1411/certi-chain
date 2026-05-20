/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CERTIFICATE_REGISTRY_ADDRESS?: string;
  readonly VITE_CHAIN_RPC_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_CERTIFICATE_REGISTRY_DEPLOYMENT_BLOCK?: string;
  readonly VITE_EVENT_LOOKBACK_BLOCKS?: string;
  readonly VITE_EVENT_QUERY_CHUNK_BLOCKS?: string;
  readonly VITE_PRIVY_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
