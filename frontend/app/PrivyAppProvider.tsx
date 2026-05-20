import { ReactNode } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { PRIVY_APP_ID } from "../lib/privy";

const privyConfig: PrivyClientConfig = {
  appearance: {
    accentColor: "#0f172a",
    showWalletLoginFirst: false,
    theme: "light",
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
  loginMethods: ["email", "wallet"],
};

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      {children}
    </PrivyProvider>
  );
}
