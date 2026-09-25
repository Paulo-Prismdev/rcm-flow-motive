import React from "react";
import ClientDirectoryTab from "@/components/settings/ClientDirectoryTab";

export default function ClientDirectory() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <ClientDirectoryTab />
    </div>
  );
}