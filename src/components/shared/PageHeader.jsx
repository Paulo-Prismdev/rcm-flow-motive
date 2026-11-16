import React from "react";
import { cn } from "@/lib/utils";

/**
 * The one place a page title appears (RCM Flowmotive design system, PageHeader).
 * Title in the page-title style, an optional count or one-line subtitle under it,
 * filters or a segmented control in the middle, and the page's actions on the
 * right — one primary button at most, the rest in a More menu.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  filters,
  actions,
  className,
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h1 className="text-page-title flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle !== undefined && subtitle !== null && subtitle !== "" && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      {actions && <div className="ml-auto flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
