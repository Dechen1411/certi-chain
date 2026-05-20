import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import { Award, Home, Shield, LogIn, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { IconBadge, primaryActionClass } from "./ui/app-primitives";
import { cn } from "./ui/utils";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/employer", label: "Employer Portal", icon: Shield },
];

export function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <IconBadge icon={Award} tone="slate" />
              <div>
                <h1 className="font-bold text-gray-900">CertiChain</h1>
                <p className="text-xs text-gray-500">Digital Certificate Awarding System</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:block">
              <Link to="/login">
                <Button className={`gap-2 ${primaryActionClass}`}>
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>

          {menuOpen && (
            <nav className="mt-4 grid gap-2 md:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-950",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <Button className={`w-full gap-2 ${primaryActionClass}`}>
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="flex items-center gap-3">
              <IconBadge icon={Award} tone="slate" className="h-9 w-9" />
              <div>
                <p className="text-sm font-semibold text-gray-900">CertiChain</p>
                <p className="text-xs text-gray-500">Digital Certificate Awarding System</p>
              </div>
            </Link>

            <div className="flex flex-col gap-2 text-sm text-gray-600 sm:items-end">
              <p>&copy; 2026 CertiChain. All rights reserved.</p>
              <div className="flex items-center gap-3">
                <Link to="/employer" className="hover:text-gray-950">Verify Certificate</Link>
                <span className="text-gray-300">|</span>
                <Link to="/login" className="hover:text-gray-950">Login</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
