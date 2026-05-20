import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Award, LogOut, LucideIcon, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { IconBadge } from "./ui/app-primitives";
import { cn } from "./ui/utils";

interface PortalNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface PortalLayoutProps {
  portalLabel: string;
  requiredRole: "admin" | "student";
  loginPath: string;
  navItems: PortalNavItem[];
}

const isActivePath = (pathname: string, itemPath: string): boolean => {
  if (itemPath.endsWith("/dashboard")) {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

export function PortalLayout({
  portalLabel,
  requiredRole,
  loginPath,
  navItems,
}: PortalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoadingAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!isAuthenticated || user?.role !== requiredRole) {
      navigate(loginPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, isLoadingAuth, loginPath, requiredRole]);

  const handleLogout = async () => {
    await logout();
    navigate(loginPath, { replace: true });
  };

  if (isLoadingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 px-4 text-center">
        <div className="space-y-3">
          <IconBadge icon={Award} tone="slate" className="mx-auto h-12 w-12" />
          <p className="text-sm text-gray-600">Loading secure workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== requiredRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <button
        type="button"
        onClick={() => setSidebarOpen((current) => !current)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm lg:hidden"
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[82vw] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-gray-200 p-6">
          <Link
            to={requiredRole === "admin" ? "/admin/dashboard" : "/student/dashboard"}
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <IconBadge icon={Award} tone="slate" />
            <div>
              <h1 className="font-bold text-gray-900">CertiChain</h1>
              <p className="text-xs text-gray-500">{portalLabel}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const active = isActivePath(location.pathname, item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="truncate text-sm text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-600">{user.email}</p>
          </div>
          <Button
            onClick={() => void handleLogout()}
            variant="outline"
            className="w-full gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="min-h-screen flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pt-20 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
