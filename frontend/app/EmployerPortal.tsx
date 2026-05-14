import { useEffect, useRef, useState } from "react";
import { Search, QrCode, CheckCircle, XCircle, Calendar, User, Award } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import {
  createCertificateHash,
  getReadableError,
  getRegistryReadContract,
  parseMetadataUri,
} from "../lib/certificateRegistry";
import { useSearchParams } from "react-router";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = {
  detect(source: CanvasImageSource): Promise<BarcodeResult[]>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

const getBarcodeDetector = (): BarcodeDetectorConstructor | undefined => {
  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
};

const extractCertificateIdFromPayload = (payload: string): string => {
  const trimmed = payload.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("certificateId") || url.searchParams.get("id");
    if (fromQuery) {
      return fromQuery.trim().toUpperCase();
    }
  } catch {
    // The QR payload can be a plain certificate ID instead of a URL.
  }

  try {
    const parsed = JSON.parse(trimmed) as { certificateId?: string; id?: string };
    const fromJson = parsed.certificateId || parsed.id;
    if (fromJson) {
      return fromJson.trim().toUpperCase();
    }
  } catch {
    // Plain text fallback below.
  }

  const match = trimmed.match(/CERT-\d{4}-\d{4,}/i);
  return (match?.[0] || trimmed).trim().toUpperCase();
};

interface VerificationResult {
  valid: boolean;
  id?: string;
  studentName?: string;
  certificateType?: string;
  issueDate?: string;
  grade?: string;
  department?: string;
  studentWalletAddress?: string;
  nftHash?: string;
  message?: string;
}

interface RecentVerification {
  id: number;
  certificateId: string;
  studentName: string;
  verifiedAt: string;
  status: "Valid" | "Invalid";
}

export function EmployerPortal() {
  const [searchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [recentVerifications, setRecentVerifications] = useState<RecentVerification[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  const stopScanner = () => {
    if (scanFrameRef.current !== null) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setShowScanner(false);
  };

  const verifyCertificate = async (input: string) => {
    if (!input.trim()) return;

    setIsVerifying(true);

    try {
      const normalizedId = input.trim().toUpperCase();
      const certificateHash = createCertificateHash(normalizedId);
      const contract = getRegistryReadContract();

      const verifyResponse = await contract.verifyByHash(certificateHash);
      const exists = Boolean(verifyResponse[0]);
      const valid = Boolean(verifyResponse[1]);

      if (!exists) {
        setVerificationResult({
          valid: false,
          message: "Certificate not found on-chain. Please check the Certificate ID and try again.",
        });

        setRecentVerifications((prev) => [
          {
            id: Date.now(),
            certificateId: normalizedId,
            studentName: "Unknown",
            verifiedAt: new Date().toLocaleString(),
            status: "Invalid",
          },
          ...prev,
        ]);
        return;
      }

      const tokenId = verifyResponse[2] as bigint;
      const chainStudent = String(verifyResponse[3]);
      const issuedAt = Number(verifyResponse[4]);

      const certificateData = await contract.getCertificate(tokenId);
      const metadataUri = String(certificateData[4]);
      const metadata = parseMetadataUri(metadataUri);

      const result: VerificationResult = {
        valid,
        id: metadata?.certificateId || normalizedId,
        studentName: metadata?.studentName || "Unknown",
        certificateType: metadata?.certificateType || "N/A",
        issueDate: metadata?.issueDate || new Date(issuedAt * 1000).toISOString().split("T")[0],
        grade: metadata?.grade || "N/A",
        department: metadata?.department || "N/A",
        studentWalletAddress: chainStudent,
        nftHash: certificateHash,
      };

      setVerificationResult(result);

      setRecentVerifications((prev) => [
        {
          id: Date.now(),
          certificateId: result.id || normalizedId,
          studentName: result.studentName || "Unknown",
          verifiedAt: new Date().toLocaleString(),
          status: valid ? "Valid" : "Invalid",
        },
        ...prev,
      ]);
    } catch (error) {
      setVerificationResult({
        valid: false,
        message: getReadableError(error),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const fromQuery = searchParams.get("certificateId") || searchParams.get("id");
    if (!fromQuery) {
      return;
    }

    const normalizedId = extractCertificateIdFromPayload(fromQuery);
    setCertificateId(normalizedId);
    void verifyCertificate(normalizedId);
    // Only auto-run on the initial route query value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return stopScanner;
  }, []);

  const handleVerify = async () => {
    await verifyCertificate(certificateId);
  };

  const handleScanQR = async () => {
    const BarcodeDetector = getBarcodeDetector();
    if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera QR scanning is not supported in this browser. Enter the certificate ID manually.");
      return;
    }

    try {
      setShowScanner(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Scanner video element is not ready");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new BarcodeDetector({ formats: ["qr_code"] });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) {
          return;
        }

        try {
          const results = await detector.detect(videoRef.current);
          const scannedId = results
            .map((result) => extractCertificateIdFromPayload(result.rawValue))
            .find(Boolean);

          if (scannedId) {
            setCertificateId(scannedId);
            stopScanner();
            await verifyCertificate(scannedId);
            return;
          }
        } catch {
          // Keep scanning. Some frames cannot be decoded cleanly.
        }

        scanFrameRef.current = window.requestAnimationFrame(() => {
          void scan();
        });
      };

      await scan();
    } catch (error) {
      stopScanner();
      toast.error(getReadableError(error));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employer Portal"
        description="Verify the authenticity of academic certificates instantly."
      />

      <Tabs defaultValue="verify" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="verify">Verify Certificate</TabsTrigger>
          <TabsTrigger value="recent">Recent Verifications</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-6">
          {/* Verification Methods */}
          <Card className={cn("p-8 max-w-2xl mx-auto", subtlePanelClass)}>
            <h2 className="text-2xl text-gray-900 mb-6">Verify Certificate</h2>
            
            <div className="space-y-6">
              {/* Manual Entry */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Enter Certificate ID
                </label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="e.g., CERT-2024-001"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleVerify();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying || !certificateId.trim()}
                    className={`gap-2 ${primaryActionClass}`}
                  >
                    <Search className="w-4 h-4" />
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* QR Scanner */}
              <div className="text-center">
                <Button
                  onClick={handleScanQR}
                  variant="outline"
                  className="gap-2 w-full h-24 text-lg"
                  disabled={showScanner}
                >
                  <QrCode className="w-8 h-8" />
                  {showScanner ? "Scanning..." : "Scan QR Code"}
                </Button>
                {showScanner && (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-hidden rounded-lg bg-gray-900">
                      <video
                        ref={videoRef}
                        className="w-full max-h-80 object-cover"
                        muted
                        playsInline
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={stopScanner}>
                      Stop Scanner
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Verification Result */}
          {verificationResult && (
            <Card className={cn("p-8 max-w-2xl mx-auto", subtlePanelClass)}>
              {verificationResult.valid ? (
                <div className="space-y-6">
                  {/* Success Header */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                    <IconBadge icon={CheckCircle} tone="green" className="h-16 w-16" />
                    <div>
                      <h3 className="text-2xl text-gray-900">Certificate Valid</h3>
                      <p className="text-gray-600">This certificate is authentic and verified</p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Certificate ID</label>
                        <p className="text-gray-900 mt-1">{verificationResult.id}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Student Name</label>
                        <p className="text-gray-900 mt-1">{verificationResult.studentName}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-600">Certificate Type</label>
                        <p className="text-gray-900 mt-1">{verificationResult.certificateType}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Department</label>
                        <p className="text-gray-900 mt-1">{verificationResult.department}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Grade</label>
                        <p className="text-gray-900 mt-1">{verificationResult.grade}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Issue Date</label>
                        <p className="text-gray-900 mt-1">
                          {verificationResult.issueDate
                            ? new Date(verificationResult.issueDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">NFT Hash</label>
                        <p className="text-gray-900 mt-1 font-mono text-sm break-all">{verificationResult.nftHash}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-600">Student Wallet</label>
                        <p className="text-gray-900 mt-1 font-mono text-sm break-all">{verificationResult.studentWalletAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Badge */}
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-blue-700" />
                      <div>
                        <p className="text-sm text-gray-900">Blockchain Verified</p>
                        <p className="text-xs text-gray-600">This certificate is secured on the blockchain</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <EmptyState
                    icon={XCircle}
                    title="Certificate Not Found"
                    description={verificationResult.message || "No matching certificate was found on-chain."}
                  />
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card className={subtlePanelClass}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl text-gray-900">Recent Verifications</h2>
              <p className="text-sm text-gray-600 mt-1">Latest certificate verifications</p>
            </div>
            <div className="divide-y divide-gray-200">
              {recentVerifications.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Search}
                    title="No verifications yet"
                    description="Certificate checks from this session will appear here."
                  />
                </div>
              ) : recentVerifications.map((verification) => (
                <div key={verification.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          verification.status === "Valid"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {verification.status === "Valid" ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-gray-900">{verification.certificateId}</p>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              verification.status === "Valid"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {verification.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {verification.studentName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {verification.verifiedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
