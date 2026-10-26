import React from "react";
import { directoryTagNames } from "@/components/shared/directoryTags";

const TONES = {
  Client: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Third Party": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

/** The role tags on a directory record — Client, Third Party, or both. */
export default function DirectoryTagPills({ record, className = "" }) {
  const names = directoryTagNames(record);
  if (!names.length) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {names.map((name) => (
        <span key={name} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${TONES[name]}`}>
          {name}
        </span>
      ))}
    </span>
  );
}