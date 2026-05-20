import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./app/PublicLayout";
import { StudentLayout } from "./app/StudentLayout";
import { AdminLayout } from "./app/AdminLayout";
import { RouteErrorBoundary } from "./app/AppErrorBoundary";
import { lazyWithReload } from "./lib/lazyWithReload";

const PublicDashboard = lazyWithReload("public-dashboard", () =>
  import("./app/PublicDashboard").then((module) => ({ default: module.PublicDashboard })),
);
const Login = lazyWithReload("login", () =>
  import("./app/Login").then((module) => ({ default: module.Login })),
);
const EmployerPortal = lazyWithReload("employer-portal", () =>
  import("./app/EmployerPortal").then((module) => ({ default: module.EmployerPortal })),
);
const StudentDashboard = lazyWithReload("student-dashboard", () =>
  import("./app/StudentDashboard").then((module) => ({ default: module.StudentDashboard })),
);
const StudentCertificates = lazyWithReload("student-certificates", () =>
  import("./app/StudentCertificates").then((module) => ({ default: module.StudentCertificates })),
);
const AdminDashboard = lazyWithReload("admin-dashboard", () =>
  import("./app/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const CreateCertificate = lazyWithReload("create-certificate", () =>
  import("./app/CreateCertificate").then((module) => ({ default: module.CreateCertificate })),
);
const CertificateTemplates = lazyWithReload("certificate-templates", () =>
  import("./app/CertificateTemplates").then((module) => ({ default: module.CertificateTemplates })),
);
const IssueCertificate = lazyWithReload("issue-certificate", () =>
  import("./app/IssueCertificate").then((module) => ({ default: module.IssueCertificate })),
);
const BulkIssueCertificate = lazyWithReload("bulk-issue-certificate", () =>
  import("./app/BulkIssueCertificate").then((module) => ({ default: module.BulkIssueCertificate })),
);
const Certificates = lazyWithReload("certificates", () =>
  import("./app/Certificate").then((module) => ({ default: module.Certificates })),
);
const Awards = lazyWithReload("awards", () =>
  import("./app/Awards").then((module) => ({ default: module.Awards })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <PublicDashboard /> },
      { path: "employer", element: <EmployerPortal /> },
      { path: "login", element: <Login /> },
      { path: "student/login", element: <Login /> },
      { path: "admin/login", element: <Login /> },
      { path: "student/signup", element: <Login /> },
      { path: "admin/signup", element: <Navigate to="/login" replace /> },
    ],
  },
  {
    path: "/student",
    element: <StudentLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "dashboard", element: <StudentDashboard /> },
      { path: "certificates", element: <StudentCertificates /> },
      { path: "dashboard/certificates", element: <Navigate to="/student/certificates" replace /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "dashboard/create-certificate", element: <CreateCertificate /> },
      { path: "dashboard/templates", element: <CertificateTemplates /> },
      { path: "dashboard/issue-certificate", element: <IssueCertificate /> },
      { path: "dashboard/bulk-issue", element: <BulkIssueCertificate /> },
      { path: "dashboard/certificates", element: <Certificates /> },
      { path: "dashboard/awards", element: <Awards /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
