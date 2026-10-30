"use client";

import React from "react"

import { useCallback, useState } from "react";
import { Upload, X, FileImage, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFiles } from "@/lib/api";

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onClear: () => void;
  disabled?: boolean;
}

const TIME_LABELS = ["t-45", "t-30", "t-15", "t=0"];

export function UploadDropzone({
  onFilesSelected,
  files,
  onClear,
  disabled,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      const processFile = async (file: File): Promise<File> => {
        // Keep HDF5 unchanged
        if (file.name.endsWith('.h5') || file.name.endsWith('.hdf5')) return file;

        // Only resize common image types to 256x256 to match model input
        if (file.type === 'image/png' || file.type === 'image/jpeg') {
          try {
            const imageBitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
              const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve as any, file.type));
              if (blob) {
                return new File([blob], file.name, { type: file.type });
              }
            }
          } catch (err) {
            // fallback: return original file
            return file;
          }
        }

        return file;
      };

      (async () => {
        const processed = await Promise.all(fileArray.map(processFile));
        const validation = validateFiles(processed);

        if (!validation.valid) {
          setError(validation.error || "Invalid files");
          return;
        }

        setError(null);
        onFilesSelected(processed);
      })();
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      handleFiles(droppedFiles);
    },
    [disabled, handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Input Frames (t-45 to t=0)
        </h3>
        {files.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>

      {files.length === 0 ? (
        <label
          className={cn(
            "relative flex flex-col items-center justify-center",
            "h-48 rounded-lg border-2 border-dashed cursor-pointer",
            "transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".h5,.hdf5,.png"
            onChange={handleInputChange}
            disabled={disabled}
            className="sr-only"
          />
          <Upload
            className={cn(
              "h-10 w-10 mb-3 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="text-sm font-medium text-foreground">
            Drop 4 satellite frames here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse (.h5, .hdf5, .png)
          </p>
          <div className="flex items-center gap-2 mt-4">
            {TIME_LABELS.map((label) => (
              <span
                key={label}
                className="px-2 py-1 text-xs font-mono bg-secondary rounded text-secondary-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        </label>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group rounded-lg border border-border bg-card overflow-hidden"
            >
              <div className="aspect-square flex flex-col items-center justify-center p-3">
                <FileImage className="h-8 w-8 text-primary mb-2" />
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-full px-1">
                  {file.name}
                </span>
              </div>
              <div className="absolute top-0 left-0 right-0 bg-secondary/90 px-2 py-1">
                <span className="text-[10px] font-mono font-medium text-secondary-foreground">
                  {TIME_LABELS[index]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
