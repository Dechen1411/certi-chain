import { Outlet, Link, useLocation } from "react-router";
import { Award, Home, Shield, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { IconBadge, primaryActionClass } from "./ui/app-primitives";

export function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <IconBadge icon={Award} tone="slate" />
              <div>
                <h1 className="font-bold text-gray-900">CertiChain</h1>
                <p className="text-xs text-gray-500">College Certificate System</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === "/"
                    ? "bg-slate-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link
                to="/employer"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === "/employer"
                    ? "bg-slate-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Shield className="w-4 h-4" />
                Employer Portal
              </Link>
            </nav>

            <Link to="/login">
              <Button className={`gap-2 ${primaryActionClass}`}>
                <LogIn className="w-4 h-4" />
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <p className="text-center text-gray-600 text-sm">
            © 2026 CertiChain - College Certificate Awarding System
          </p>
        </div>
      </footer>
    </div>
  );
}
