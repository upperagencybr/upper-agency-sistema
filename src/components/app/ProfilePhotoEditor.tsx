import { useI18n } from "@/lib/i18n-context";
import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ZoomIn, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProfilePhotoEditor({ source, onClose, onSave }: { source: File | string | null; onClose: () => void; onSave: (file: File) => Promise<void> }) {
  const { tr } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null); setError("");
    if (!source) { setUrl(null); return; }
    const next = typeof source === "string" ? source : URL.createObjectURL(source);
    setUrl(next);
    return () => { if (typeof source !== "string") URL.revokeObjectURL(next); };
  }, [source]);
  const save = async () => {
    if (!url || !area) return;
    setSaving(true); setError("");
    try {
      const image = new Image(); image.crossOrigin = "anonymous"; image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível ajustar a foto.");
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Não foi possível salvar a foto.")), "image/jpeg", 0.92));
      await onSave(new File([blob], "foto-perfil.jpg", { type: "image/jpeg" }));
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : tr("Não foi possível salvar a foto.")); }
    finally { setSaving(false); }
  };
  return <Dialog open={!!source} onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-md" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{tr("Ajustar foto do perfil")}</DialogTitle></DialogHeader>
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {url && <Cropper image={url} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} />}
      </div>
      <label className="flex items-center gap-3 text-sm"><ZoomIn className="h-4 w-4" />{tr("Zoom")}<input aria-label={tr("Zoom da foto")} type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="min-w-0 flex-1 accent-primary" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label={tr("Restaurar enquadramento")} title={tr("Restaurar enquadramento")} disabled={saving} onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}><RotateCcw className="h-4 w-4" /></Button>
        <div className="flex gap-2"><Button variant="outline" disabled={saving} onClick={onClose}>{tr("Cancelar")}</Button><Button disabled={saving || !area} onClick={() => void save()}>{saving ? tr("Salvando…") : tr("Salvar foto")}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}