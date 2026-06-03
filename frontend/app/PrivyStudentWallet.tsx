import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ConnectedWallet,
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { Copy, LogIn, RefreshCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../context/AuthContext";
import { bindStudentWallet } from "../lib/studentWallet";
import { Button } from "./ui/button";
import { primaryActionClass } from "./ui/app-primitives";

type WalletLoginMethod = "email" | "wallet";

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
  userEmail = "",
  verifiedWalletAddress = "",
}: {
  autoSetup?: boolean;
  onCopyWallet: () => Promise<void>;
  onWalletAddressChange: (address: string) => void;
  onWalletVerified: (user: User) => void | Promise<void>;
  userEmail?: string;
  verifiedWalletAddress?: string;
}) {
  const { login } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const autoLoginAttemptedRef = useRef(false);
  const autoCreateAttemptedRef = useRef(false);
  const autoSaveWalletRef = useRef("");
  const saveInFlightRef = useRef(false);
  const { authenticated, ready, wallet, walletAddress, walletsReady } =
    useSyncedPrivyWalletAddress(onWalletAddressChange);
  const isLoading = !ready || !walletsReady;
  const normalizedWalletAddress = walletAddress.toLowerCase();
  const normalizedVerifiedWalletAddress = verifiedWalletAddress.toLowerCase();
  const needsServerSave =
    Boolean(normalizedWalletAddress) &&
    normalizedWalletAddress !== normalizedVerifiedWalletAddress;
  const getLoginOptions = useCallback((loginMethods: WalletLoginMethod[]) => ({
    loginMethods,
    ...(userEmail ? { prefill: { type: "email" as const, value: userEmail } } : {}),
  }), [userEmail]);

  const handleSaveWallet = useCallback(async (showSuccessToast = true) => {
    if (!walletAddress) {
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSavingWallet(true);
    try {
      if (!wallet) {
        throw new Error("Connect a wallet first.");
      }

      if (!wallet.linked) {
        await wallet.loginOrLink();
      }

      const updatedUser = await bindStudentWallet(walletAddress);
      await onWalletVerified(updatedUser);

      if (showSuccessToast || walletAddress.toLowerCase() !== verifiedWalletAddress.toLowerCase()) {
        toast.success("Wallet saved to your account");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save wallet";
      toast.error(message);
    } finally {
      saveInFlightRef.current = false;
      setIsSavingWallet(false);
    }
  }, [onWalletVerified, verifiedWalletAddress, wallet, walletAddress]);

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

  useEffect(() => {
    if (
      !autoSetup ||
      isLoading ||
      authenticated ||
      verifiedWalletAddress ||
      autoLoginAttemptedRef.current
    ) {
      return;
    }

    autoLoginAttemptedRef.current = true;
    login(getLoginOptions(["email"]));
  }, [authenticated, autoSetup, getLoginOptions, isLoading, login, verifiedWalletAddress]);

  useEffect(() => {
    if (
      !autoSetup ||
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
    isCreatingWallet,
    isLoading,
    onWalletAddressChange,
    verifiedWalletAddress,
    wallet,
  ]);

  useEffect(() => {
    if (
      !autoSetup ||
      isLoading ||
      !needsServerSave ||
      isSavingWallet ||
      autoSaveWalletRef.current === normalizedWalletAddress
    ) {
      return;
    }

    autoSaveWalletRef.current = normalizedWalletAddress;
    void handleSaveWallet(false);
  }, [
    autoSetup,
    handleSaveWallet,
    isLoading,
    isSavingWallet,
    needsServerSave,
    normalizedWalletAddress,
  ]);

  if (verifiedWalletAddress) {
    return (
      <Button variant="outline" className="gap-2" onClick={onCopyWallet}>
        <Copy className="h-4 w-4" />
        Copy Address
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button disabled className={`gap-2 ${primaryActionClass}`}>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Loading Wallet
      </Button>
    );
  }

  if (!authenticated) {
    if (autoSetup) {
      return (
        <Button disabled className={`gap-2 ${primaryActionClass}`}>
          <RefreshCcw className="h-4 w-4 animate-spin" />
          Preparing Wallet
        </Button>
      );
    }

    return (
      <Button
        onClick={() => login(getLoginOptions(["email", "wallet"]))}
        className={`gap-2 ${primaryActionClass}`}
      >
        <LogIn className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  if (!wallet) {
    if (autoSetup) {
      return (
        <Button disabled className={`gap-2 ${primaryActionClass}`}>
          <RefreshCcw className="h-4 w-4 animate-spin" />
          {isCreatingWallet ? "Creating Wallet" : "Preparing Wallet"}
        </Button>
      );
    }

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
      </>
    );
  }

  if (needsServerSave) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Button
          onClick={() => void handleSaveWallet(true)}
          disabled={isSavingWallet}
          className={`gap-2 ${primaryActionClass}`}
        >
          {isSavingWallet ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isSavingWallet ? "Saving Wallet" : "Save Wallet"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onCopyWallet}>
          <Copy className="h-4 w-4" />
          Copy Address
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={onCopyWallet}>
        <Copy className="h-4 w-4" />
        Copy Address
      </Button>
    </>
  );
}
