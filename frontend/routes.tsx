import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./app/PublicLayout";
import { StudentLayout } from "./app/StudentLayout";
import { AdminLayout } from "./app/AdminLayout";

const PublicDashboard = lazy(() =>
  import("./app/PublicDashboard").then((module) => ({ default: module.PublicDashboard })),
);
const Login = lazy(() =>
  import("./app/Login").then((module) => ({ default: module.Login })),
);
const EmployerPortal = lazy(() =>
  import("./app/EmployerPortal").then((module) => ({ default: module.EmployerPortal })),
);
const StudentDashboard = lazy(() =>
  import("./app/StudentDashboard").then((module) => ({ default: module.StudentDashboard })),
);
const StudentCertificates = lazy(() =>
  import("./app/StudentCertificates").then((module) => ({ default: module.StudentCertificates })),
);
const AdminDashboard = lazy(() =>
  import("./app/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const CreateCertificate = lazy(() =>
  import("./app/CreateCertificate").then((module) => ({ default: module.CreateCertificate })),
);
const CertificateTemplates = lazy(() =>
  import("./app/CertificateTemplates").then((module) => ({ default: module.CertificateTemplates })),
);
const IssueCertificate = lazy(() =>
  import("./app/IssueCertificate").then((module) => ({ default: module.IssueCertificate })),
);
const BulkIssueCertificate = lazy(() =>
  import("./app/BulkIssueCertificate").then((module) => ({ default: module.BulkIssueCertificate })),
);
const Certificates = lazy(() =>
  import("./app/Certificate").then((module) => ({ default: module.Certificates })),
);
const Awards = lazy(() =>
  import("./app/Awards").then((module) => ({ default: module.Awards })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
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
    children: [
      { path: "dashboard", element: <StudentDashboard /> },
      { path: "certificates", element: <StudentCertificates /> },
      { path: "dashboard/certificates", element: <Navigate to="/student/certificates" replace /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
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
