import { Award, FileText, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { IconBadge, primaryActionClass, subtlePanelClass } from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function PublicDashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm">
          <Award className="w-4 h-4" />
          Blockchain-Verified Certificates
        </div>
        <h1 className="text-5xl text-gray-900 max-w-3xl mx-auto">
          Digital Certificate Awarding System
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Secure, verifiable, and tamper-proof academic certificates powered by NFT technology
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/employer">
            <Button className={`gap-2 ${primaryActionClass}`}>
              Verify Certificate
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/student/signup">
            <Button variant="outline" className="gap-2">
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className={cn("p-8", subtlePanelClass)}>
          <h2 className="text-2xl text-gray-900 mb-4">For Students</h2>
          <p className="text-gray-600 mb-6">
            Access your digital certificates anytime, anywhere. Each certificate is secured with blockchain technology and can be easily shared with employers.
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Instant certificate access
            </li>
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              QR code for easy verification
            </li>
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              NFT-backed authenticity
            </li>
          </ul>
          <Link to="/student/login">
            <Button className={`w-full ${primaryActionClass}`}>
              Login
            </Button>
          </Link>
        </Card>

        <Card className={cn("p-8", subtlePanelClass)}>
          <h2 className="text-2xl text-gray-900 mb-4">For Employers</h2>
          <p className="text-gray-600 mb-6">
            Verify the authenticity of academic certificates instantly. Our system ensures that every certificate is genuine and tamper-proof.
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Instant verification
            </li>
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              QR code scanning
            </li>
            <li className="flex items-center gap-3 text-gray-700">
                <div className="w-6 h-6 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Blockchain verification
            </li>
          </ul>
          <Link to="/employer">
            <Button className={`w-full ${primaryActionClass}`}>
              Verify Certificate
            </Button>
          </Link>
        </Card>
      </div>

      {/* Image Section */}
      <Card className={cn("overflow-hidden", subtlePanelClass)}>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <h2 className="text-3xl text-gray-900 mb-4">Secure & Transparent</h2>
            <p className="text-gray-600 mb-6">
              Our certificate system uses blockchain technology to ensure that every certificate is authentic, verifiable, and tamper-proof. Students receive their certificates as NFTs, making them permanently accessible and provably genuine.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <IconBadge icon={Award} tone="blue" className="h-8 w-8" />
                <div>
                  <h3 className="text-gray-900 mb-1">Digital Certificates</h3>
                  <p className="text-sm text-gray-600">Issued as NFTs on the blockchain</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IconBadge icon={FileText} tone="purple" className="h-8 w-8" />
                <div>
                  <h3 className="text-gray-900 mb-1">Easy Verification</h3>
                  <p className="text-sm text-gray-600">Scan QR code or enter certificate ID</p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-full min-h-[400px]">
            <ImageWithFallback
              src="/certificate-hero.svg"
              alt="Certificate achievement"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
