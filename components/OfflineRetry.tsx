"use client";

export default function OfflineRetry({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.location.reload()} className="btn-gold mt-8">
      {label}
    </button>
  );
}
