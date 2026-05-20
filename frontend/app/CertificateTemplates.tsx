import { Plus, Search, Eye, Edit, Trash2, Copy, Award } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  CertificateTemplate,
  deleteCertificateTemplate,
  duplicateCertificateTemplate,
  getCertificateTemplates,
} from "../lib/templateStore";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  SearchPanel,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function CertificateTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshTemplates = async () => {
    setIsLoading(true);
    try {
      const nextTemplates = await getCertificateTemplates();
      setTemplates(nextTemplates);
      setPreviewTemplate((current) => {
        if (!current) {
          return nextTemplates[0] || null;
        }
        return nextTemplates.find((template) => template.id === current.id) || nextTemplates[0] || null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load templates");
      setTemplates([]);
      setPreviewTemplate(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicateCertificateTemplate(id);
      if (!duplicated) {
        toast.error("Template not found");
        return;
      }

      toast.success("Template copied");
      await refreshTemplates();
      setPreviewTemplate(duplicated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy template");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this certificate template?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteCertificateTemplate(id);
      toast.success("Template deleted");
      await refreshTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete template");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Templates"
        description="Create and manage reusable certificate designs."
        actions={
          <Link to="/admin/dashboard/create-certificate">
            <Button className={`gap-2 ${primaryActionClass}`}>
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </Link>
        }
      />

      <SearchPanel>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
      </SearchPanel>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <Card className={cn("p-8 md:col-span-2", subtlePanelClass)}>
              <EmptyState
                icon={Award}
                title="Loading templates"
                description="Loading saved certificate templates."
              />
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card className={cn("p-8 md:col-span-2", subtlePanelClass)}>
              <EmptyState
                icon={Award}
                title={templates.length === 0 ? "No templates yet" : "No matching templates"}
                description={
                  templates.length === 0
                    ? "Create a reusable template before issuing certificates at scale."
                    : "Try a different template name, description, or category."
                }
                action={
                  templates.length === 0 ? (
                    <Link to="/admin/dashboard/create-certificate">
                      <Button className={primaryActionClass}>Create Template</Button>
                    </Link>
                  ) : undefined
                }
              />
            </Card>
          ) : filteredTemplates.map((template) => (
            <Card key={template.id} className={cn("transition-all hover:shadow-md overflow-hidden", subtlePanelClass)}>
              <div className={`h-40 bg-gradient-to-br ${template.color} p-6 flex items-center justify-center relative`}>
                <div className="text-center text-white">
                  <IconBadge icon={Award} tone="slate" className="mx-auto mb-3 h-16 w-16 border-white/30 bg-white/15 text-white" />
                  <p className="text-sm opacity-90">{template.title || "Certificate Preview"}</p>
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
                  {template.uses} uses
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg text-gray-900">{template.name}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {template.category || "General"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{template.description || "No description provided."}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Link to={`/admin/dashboard/create-certificate?templateId=${template.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleDuplicate(template.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700"
                    onClick={() => void handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className={cn("p-6 h-fit", subtlePanelClass)}>
          <h2 className="text-xl text-gray-900 mb-4">Preview</h2>
          {previewTemplate ? (
            <div className={`bg-gradient-to-br ${previewTemplate.color} p-6 rounded-lg aspect-[1.414/1] flex flex-col justify-between text-white`}>
              <div className="text-center">
                <IconBadge icon={Award} tone="slate" className="mx-auto mb-3 h-14 w-14 border-white/30 bg-white/15 text-white" />
                <h3 className="text-xl mb-1">{previewTemplate.title}</h3>
              </div>
              <div className="text-center space-y-3">
                <p className="text-xs opacity-90">{previewTemplate.subtitle || "This is to certify that"}</p>
                <div className="py-2 border-b-2 border-white/30">
                  <p className="text-base">Recipient Name</p>
                </div>
                <p className="text-xs opacity-90">{previewTemplate.body || "Certificate body text"}</p>
              </div>
              <div className="text-center">
                <p className="text-xs opacity-75">{previewTemplate.footer || "Footer text"}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title="No preview selected"
              description="Select a template to preview it."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
