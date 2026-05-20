import {
  Award,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PortalLayout } from "./PortalLayout";

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/dashboard/templates", label: "Templates", icon: FileText },
  { path: "/admin/dashboard/issue-certificate", label: "Issue Certificate", icon: Award },
  { path: "/admin/dashboard/bulk-issue", label: "Bulk Issue", icon: Users },
  { path: "/admin/dashboard/certificates", label: "Certificates", icon: ShieldCheck },
  { path: "/admin/dashboard/awards", label: "Awards", icon: Award },
];

export function AdminLayout() {
  return (
    <PortalLayout
      portalLabel="Admin Panel"
      requiredRole="admin"
      loginPath="/admin/login"
      navItems={navItems}
    />
  );
}
