import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import PageHeader from "./PageHeader";

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
      <PageHeader
        className={`px-3 sm:px-5 pt-4 pb-3 ${hasSearch || filters ? '' : 'border-b border-border'}`}
        icon={Icon}
        title={title}
        subtitle={count}
        actions={(headerExtra || onAdd) && (
          <>
            {headerExtra}
            {onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{addLabel}</span>
              </Button>
            )}
          </>
        )}
      />

      {/* Search + filters */}
      {(hasSearch || filters) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 sm:px-5 pb-3 border-b border-border">
          {hasSearch && (
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" aria-hidden="true" />
              <Input
                className="pl-8"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
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