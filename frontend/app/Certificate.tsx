import { useEffect, useState } from "react";
import { Award, Download, Eye, Plus, RefreshCcw, Search } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router";
import {
  getAllCertificates,
  getReadableError,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import {
  downloadCertificateHtml,
  openCertificatePrintView,
} from "../lib/certificateArtifacts";
import { toast } from "sonner";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  SearchPanel,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function Certificates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [certificates, setCertificates] = useState<StudentCertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      setCertificates(await getAllCertificates());
    } catch (error) {
      toast.error(getReadableError(error));
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCertificates();
  }, []);

  const filteredCertificates = certificates.filter((certificate) =>
    certificate.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.certificateType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleView = (certificate: StudentCertificateRecord) => {
    try {
      openCertificatePrintView(certificate);
    } catch (error) {
      toast.error(getReadableError(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issued Certificates"
        description="Search and review certificates recorded on-chain."
        actions={
          <>
          <Button variant="outline" className="gap-2" onClick={() => void loadCertificates()} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/admin/dashboard/issue-certificate">
            <Button className={`gap-2 ${primaryActionClass}`}>
              <Plus className="w-4 h-4" />
              Issue Certificate
            </Button>
          </Link>
          </>
        }
      />

      <SearchPanel>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search certificates..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
      </SearchPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCertificates.length === 0 ? (
          <Card className={cn("p-8 md:col-span-2 lg:col-span-3", subtlePanelClass)}>
            <EmptyState
              icon={Award}
              title={isLoading ? "Loading certificates" : "No certificates found"}
              description={
                isLoading
                  ? "Fetching certificate records from the blockchain."
                  : "Issued certificates will appear here after successful transactions."
              }
            />
          </Card>
        ) : filteredCertificates.map((certificate) => (
          <Card key={certificate.tokenId} className={cn("transition-all hover:shadow-md overflow-hidden", subtlePanelClass)}>
            <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-900 p-6 flex items-center justify-center relative">
              <div className="text-center text-white">
                <IconBadge icon={Award} tone="slate" className="mx-auto mb-3 h-16 w-16 border-white/30 bg-white/15 text-white" />
                <p className="text-sm opacity-90">{certificate.certificateType}</p>
              </div>
              <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs ${
                certificate.revoked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}>
                {certificate.revoked ? "Revoked" : "Valid"}
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg text-gray-900">{certificate.certificateId}</h3>
                </div>
                <p className="text-sm text-gray-600">{certificate.studentName}</p>
                <p className="text-sm text-gray-500">{new Date(certificate.issueDate).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => handleView(certificate)}>
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCertificateHtml(certificate)}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
