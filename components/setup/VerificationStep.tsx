"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, XCircle, FileImage, Shield, ArrowRight } from "lucide-react";
import { Button } from "@heroui/react";

interface VerificationResult {
  status: "verified" | "rejected";
  reason: string;
  extractedName: string;
  extractedAddress: string;
}

interface VerificationStepProps {
  propertyId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function VerificationStep({ propertyId, onComplete, onSkip }: VerificationStepProps) {
  const [docType, setDocType] = useState("Electricity Bill");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Please upload an image file (JPG or PNG)");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File too large. Please upload an image under 10MB.");
      return;
    }

    setFile(selected);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  };

  const handleVerify = async () => {
    if (!file) return;
    setVerifying(true);
    setError("");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          imageBase64: base64,
          fileName: file.name,
          docType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    }

    setVerifying(false);
  };

  const handleRetry = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  if (result?.status === "verified") {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Property Verified!</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Your document has been verified by our AI. Your property is now visible to potential tenants.
        </p>
        {result.extractedAddress && (
          <p className="text-xs text-slate-500 mt-3 bg-slate-50 inline-block px-3 py-1.5 rounded-lg">
            Address found: {result.extractedAddress}
          </p>
        )}
        <div className="mt-8">
          <Button variant="primary" size="lg" onClick={onComplete}>
            Go to Dashboard
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  if (result?.status === "rejected") {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          {result.reason}
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="primary" onClick={handleRetry}>
            Try Again
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Skip for Now
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          You can verify later from your dashboard. Your property won&apos;t be visible to visitors until verified.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Verify Your Property</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Upload a document to verify ownership. This helps tenants trust your listing.
          Your PG will be visible to visitors once verified.
        </p>
      </div>

      <div className="space-y-5">
        {/* Document type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
          <div className="grid grid-cols-2 gap-2">
            {["Electricity Bill", "Property Tax", "Rental Agreement", "Society NOC"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDocType(t)}
                className={`px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                  docType === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Upload Document</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            <div className="relative border border-slate-200 rounded-xl overflow-hidden">
              <img src={preview} alt="Document preview" className="w-full max-h-64 object-contain bg-slate-50" />
              <button
                type="button"
                onClick={handleRetry}
                className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-white/90 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            >
              <FileImage size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to upload</p>
              <p className="text-xs text-slate-400 mt-1">JPG or PNG, max 10MB</p>
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleVerify}
            isDisabled={!file || verifying}
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying with AI...
              </>
            ) : (
              <>
                <Upload size={16} />
                Verify Document
              </>
            )}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Skip for now
          </button>
          <p className="text-xs text-slate-400 mt-1">
            Your property won&apos;t be visible to visitors until verified.
          </p>
        </div>
      </div>
    </div>
  );
}
