"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { Card, CardHeader } from "@/components/ui/card";
import { getPushPublicKey, removePushSubscription, savePushSubscription } from "@/app/avisos-actions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const b64 = (buf: ArrayBuffer | null) =>
  buf
    ? btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : "";

function keyBytes(s: string) {
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

/** Activa o desactiva los avisos en este celular. */
export function PushToggle({ description, compact = false }: { description: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(ios && !installed ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      await registration();
      const reg = await navigator.serviceWorker.ready;
      const key = await getPushPublicKey();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
      const res = await savePushSubscription(
        { endpoint: sub.endpoint, p256dh: b64(sub.getKey("p256dh")), auth: b64(sub.getKey("auth")) },
        navigator.userAgent,
      );
      if (res.error) setError(res.error);
      else setState("on");
    } catch {
      setError("No pudimos activar los avisos en este celular. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  // Versión chica (pantalla de inicio): solo aparece mientras falta activarlos.
  if (compact && state !== "off" && state !== "ios-install") return null;
  if (compact)
    return (
      <Card data-testid="push-prompt">
        <CardHeader title="Avisos en el celular" />
        <div className="-mt-1 px-5 pb-5">{body()}</div>
      </Card>
    );
  return body();

  function body() {
    if (state === "loading") return <p className="text-sm text-muted-fg">Revisando…</p>;
    if (state === "ios-install")
      return (
        <p className="text-sm text-muted-fg">
          En iPhone, primero agregá la app a la pantalla de inicio: tocá <Share size={14} className="inline align-[-2px]" /> Compartir y
          después «Agregar a inicio». Abrila desde ese ícono y volvé acá para activar los avisos.
        </p>
      );
    if (state === "unsupported")
      return <p className="text-sm text-muted-fg">Este navegador no permite avisos. Probá desde Chrome o Safari en el celular.</p>;
    if (state === "denied")
      return (
        <p className="text-sm text-muted-fg">
          Los avisos están bloqueados para esta app. Activalos desde los ajustes del celular (Notificaciones) y volvé a entrar.
        </p>
      );

    return (
      <div className="space-y-3">
        <FormError message={error} />
        <p className="text-sm text-muted-fg">{state === "on" ? "Los avisos están activados en este celular." : description}</p>
        {state === "on" ? (
          <Button type="button" variant="outline" size="sm" onClick={disable} disabled={busy} data-testid="push-off">
            <BellOff size={16} /> Desactivar avisos
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={enable} disabled={busy} data-testid="push-on">
            <Bell size={16} /> {busy ? "Activando…" : "Activar avisos"}
          </Button>
        )}
      </div>
    );
  }
}
