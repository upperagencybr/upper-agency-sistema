import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CoverVideo({ src, poster }: { src: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (media.matches) video.current?.pause();
      else void video.current?.play().catch(() => setPlaying(false));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const toggle = () => {
    if (!video.current) return;
    if (video.current.paused) void video.current.play().catch(() => setPlaying(false));
    else video.current.pause();
  };

  return <>
    <video ref={video} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Demonstração do Dashboard e Financeiro do NEXO HUB com dados fictícios" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
    <div className="absolute bottom-5 right-5 z-10 flex gap-2">
      <Button size="icon" variant="secondary" onClick={toggle} title={playing ? "Pausar demonstração" : "Reproduzir demonstração"} aria-label={playing ? "Pausar demonstração" : "Reproduzir demonstração"}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
      <Button size="icon" variant="secondary" onClick={() => setExpanded(true)} title="Ampliar demonstração" aria-label="Ampliar demonstração"><Maximize2 className="h-4 w-4" /></Button>
    </div>
    <Dialog open={expanded} onOpenChange={setExpanded}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>NEXO HUB, demonstração com dados fictícios</DialogTitle></DialogHeader>
        {expanded && <video src={src} poster={poster} controls autoPlay muted loop playsInline className="h-auto w-full" />}
      </DialogContent>
    </Dialog>
  </>;
}