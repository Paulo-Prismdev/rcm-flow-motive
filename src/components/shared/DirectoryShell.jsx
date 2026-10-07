import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

/**
 * Shared chrome for all directory pages.
 * Standardises the header (icon + title + count + Add button),
 * an optional search row, an optional filters slot, and a
 * scrollable content area. Each directory supplies its own
 * table/cards as children.
 */
export default function DirectoryShell({
  icon: Icon,
  title,
  count,
  addLabel,
  onAdd,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  headerExtra,
  children,
}) {
  const hasSearch = search !== undefined && onSearchChange;
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border bg-card">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary flex-shrink-0" />}
            <span className="truncate">{title}</span>
          </h1>
          {count !== undefined && (
            <p className="text-xs text-muted-foreground mt-0.5">{count}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerExtra}
          {onAdd && (
            <Button onClick={onAdd} size="sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{addLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      {(hasSearch || filters) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-card">
          {hasSearch && (
            <div className="flex-1 min-w-0">
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {filters}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}