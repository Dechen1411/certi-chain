import { FormEvent, useEffect, useState } from "react";
import { Ban, X } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  getReadableError,
  revokeCertificate,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import { toast } from "sonner";

interface RevokeCertificateDialogProps {
  certificate: StudentCertificateRecord | null;
  onClose: () => void;
  onRevoked: (certificate: StudentCertificateRecord) => void;
}

export function RevokeCertificateDialog({
  certificate,
  onClose,
  onRevoked,
}: RevokeCertificateDialogProps) {
  const [reason, setReason] = useState("Revoked by admin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (certificate) {
      setReason("Revoked by admin");
    }
  }, [certificate]);

  useEffect(() => {
    if (!certificate) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [certificate, isSubmitting, onClose]);

  if (!certificate) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const revokedCertificate = await revokeCertificate(certificate.certificateId, reason);
      onRevoked(revokedCertificate);
      toast.success(`Certificate ${certificate.certificateId} revoked`);
      onClose();
    } catch (error) {
      toast.error(getReadableError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <form
        className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-certificate-title"
        onSubmit={handleSubmit}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h2 id="revoke-certificate-title" className="text-xl font-semibold text-gray-950">
                Revoke certificate
              </h2>
              <p className="mt-1 break-all text-sm text-gray-600">
                {certificate.certificateId}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="revocation-reason">Revocation reason</Label>
          <Textarea
            id="revocation-reason"
            value={reason}
            maxLength={280}
            rows={4}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-xs text-gray-500">
            The reason is stored with the certificate record after on-chain revocation succeeds.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="gap-2"
            disabled={isSubmitting}
          >
            <Ban className="h-4 w-4" />
            {isSubmitting ? "Revoking..." : "Revoke"}
          </Button>
        </div>
      </form>
    </div>
  );
}
