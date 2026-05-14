import { Save, Eye, Award } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getCertificateTemplate,
  saveCertificateTemplate,
} from "../lib/templateStore";
import {
  PageHeader,
  primaryActionClass,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

const emptyTemplate = {
  name: "",
  category: "",
  description: "",
  title: "",
  subtitle: "",
  body: "",
  footer: "",
  color: "from-slate-700 to-slate-900",
};

export function CreateCertificate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";
  const [certificateData, setCertificateData] = useState(emptyTemplate);

  useEffect(() => {
    if (!templateId) {
      setCertificateData(emptyTemplate);
      return;
    }

    const template = getCertificateTemplate(templateId);
    if (!template) {
      toast.error("Template not found");
      return;
    }

    setCertificateData({
      name: template.name,
      category: template.category,
      description: template.description,
      title: template.title,
      subtitle: template.subtitle,
      body: template.body,
      footer: template.footer,
      color: template.color,
    });
  }, [templateId]);

  const colorOptions = [
    { value: "from-blue-400 to-blue-600", label: "Blue", className: "bg-gradient-to-r from-blue-400 to-blue-600" },
    { value: "from-purple-400 to-purple-600", label: "Purple", className: "bg-gradient-to-r from-purple-400 to-purple-600" },
    { value: "from-green-400 to-green-600", label: "Green", className: "bg-gradient-to-r from-green-400 to-green-600" },
    { value: "from-orange-400 to-orange-600", label: "Orange", className: "bg-gradient-to-r from-orange-400 to-orange-600" },
    { value: "from-pink-400 to-pink-600", label: "Pink", className: "bg-gradient-to-r from-pink-400 to-pink-600" },
    { value: "from-indigo-400 to-indigo-600", label: "Indigo", className: "bg-gradient-to-r from-indigo-400 to-indigo-600" },
  ];

  const handleSave = () => {
    if (!certificateData.name.trim() || !certificateData.title.trim()) {
      toast.error("Template name and title are required");
      return;
    }

    saveCertificateTemplate({
      id: templateId || undefined,
      ...certificateData,
    });

    toast.success(templateId ? "Template updated" : "Template saved");
    navigate("/admin/dashboard/templates");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={templateId ? "Edit Certificate Template" : "Create Certificate Template"}
        description="Design a reusable certificate template."
        backTo="/admin/dashboard/templates"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Template Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={certificateData.name}
                  onChange={(event) => setCertificateData({ ...certificateData, name: event.target.value })}
                  placeholder="e.g., Excellence Award"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={certificateData.category}
                  onChange={(event) => setCertificateData({ ...certificateData, category: event.target.value })}
                  placeholder="e.g., Achievement"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={certificateData.description}
                  onChange={(event) => setCertificateData({ ...certificateData, description: event.target.value })}
                  placeholder="Brief description of this certificate"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Certificate Content</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={certificateData.title}
                  onChange={(event) => setCertificateData({ ...certificateData, title: event.target.value })}
                  placeholder="Certificate of Achievement"
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={certificateData.subtitle}
                  onChange={(event) => setCertificateData({ ...certificateData, subtitle: event.target.value })}
                  placeholder="This is to certify that"
                />
              </div>

              <div>
                <Label htmlFor="body">Body Text</Label>
                <Textarea
                  id="body"
                  value={certificateData.body}
                  onChange={(event) => setCertificateData({ ...certificateData, body: event.target.value })}
                  rows={3}
                  placeholder="has successfully completed the requirements"
                />
              </div>

              <div>
                <Label htmlFor="footer">Footer Text</Label>
                <Input
                  id="footer"
                  value={certificateData.footer}
                  onChange={(event) => setCertificateData({ ...certificateData, footer: event.target.value })}
                  placeholder="Issued by CertiChain"
                />
              </div>
            </div>
          </Card>

          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Color Theme</h2>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.label}
                  onClick={() => setCertificateData({ ...certificateData, color: color.value })}
                  className={`h-20 rounded-lg ${color.className} ${
                    certificateData.color === color.value
                      ? "ring-4 ring-offset-2 ring-blue-500"
                      : "hover:scale-105"
                  } transition-all`}
                />
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              className={`flex-1 gap-2 ${primaryActionClass}`}
            >
              <Save className="w-4 h-4" />
              Save Template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => toast.info("The live preview updates as you edit.")}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 h-fit">
          <Card className={cn("p-6", subtlePanelClass)}>
            <h2 className="text-xl text-gray-900 mb-4">Live Preview</h2>
            <div className={`bg-gradient-to-br ${certificateData.color} p-8 rounded-lg aspect-[1.414/1] flex flex-col justify-between text-white`}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-white/30 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-2xl mb-2">{certificateData.title || "Certificate Title"}</h3>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm opacity-90">{certificateData.subtitle || "This is to certify that"}</p>
                <div className="py-3 border-b-2 border-white/30">
                  <p className="text-xl">Recipient Name</p>
                </div>
                <p className="text-sm opacity-90">{certificateData.body || "Certificate body text"}</p>
              </div>

              <div className="text-center">
                <p className="text-xs opacity-75">{certificateData.footer || "Footer text"}</p>
                <p className="text-xs opacity-75 mt-1">Date</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
