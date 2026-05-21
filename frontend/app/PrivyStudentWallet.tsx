import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ConnectedWallet,
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { Copy, LogIn, LogOut, RefreshCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../context/AuthContext";
import { bindStudentWallet } from "../lib/studentWallet";
import { Button } from "./ui/button";
import { primaryActionClass } from "./ui/app-primitives";

function getPrimaryEthereumWallet(wallets: ConnectedWallet[]) {
  return (
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.linked && wallet.walletClientType === "privy") ||
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.linked) ||
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.walletClientType === "privy") ||
    wallets.find((wallet) => wallet.type === "ethereum") ||
    null
  );
}

function useSyncedPrivyWalletAddress(onWalletAddressChange: (address: string) => void) {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const wallet = useMemo(() => getPrimaryEthereumWallet(wallets), [wallets]);
  const walletAddress = authenticated && wallet ? wallet.address : "";

  useEffect(() => {
    if (!ready || !walletsReady) {
      return;
    }

    onWalletAddressChange(walletAddress);
  }, [onWalletAddressChange, ready, walletAddress, walletsReady]);

  return {
    authenticated,
    ready,
    wallet,
    walletAddress,
    walletsReady,
  };
}

export function PrivyStudentWalletActions({
  autoSetup = false,
  onCopyWallet,
  onWalletAddressChange,
  onWalletVerified,
  verifiedWalletAddress = "",
}: {
  autoSetup?: boolean;
  onCopyWallet: () => Promise<void>;
  onWalletAddressChange: (address: string) => void;
  onWalletVerified: (user: User) => void | Promise<void>;
  verifiedWalletAddress?: string;
}) {
  const { getAccessToken, login, logout } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [isAutoSetupPaused, setIsAutoSetupPaused] = useState(false);
  const autoLoginAttemptedRef = useRef(false);
  const autoCreateAttemptedRef = useRef(false);
  const autoVerifyWalletRef = useRef("");
  const verificationInFlightRef = useRef(false);
  const { authenticated, ready, wallet, walletAddress, walletsReady } =
    useSyncedPrivyWalletAddress(onWalletAddressChange);
  const isLoading = !ready || !walletsReady;
  const normalizedWalletAddress = walletAddress.toLowerCase();
  const normalizedVerifiedWalletAddress = verifiedWalletAddress.toLowerCase();
  const needsServerVerification =
    Boolean(normalizedWalletAddress) &&
    normalizedWalletAddress !== normalizedVerifiedWalletAddress;

  const handleVerifyWallet = useCallback(async (showSuccessToast = true) => {
    if (!walletAddress) {
      return;
    }

    if (verificationInFlightRef.current) {
      return;
    }

    verificationInFlightRef.current = true;
    setIsVerifyingWallet(true);
    try {
      if (!wallet) {
        throw new Error("Connect a wallet first.");
      }

      if (!wallet.linked) {
        await wallet.loginOrLink();
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Wallet session is not ready. Sign in again.");
      }

      const updatedUser = await bindStudentWallet(walletAddress, accessToken);
      await onWalletVerified(updatedUser);

      if (showSuccessToast || walletAddress.toLowerCase() !== verifiedWalletAddress.toLowerCase()) {
        toast.success("Wallet verified and saved");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify wallet";
      toast.error(message);
    } finally {
      verificationInFlightRef.current = false;
      setIsVerifyingWallet(false);
    }
  }, [getAccessToken, onWalletVerified, verifiedWalletAddress, wallet, walletAddress]);

  const handleCreateWallet = async () => {
    setIsCreatingWallet(true);
    try {
      const createdWallet = await createWallet();
      onWalletAddressChange(createdWallet.address);
      toast.success("Wallet ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create wallet";
      toast.error(message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setIsAutoSetupPaused(true);
    await logout();
    onWalletAddressChange("");
    toast.success("Wallet disconnected");
  };

  useEffect(() => {
    if (
      !autoSetup ||
      isAutoSetupPaused ||
      isLoading ||
      authenticated ||
      verifiedWalletAddress ||
      autoLoginAttemptedRef.current
    ) {
      return;
    }

    autoLoginAttemptedRef.current = true;
    login({ loginMethods: ["email"] });
  }, [authenticated, autoSetup, isAutoSetupPaused, isLoading, login, verifiedWalletAddress]);

  useEffect(() => {
    if (
      !autoSetup ||
      isAutoSetupPaused ||
      isLoading ||
      !authenticated ||
      wallet ||
      verifiedWalletAddress ||
      isCreatingWallet ||
      autoCreateAttemptedRef.current
    ) {
      return;
    }

    autoCreateAttemptedRef.current = true;
    setIsCreatingWallet(true);
    createWallet()
      .then((createdWallet) => {
        onWalletAddressChange(createdWallet.address);
        toast.success("Wallet ready");
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to create wallet";
        toast.error(message);
      })
      .finally(() => setIsCreatingWallet(false));
  }, [
    authenticated,
    autoSetup,
    createWallet,
    isAutoSetupPaused,
    isCreatingWallet,
    isLoading,
    onWalletAddressChange,
    verifiedWalletAddress,
    wallet,
  ]);

  useEffect(() => {
    if (
      !autoSetup ||
      isAutoSetupPaused ||
      isLoading ||
      !needsServerVerification ||
      isVerifyingWallet ||
      autoVerifyWalletRef.current === normalizedWalletAddress
    ) {
      return;
    }

    autoVerifyWalletRef.current = normalizedWalletAddress;
    void handleVerifyWallet(false);
  }, [
    autoSetup,
    handleVerifyWallet,
    isAutoSetupPaused,
    isLoading,
    isVerifyingWallet,
    needsServerVerification,
    normalizedWalletAddress,
  ]);

  if (isLoading) {
    return (
      <Button disabled className={`gap-2 ${primaryActionClass}`}>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Loading Wallet
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button
        onClick={() => login({ loginMethods: ["email", "wallet"] })}
        className={`gap-2 ${primaryActionClass}`}
      >
        <LogIn className="h-4 w-4" />
        {autoLoginAttemptedRef.current ? "Continue Wallet Setup" : "Set Up Wallet"}
      </Button>
    );
  }

  if (!wallet) {
    return (
      <>
        <Button
          onClick={handleCreateWallet}
          disabled={isCreatingWallet}
          className={`gap-2 ${primaryActionClass}`}
        >
          {isCreatingWallet ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isCreatingWallet ? "Creating Wallet" : "Create Wallet"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleDisconnectWallet}>
          <LogOut className="h-4 w-4" />
          Disconnect Wallet
        </Button>
      </>
    );
  }

  if (needsServerVerification) {
    return (
      <>
        <Button
          onClick={() => void handleVerifyWallet(true)}
          disabled={isVerifyingWallet}
          className={`gap-2 ${primaryActionClass}`}
        >
          {isVerifyingWallet ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isVerifyingWallet ? "Saving Wallet" : wallet.linked ? "Save Wallet" : "Link Wallet"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleDisconnectWallet}>
          <LogOut className="h-4 w-4" />
          Disconnect Wallet
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={onCopyWallet}>
        <Copy className="h-4 w-4" />
        Copy Address
      </Button>
      <Button variant="outline" className="gap-2" onClick={handleDisconnectWallet}>
        <LogOut className="h-4 w-4" />
        Disconnect Wallet
      </Button>
    </>
  );
}
