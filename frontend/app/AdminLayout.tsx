import { useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  Award, 
  FileText,
  LogOut,
  ShieldCheck,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { IconBadge } from "./ui/app-primitives";

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/dashboard/templates", label: "Templates", icon: FileText },
  { path: "/admin/dashboard/issue-certificate", label: "Issue Certificate", icon: Award },
  { path: "/admin/dashboard/bulk-issue", label: "Bulk Issue", icon: Users },
  { path: "/admin/dashboard/certificates", label: "Certificates", icon: ShieldCheck },
  { path: "/admin/dashboard/awards", label: "Awards", icon: Award },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/admin/login");
    }
  }, [isAuthenticated, user, navigate, isLoadingAuth]);

  const handleLogout = () => {
    void logout();
    navigate("/admin/login");
  };

  if (isLoadingAuth) {
    return null;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <IconBadge icon={Award} tone="slate" />
              <div>
                <h1 className="font-bold text-gray-900">CertiChain</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-3">
              <p className="text-sm text-gray-900 mb-1">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
