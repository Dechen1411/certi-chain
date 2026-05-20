import { Component, type ReactNode } from "react";
import { Home, RefreshCcw, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { IconBadge } from "./ui/app-primitives";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export function AppErrorFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-gray-50 px-4 py-10 text-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <IconBadge icon={ShieldAlert} tone="amber" className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-2xl font-semibold text-gray-950">Something needs a refresh</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          CertiChain could not load the latest app files. Refresh the page to continue.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh Page
          </Button>
          <Button
            className="gap-2"
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback />;
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary() {
  return <AppErrorFallback />;
}
