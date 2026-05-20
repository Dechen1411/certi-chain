import {
  ArrowRight,
  Award,
  CheckCircle,
  FileCheck2,
  FileText,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { IconBadge, primaryActionClass, subtlePanelClass } from "./ui/app-primitives";
import { cn } from "./ui/utils";

const trustStats = [
  { label: "Verification", value: "Live", icon: ShieldCheck, tone: "green" as const },
  { label: "Student Access", value: "Wallet-secured", icon: Wallet, tone: "blue" as const },
  { label: "Records", value: "Protected", icon: LockKeyhole, tone: "purple" as const },
];

const studentHighlights = [
  "Wallet-linked certificates",
  "Downloadable certificate file",
  "Employer-ready QR verification",
];

const employerHighlights = [
  "Instant authenticity check",
  "Certificate ID and QR lookup",
  "Clear validity status",
];

const architectureSteps = [
  {
    title: "Admin portal",
    description: "Authorized staff create templates and issue certificates from the dashboard.",
    icon: FileText,
    tone: "blue" as const,
  },
  {
    title: "Protected issuance",
    description: "Only authorized admin actions can publish certificate records.",
    icon: LockKeyhole,
    tone: "purple" as const,
  },
  {
    title: "Wallet ownership",
    description: "Students verify their wallet before certificates appear in their account.",
    icon: Wallet,
    tone: "green" as const,
  },
  {
    title: "Public verification",
    description: "Employers can check certificate IDs and QR codes against the live record.",
    icon: ShieldCheck,
    tone: "blue" as const,
  },
];

export function PublicDashboard() {
  return (
    <div className="space-y-10">
      <section className="grid min-h-[calc(100vh-180px)] grid-cols-1 items-center gap-8 py-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-8">
        <div className="max-w-2xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Blockchain-verified certificates
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-gray-950 sm:text-5xl lg:text-6xl">
              CertiChain
            </h1>
            <p className="max-w-xl text-xl font-medium text-gray-900 sm:text-2xl">
              Digital Certificate Awarding System
            </p>
            <p className="max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              Issue academic certificates, assign them to verified student wallets,
              and let employers confirm authenticity by ID or QR code.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/employer">
              <Button className={`w-full gap-2 sm:w-auto ${primaryActionClass}`}>
                Verify Certificate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/student/signup">
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                Student Access
                <Wallet className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {trustStats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <IconBadge icon={stat.icon} tone={stat.tone} className="h-9 w-9" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="truncate text-sm font-semibold text-gray-950">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <IconBadge icon={Award} tone="blue" className="h-10 w-10 border-blue-400/30 bg-blue-400/10 text-blue-100" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Certificate Preview</p>
                    <p className="truncate text-xs text-slate-300">CERT-2026-SEP-001</p>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                  Verified
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_150px]">
              <div className="rounded-lg border border-gray-200 bg-slate-50 p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-normal text-gray-500">Awarded to</p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-950">Student Name</h2>
                  </div>
                  <IconBadge icon={FileCheck2} tone="green" />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Certificate Type</p>
                    <p className="font-medium text-gray-950">Bachelor of Computer Science</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">Record</p>
                      <p className="text-sm font-semibold text-gray-950">Secured</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-semibold text-emerald-700">Valid</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Verification proof
                  </div>
                  <p className="break-all font-mono text-xs text-gray-500">
                    CERT-2026-SEP-001
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex aspect-square items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  <QrCode className="h-24 w-24 text-slate-900" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-950">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Employer-ready
                  </div>
                  <p className="text-xs leading-5 text-gray-600">
                    Scan or enter the certificate ID to verify the record.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className={cn("p-6", subtlePanelClass)}>
          <div className="mb-5 flex items-start gap-4">
            <IconBadge icon={Wallet} tone="blue" />
            <div>
              <h2 className="text-xl font-semibold text-gray-950">For Students</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Connect a secure wallet and keep issued certificates in one place.
              </p>
            </div>
          </div>
          <ul className="mb-5 grid gap-3">
            {studentHighlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/student/login">
            <Button className={`w-full gap-2 ${primaryActionClass}`}>
              Student Login
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        <Card className={cn("p-6", subtlePanelClass)}>
          <div className="mb-5 flex items-start gap-4">
            <IconBadge icon={ShieldCheck} tone="green" />
            <div>
              <h2 className="text-xl font-semibold text-gray-950">For Employers</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Verify credentials quickly using a certificate ID or QR code.
              </p>
            </div>
          </div>
          <ul className="mb-5 grid gap-3">
            {employerHighlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/employer">
            <Button className={`w-full gap-2 ${primaryActionClass}`}>
              Open Verification
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-between gap-8 p-8 lg:p-10">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                <FileText className="h-4 w-4" />
                Secure certificate workflow
              </div>
              <h2 className="text-3xl font-semibold tracking-normal text-gray-950">Secure by design</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Admin issuance is protected, wallet ownership is verified, records
                are stored safely, and certificate proofs can be checked publicly.
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-4 py-3">
                <span className="font-medium text-gray-700">Issue control</span>
                <span className="font-semibold text-emerald-700">Admin-approved</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-4 py-3">
                <span className="font-medium text-gray-700">Student wallet</span>
                <span className="font-semibold text-blue-700">Verified</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-4 py-3">
                <span className="font-medium text-gray-700">Certificate proof</span>
                <span className="font-semibold text-slate-900">Public record</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
              {architectureSteps.map((step) => (
                <div key={step.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <IconBadge icon={step.icon} tone={step.tone} className="mb-4" />
                  <h3 className="font-semibold text-gray-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
