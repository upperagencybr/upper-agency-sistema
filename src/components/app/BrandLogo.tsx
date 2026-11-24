import { useEffect, useState } from "react";

type BrandLogoProps = {
  alt: string;
  className?: string;
};

export function BrandLogo({ alt, className }: BrandLogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDark(
      root.classList.contains("dark") ||
      root.getAttribute("data-theme") === "dark" ||
      root.style.colorScheme === "dark",
    );
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={isDark ? "/ultrax-attached-f41ae861-6454-4f3c-bcb7-374dde4b8a04.svg" : "/ultrax-attached-ebd24a04-dbab-4693-adfd-2e17996f643d.svg"}
      alt={alt}
      className={className}
      style={{ height: "auto", objectFit: "contain", backgroundColor: "transparent" }}
    />
  );
}
