import { useEffect, useState } from "react";
import { Award, Download, Eye, FileText, Wallet, Copy, RefreshCcw } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Wallet as EthersWallet } from "ethers";
import {
  getReadableError,
  getStudentCertificates,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import {
  downloadCertificateHtml,
  openCertificatePrintView,
} from "../lib/certificateArtifacts";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  StatCard,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function StudentDashboard() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletPrivateKey, setWalletPrivateKey] = useState<string>("");
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [recentCertificates, setRecentCertificates] = useState<StudentCertificateRecord[]>([]);
  const [totalCertificates, setTotalCertificates] = useState(0);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);
  const isWalletConnected = Boolean(walletAddress);

  useEffect(() => {
    const savedWallet = localStorage.getItem("certifypro_student_wallet") || "";
    setWalletAddress(savedWallet);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setRecentCertificates([]);
      setTotalCertificates(0);
      return;
    }

    const loadCertificates = async () => {
      setIsLoadingCertificates(true);
      try {
        const certificates = await getStudentCertificates(walletAddress);
        setTotalCertificates(certificates.length);
        setRecentCertificates(certificates.slice(0, 3));
      } catch (error) {
        toast.error(getReadableError(error));
      } finally {
        setIsLoadingCertificates(false);
      }
    };

    void loadCertificates();
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      const wallet = EthersWallet.createRandom();
      setWalletAddress(wallet.address);
      setWalletPrivateKey(wallet.privateKey);
      localStorage.setItem("certifypro_student_wallet", wallet.address);
      toast.success("Student wallet created successfully. Back up your private key now.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create wallet";
      toast.error(message);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress("");
    setWalletPrivateKey("");
    localStorage.removeItem("certifypro_student_wallet");
    toast.success("Wallet disconnected");
  };

  const handleCopyWallet = async () => {
    if (!walletAddress) {
      toast.error("Create your wallet first");
      return;
    }

    await navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied");
  };

  const handleCopyPrivateKey = async () => {
    if (!walletPrivateKey) {
      toast.error("Create your wallet first");
      return;
    }

    const confirmed = window.confirm(
      "Copy private key to clipboard? Anyone with this key can control your wallet.",
    );
    if (!confirmed) {
      return;
    }

    await navigator.clipboard.writeText(walletPrivateKey);
    toast.success("Private key copied. Keep it safe.");
  };

  const handleViewCertificate = (certificate: StudentCertificateRecord) => {
    try {
      openCertificatePrintView(certificate);
    } catch (error) {
      toast.error(getReadableError(error));
    }
  };

  const handleDownloadCertificate = (certificate: StudentCertificateRecord) => {
    downloadCertificateHtml(certificate);
    toast.success("Certificate file downloaded");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name || "Student"}`}
        description="Review your wallet and recently issued certificates."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatCard
          label="Total Certificates"
          value={totalCertificates}
          note="Issued to your wallet"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          label="Recent Certificates"
          value={recentCertificates.length}
          note="Latest on-chain records"
          icon={Award}
          tone="green"
        />
      </div>

      {/* Wallet Section */}
      <Card className={cn("p-6", subtlePanelClass)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl text-gray-900 mb-1">Student Wallet Address</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share this address with admin so your certificates can be issued to your wallet.
            </p>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 min-h-12 flex items-center">
              <p className="text-sm text-gray-800 break-all font-mono">
                {walletAddress || "Wallet not created yet"}
              </p>
            </div>

            {walletPrivateKey && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-800 mb-2">
                  Save your private key securely. Anyone with this key can control this wallet.
                </p>
                <p className="text-xs text-amber-900 break-all font-mono">{walletPrivateKey}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-[160px]">
            <Button
              onClick={isWalletConnected ? handleDisconnectWallet : handleConnectWallet}
              disabled={isConnectingWallet}
              className={`gap-2 ${primaryActionClass}`}
            >
              {isConnectingWallet ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : isWalletConnected ? (
                <RefreshCcw className="w-4 h-4" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              {isWalletConnected ? "Reset Wallet" : "Create Wallet"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopyWallet}>
              <Copy className="w-4 h-4" />
              Copy Address
            </Button>
            {walletPrivateKey && (
              <Button variant="outline" className="gap-2" onClick={handleCopyPrivateKey}>
                <Copy className="w-4 h-4" />
                Copy Private Key
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Recent Certificates */}
      <Card className={cn("p-6", subtlePanelClass)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900">Recent Certificates</h2>
          <Link to="/student/certificates">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {recentCertificates.length === 0 ? (
            <EmptyState
              icon={Award}
              title={isLoadingCertificates ? "Loading certificates" : "No certificates yet"}
              description={
                isLoadingCertificates
                  ? "Fetching certificate records from the blockchain."
                  : "Certificates issued to your wallet will appear here."
              }
            />
          ) : (
            recentCertificates.map((cert) => (
              <div
                key={cert.tokenId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <IconBadge icon={Award} tone="blue" className="h-12 w-12" />
                  <div>
                    <p className="text-gray-900 mb-1">{cert.certificateType}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>ID: {cert.certificateId}</span>
                      <span>-</span>
                      <span>{new Date(cert.issueDate).toLocaleDateString()}</span>
                    </div>
                    {cert.grade && cert.grade !== "N/A" && (
                      <p className="text-sm text-gray-600 mt-1">Grade: {cert.grade}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleViewCertificate(cert)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDownloadCertificate(cert)}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-4">
          <IconBadge icon={Award} tone="blue" className="h-12 w-12" />
          <div>
            <h3 className="text-lg text-gray-900 mb-2">NFT-Backed Certificates</h3>
            <p className="text-gray-600 mb-4">
              All your certificates are secured on the blockchain as NFTs. Each certificate has a unique QR code and certificate ID that can be verified by employers.
            </p>
            <Link to="/student/certificates">
              <Button className={primaryActionClass}>
                View All Certificates
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
