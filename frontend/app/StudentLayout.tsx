import { Award, LayoutDashboard } from "lucide-react";
import { PortalLayout } from "./PortalLayout";

const navItems = [
  { path: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/student/certificates", label: "My Certificates", icon: Award },
];

export function StudentLayout() {
  return (
    <PortalLayout
      portalLabel="Student Portal"
      requiredRole="student"
      loginPath="/student/login"
      navItems={navItems}
    />
  );
}
