import { useState } from "react";
import { Upload, Users, Award, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { getReadableError } from "../lib/certificateRegistry";
import {
  EmptyState,
  PageHeader,
  primaryActionClass,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000/api";

interface Student {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  studentId: string;
  grade: string;
}

interface BulkIssueResponse {
  total: number;
  succeeded: number;
  failedCount: number;
  issued: Array<{
    certificateId: string;
    txHash: string;
    studentName: string;
    studentEmail: string;
  }>;
  failed: Array<{
    studentName: string;
    studentEmail: string;
    message: string;
  }>;
}

const createEmptyStudent = (): Student => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  email: "",
  walletAddress: "",
  studentId: "",
  grade: "",
});

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
};

const normalizeHeader = (header: string): string => {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const getCell = (row: string[], headerIndex: Record<string, number>, names: string[]): string => {
  const index = names
    .map((name) => headerIndex[normalizeHeader(name)])
    .find((value) => value !== undefined);

  return index === undefined ? "" : row[index] || "";
};

const studentsFromCsv = (text: string): Student[] => {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  const headerIndex = headers.reduce<Record<string, number>>((acc, header, index) => {
    acc[header] = index;
    return acc;
  }, {});

  return rows.slice(1)
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: getCell(row, headerIndex, ["name", "studentName", "student name"]),
      email: getCell(row, headerIndex, ["email", "studentEmail", "student email"]),
      walletAddress: getCell(row, headerIndex, [
        "wallet",
        "walletAddress",
        "wallet address",
        "studentWalletAddress",
        "student wallet address",
      ]),
      studentId: getCell(row, headerIndex, ["studentId", "student id", "id"]),
      grade: getCell(row, headerIndex, ["grade", "classification"]),
    }));
};

export function BulkIssueCertificate() {
  const [department, setDepartment] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [completionDate, setCompletionDate] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<BulkIssueResponse | null>(null);

  const addStudent = () => {
    setStudents((current) => [...current, createEmptyStudent()]);
  };

  const removeStudent = (id: string) => {
    setStudents((current) => current.filter((student) => student.id !== id));
  };

  const updateStudent = (id: string, field: keyof Student, value: string) => {
    setStudents((current) =>
      current.map((student) => (student.id === id ? { ...student, [field]: value } : student)),
    );
  };

  const handleBulkIssue = async () => {
    setLastResult(null);

    if (!certificateType.trim()) {
      toast.error("Please enter a certificate type");
      return;
    }

    if (students.length === 0) {
      toast.error("Add at least one student");
      return;
    }

    const invalidStudents = students.filter((student) => {
      return !student.name.trim() || !student.email.trim() || !student.walletAddress.trim();
    });
    if (invalidStudents.length > 0) {
      toast.error("Every student needs a name, email, and wallet address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/certificates/bulk-issue`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          certificateType,
          department,
          issueDate,
          completionDate,
          students,
        }),
      });

      const payload = await response.json() as BulkIssueResponse | { message?: string };
      if (!response.ok) {
        throw new Error("message" in payload ? payload.message || "Bulk issue failed" : "Bulk issue failed");
      }

      const result = payload as BulkIssueResponse;
      setLastResult(result);

      if (result.failedCount > 0) {
        toast.success(`${result.succeeded} issued, ${result.failedCount} failed`);
      } else {
        toast.success(`Successfully issued ${result.succeeded} certificates`);
        setStudents([]);
      }
    } catch (error) {
      toast.error(getReadableError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const importedStudents = studentsFromCsv(await file.text());
      if (importedStudents.length === 0) {
        toast.error("CSV must include headers for name, email, and wallet address");
        return;
      }

      setStudents((current) => [...current, ...importedStudents]);
      toast.success(`Imported ${importedStudents.length} students`);
    } catch (error) {
      toast.error(getReadableError(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Issue Certificates"
        description="Issue certificates to multiple student wallets at once."
        backTo="/admin/dashboard"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Certificate Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certificateType">Certificate Type</Label>
                  <Input
                    id="certificateType"
                    value={certificateType}
                    onChange={(event) => setCertificateType(event.target.value)}
                    placeholder="Bachelor of Science in Computer Science"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="completionDate">Completion Date</Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={completionDate}
                    onChange={(event) => setCompletionDate(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Upload Student List</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 mb-2">Upload CSV file</p>
              <p className="text-sm text-gray-500 mb-4">
                Headers: name, email, walletAddress, studentId, grade
              </p>
              <label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                    Choose CSV
                  </span>
                </Button>
              </label>
            </div>
          </Card>

          <Card className={cn("p-6", subtlePanelClass)}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-gray-900">Student Details</h2>
              <Button onClick={addStudent} variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Student
              </Button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {students.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No students added"
                  description="Add a student row manually or upload a CSV to begin."
                />
              ) : students.map((student, index) => (
                <div key={student.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Student {index + 1}</span>
                    <Button
                      onClick={() => removeStudent(student.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Student Name *"
                      value={student.name}
                      onChange={(event) => updateStudent(student.id, "name", event.target.value)}
                    />
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={student.email}
                      onChange={(event) => updateStudent(student.id, "email", event.target.value)}
                    />
                    <Input
                      placeholder="Wallet Address *"
                      value={student.walletAddress}
                      onChange={(event) => updateStudent(student.id, "walletAddress", event.target.value)}
                    />
                    <Input
                      placeholder="Student ID"
                      value={student.studentId}
                      onChange={(event) => updateStudent(student.id, "studentId", event.target.value)}
                    />
                    <Input
                      placeholder="Grade"
                      value={student.grade}
                      onChange={(event) => updateStudent(student.id, "grade", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleBulkIssue}
            disabled={isSubmitting}
            className={`w-full gap-2 ${primaryActionClass}`}
          >
            <Award className="w-4 h-4" />
            {isSubmitting
              ? "Issuing..."
              : `Issue ${students.length} Certificate${students.length === 1 ? "" : "s"}`}
          </Button>
        </div>

        <div className="space-y-6">
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Students</span>
                <span className="text-gray-900 font-medium">{students.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Certificate</span>
                <span className="text-gray-900 font-medium text-right">{certificateType || "Not specified"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Department</span>
                <span className="text-gray-900 font-medium">{department || "Not specified"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Issue Date</span>
                <span className="text-gray-900 font-medium">
                  {new Date(issueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Ready to issue {students.length} certificate{students.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </Card>

          {lastResult && (
            <Card className={cn("p-6", subtlePanelClass)}>
              <h2 className="text-xl text-gray-900 mb-4">Last Bulk Run</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>{lastResult.succeeded} issued</span>
                </div>
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <span>{lastResult.failedCount} failed</span>
                </div>
                {lastResult.issued.slice(0, 3).map((item) => (
                  <div key={item.certificateId} className="text-sm text-gray-700 border-t border-gray-100 pt-2">
                    {item.studentName}: {item.certificateId}
                  </div>
                ))}
                {lastResult.failed.slice(0, 3).map((item) => (
                  <div key={`${item.studentEmail}-${item.message}`} className="text-sm text-red-700 border-t border-gray-100 pt-2">
                    {item.studentName || item.studentEmail}: {item.message}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Preview</h2>
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6 rounded-lg aspect-[1.414/1] flex flex-col justify-between text-white text-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 border-4 border-white/30 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg mb-1">{certificateType || "Certificate Type"}</h3>
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs opacity-90">This is to certify that</p>
                <div className="py-2 border-b-2 border-white/30">
                  <p className="text-base">Student Name</p>
                </div>
                <p className="text-xs opacity-90">{certificateType || "Certificate Type"}</p>
              </div>

              <div className="text-center">
                <p className="text-xs opacity-75">
                  {new Date(issueDate).toLocaleDateString()}
                </p>
                <p className="text-xs opacity-75">{department}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
