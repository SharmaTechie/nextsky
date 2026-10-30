"use client";

import { Cloud, Github, ExternalLink } from "lucide-react";

interface HeaderProps {
  apiStatus: "connected" | "disconnected" | "checking";
}

export function Header({ apiStatus }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Cloud className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">NextSky</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              Cloud Nowcasting Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* API Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                apiStatus === "connected"
                  ? "bg-success"
                  : apiStatus === "checking"
                    ? "bg-warning animate-pulse"
                    : "bg-destructive"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {apiStatus === "connected"
                ? "API Connected"
                : apiStatus === "checking"
                  ? "Checking..."
                  : "API Offline"}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="View on GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-xs font-medium"
            >
              Documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
