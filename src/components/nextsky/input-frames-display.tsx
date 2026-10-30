"use client";

import { useMemo } from "react";
import { ImageViewer } from "./image-viewer";
import { ArrowRight } from "lucide-react";

interface InputFramesDisplayProps {
  files: File[];
}

const TIME_LABELS = [
  { label: "t-45", sublabel: "-45 min" },
  { label: "t-30", sublabel: "-30 min" },
  { label: "t-15", sublabel: "-15 min" },
  { label: "t=0", sublabel: "Current" },
];

export function InputFramesDisplay({ files }: InputFramesDisplayProps) {
  const previewUrls = useMemo(() => {
    return files.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      // For HDF5 files, show a placeholder
      return null;
    });
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8">
        <p className="text-center text-sm text-muted-foreground">
          Upload satellite frames to view input sequence
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Input Sequence</h3>
      <div className="flex items-center gap-2">
        {files.map((file, index) => (
          <div key={`frame-${index}`} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {previewUrls[index] ? (
                <ImageViewer
                  src={previewUrls[index] as string || "/placeholder.svg"}
                  alt={`Input frame ${TIME_LABELS[index].label}`}
                  label={TIME_LABELS[index].label}
                  sublabel={TIME_LABELS[index].sublabel}
                  className="w-full"
                />
              ) : (
                <div className="aspect-square rounded-lg border border-border bg-muted flex flex-col items-center justify-center p-2">
                  <span className="text-xs font-mono text-primary">
                    {TIME_LABELS[index].label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    (HDF5 Data)
                  </span>
                </div>
              )}
            </div>
            {index < files.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
