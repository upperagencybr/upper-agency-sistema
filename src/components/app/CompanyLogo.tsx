import { Building2 } from "lucide-react";
import { useSignedUrl } from "@/lib/data";

export function CompanyLogo({ path, className = "h-12 w-12" }: { path: string | null; className?: string }) {
  const { data: url } = useSignedUrl(path);
  if (!url) return <div className={`${className} flex items-center justify-center rounded bg-muted`}><Building2 className="h-5 w-5 text-muted-foreground" /></div>;
  return <img src={url} alt="" className={`${className} rounded bg-muted object-contain`} />;
}

