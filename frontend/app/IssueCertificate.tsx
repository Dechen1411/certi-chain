import { useState } from "react";
import { Award, Eye } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { FancySelect } from "./ui/fancy-select";
import { toast } from "sonner";
import { API_BASE_URL, parseApiError } from "../lib/api";
import {
  getReadableError,
} from "../lib/certificateRegistry";
import { CERTIFICATE_TYPE_OPTIONS } from "../lib/certificateTypes";
import { DEPARTMENT_OPTIONS } from "../lib/departments";
import {
  PageHeader,
  primaryActionClass,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function IssueCertificate() {
  const [formData, setFormData] = useState({
    // Student Details
    studentName: "",
    studentEmail: "",
    studentWalletAddress: "",
    studentId: "",
    department: "",
    
    // Certificate Details
    certificateType: "",
    grade: "",
    issueDate: new Date().toISOString().split('T')[0],
    completionDate: "",
    
    // Additional Info
    additionalNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastIssuedId, setLastIssuedId] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.studentName || !formData.studentEmail || !formData.certificateType || !formData.studentWalletAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/certificates/issue`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        studentName: formData.studentName,
        studentEmail: formData.studentEmail,
        studentId: formData.studentId,
        studentWalletAddress: formData.studentWalletAddress,
        department: formData.department,
        certificateType: formData.certificateType,
        grade: formData.grade,
        issueDate: formData.issueDate,
        completionDate: formData.completionDate,
        additionalNotes: formData.additionalNotes,
      }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = await response.json() as { certificateId: string; txHash: string };

      setLastIssuedId(payload.certificateId);
      toast.success(`Certificate ${payload.certificateId} issued for ${formData.studentName}`);

      // Reset form
      setFormData({
        studentName: "",
        studentEmail: "",
        studentWalletAddress: "",
        studentId: "",
        department: "",
        certificateType: "",
        grade: "",
        issueDate: new Date().toISOString().split('T')[0],
        completionDate: "",
        additionalNotes: "",
      });
    } catch (error) {
      toast.error(getReadableError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue Certificate"
        description="Issue a new certificate to a student wallet."
        backTo="/admin/dashboard"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          {/* Student Information */}
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Student Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="studentEmail">Student Email *</Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                  placeholder="john@college.edu"
                  required
                />
              </div>

              <div>
                <Label htmlFor="studentWalletAddress">Student Wallet Address *</Label>
                <Input
                  id="studentWalletAddress"
                  value={formData.studentWalletAddress}
                  onChange={(e) => setFormData({ ...formData, studentWalletAddress: e.target.value })}
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="STU-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <FancySelect
                  id="department"
                  value={formData.department}
                  placeholder="Select department"
                  options={DEPARTMENT_OPTIONS}
                  onChange={(department) => setFormData({ ...formData, department })}
                />
              </div>
            </div>
          </Card>

          {/* Certificate Details */}
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Certificate Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="certificateType">Certificate Type</Label>
                <FancySelect
                  id="certificateType"
                  value={formData.certificateType}
                  placeholder="Select certificate type"
                  options={CERTIFICATE_TYPE_OPTIONS}
                  onChange={(certificateType) => setFormData({ ...formData, certificateType })}
                />
              </div>

              <div>
                <Label htmlFor="grade">Grade/Classification</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="First Class Honors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="completionDate">Completion Date</Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={formData.completionDate}
                    onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 gap-2 ${primaryActionClass}`}
            >
              <Award className="w-4 h-4" />
              {isSubmitting ? "Issuing Certificate..." : "Issue Certificate"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => toast.info("The preview updates as you complete the form.")}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Certificate Preview</h2>
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-8 rounded-lg aspect-[1.414/1] flex flex-col justify-between text-white">
              {/* Header */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-white/30 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl mb-2">{formData.certificateType || "Certificate Template"}</h3>
                <p className="text-sm opacity-90">College Certificate</p>
              </div>

              {/* Body */}
              <div className="text-center space-y-4">
                <p className="text-sm opacity-90">This is to certify that</p>
                <div className="py-3 border-b-2 border-white/30">
                  <p className="text-xl">{formData.studentName || "Recipient Name"}</p>
                </div>
                <p className="text-sm opacity-90">
                  {formData.certificateType || "Certificate Type"}
                </p>
                {formData.grade && (
                  <p className="text-sm opacity-90">
                    with {formData.grade}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="text-center space-y-2">
                <p className="text-xs opacity-75">
                  {formData.issueDate ? `Issued on ${new Date(formData.issueDate).toLocaleDateString()}` : "Issue Date"}
                </p>
                {formData.department && (
                  <p className="text-xs opacity-75">{formData.department}</p>
                )}
                <div className="pt-4 border-t border-white/30">
                  <p className="text-xs opacity-75">Certificate ID: {lastIssuedId || "CERT-XXXX-XXX"}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
