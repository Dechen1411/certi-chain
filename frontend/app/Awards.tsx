import { Download, Eye, Search, Filter, Calendar, User, FileText, RefreshCcw } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import {
  getAllCertificates,
  getReadableError,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import {
  downloadCertificateHtml,
  downloadCsv,
  openCertificatePrintView,
} from "../lib/certificateArtifacts";
import { toast } from "sonner";
import {
  IconBadge,
  PageHeader,
  primaryActionClass,
  SearchPanel,
  StatCard,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function Awards() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "issued" | "revoked">("all");
  const [awards, setAwards] = useState<StudentCertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAwards = async () => {
    setIsLoading(true);
    try {
      setAwards(await getAllCertificates());
    } catch (error) {
      toast.error(getReadableError(error));
      setAwards([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAwards();
  }, []);

  const filteredAwards = awards.filter((award) => {
    const matchesSearch =
      award.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      award.certificateType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      award.certificateId.toLowerCase().includes(searchTerm.toLowerCase());

    const status = award.revoked ? "revoked" : "issued";
    const matchesFilter = filterStatus === "all" || status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const issuedCount = awards.filter((award) => !award.revoked).length;
  const revokedCount = awards.filter((award) => award.revoked).length;

  const handleExport = () => {
    downloadCsv("issued-certificates.csv", [
      ["Certificate ID", "Recipient", "Certificate", "Department", "Date", "Status", "Wallet"],
      ...filteredAwards.map((award) => [
        award.certificateId,
        award.studentName,
        award.certificateType,
        award.department || "",
        award.issueDate,
        award.revoked ? "Revoked" : "Issued",
        award.studentWalletAddress,
      ]),
    ]);
  };

  const handleView = (award: StudentCertificateRecord) => {
    try {
      openCertificatePrintView(award);
    } catch (error) {
      toast.error(getReadableError(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Awards"
        description="View and manage issued certificates."
        actions={
          <>
          <Button variant="outline" className="gap-2" onClick={() => void loadAwards()} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className={`gap-2 ${primaryActionClass}`} onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export All
          </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Awards" value={awards.length} icon={FileText} tone="blue" />
        <StatCard label="Issued" value={issuedCount} icon={FileText} tone="green" />
        <StatCard label="Revoked" value={revokedCount} icon={FileText} tone="amber" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <SearchPanel className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search awards..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </SearchPanel>
        <Card className={cn("p-4", subtlePanelClass)}>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                variant={filterStatus === "issued" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("issued")}
              >
                Issued
              </Button>
              <Button
                variant={filterStatus === "revoked" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("revoked")}
              >
                Revoked
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className={cn("overflow-hidden", subtlePanelClass)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Certificate #</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Recipient</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Certificate</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Department</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-6 py-3 text-right text-xs uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAwards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {isLoading ? "Loading awards..." : "No awards match this view."}
                  </td>
                </tr>
              ) : filteredAwards.map((award) => (
                <tr key={award.tokenId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{award.certificateId}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <IconBadge icon={User} tone="blue" className="h-8 w-8" />
                      <span className="text-sm text-gray-900">{award.studentName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{award.certificateType}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{award.department || "N/A"}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(award.issueDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={award.revoked ? "secondary" : "default"}
                      className={
                        award.revoked
                          ? "bg-red-100 text-red-700 hover:bg-red-100"
                          : "bg-green-100 text-green-700 hover:bg-green-100"
                      }
                    >
                      {award.revoked ? "Revoked" : "Issued"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleView(award)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={() => downloadCertificateHtml(award)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
