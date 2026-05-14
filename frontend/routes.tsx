import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./app/Layout";
import { PublicLayout } from "./app/PublicLayout";
import { StudentLayout } from "./app/StudentLayout";
import { AdminLayout } from "./app/AdminLayout";
import { PublicDashboard } from "./app/PublicDashboard";
import { Login } from "./app/Login";
import { EmployerPortal } from "./app/EmployerPortal";
import { StudentDashboard } from "./app/StudentDashboard";
import { StudentCertificates } from "./app/StudentCertificates";
import { AdminDashboard } from "./app/AdminDashboard";
import { CreateCertificate } from "./app/CreateCertificate";
import { CertificateTemplates } from "./app/CertificateTempletes";
import { IssueCertificate } from "./app/IssueCertificate";
import { BulkIssueCertificate } from "./app/BulkIssuCertificate";
import { Certificates } from "./app/Certificate";
import { Awards } from "./app/Awards";
import { Dashboard } from "./app/Dashboard";

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
  {
    path: "/dashboard",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "certificates", element: <Certificates /> },
      { path: "awards", element: <Awards /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);