import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "../routes";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "./ui/sonner";
import { Award } from "lucide-react";
import { IconBadge } from "./ui/app-primitives";
import { isPrivyConfigured } from "../lib/privy";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { lazyWithReload } from "../lib/lazyWithReload";

const PrivyAppProvider = lazyWithReload("privy-provider", () =>
  import("./PrivyAppProvider").then((module) => ({ default: module.PrivyAppProvider })),
);

function LoadingFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-gray-50 px-4 text-center">
      <div className="space-y-3">
        <IconBadge icon={Award} tone="slate" className="mx-auto h-12 w-12" />
        <p className="text-sm text-gray-600">Loading CertiChain...</p>
      </div>
    </div>
  );
}

function AppShell() {
  return (
    <AuthProvider>
      <Suspense
        fallback={<LoadingFallback />}
      >
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default function App() {
  const app = <AppShell />;

  if (!isPrivyConfigured) {
    return <AppErrorBoundary>{app}</AppErrorBoundary>;
  }

  return (
    <AppErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <PrivyAppProvider>{app}</PrivyAppProvider>
      </Suspense>
    </AppErrorBoundary>
  );
}
