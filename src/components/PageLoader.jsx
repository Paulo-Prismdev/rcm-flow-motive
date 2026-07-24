import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full min-h-[40vh] text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin opacity-60" />
    </div>
  );
}