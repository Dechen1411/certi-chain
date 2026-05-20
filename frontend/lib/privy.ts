export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID?.trim() || "";
export const isPrivyConfigured = PRIVY_APP_ID.length > 0;
