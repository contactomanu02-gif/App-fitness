"use client";
import { useEffect, useState } from "react";

/**
 * Mensaje del entrenador dentro del informe. En pantalla es un campo para escribir; al guardar el PDF
 * sale como texto (y no sale nada si quedó vacío). Se recuerda en este navegador por alumno y mes.
 */
export function CoachNote({ storageKey, signature }: { storageKey: string; signature: string | null }) {
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setText(localStorage.getItem(storageKey) ?? "");
    } catch {}
  }, [storageKey]);
  const save = (v: string) => {
    setText(v);
    try {
      if (v.trim()) localStorage.setItem(storageKey, v);
      else localStorage.removeItem(storageKey);
    } catch {}
  };
  return (
    <section className={text.trim() ? "rp-section rp-note" : "rp-section rp-note rp-empty-print"}>
      <h2 className="rp-h2">Mensaje de tu entrenador</h2>
      <textarea
        className="rp-note-input"
        value={text}
        onChange={(e) => save(e.target.value)}
        rows={4}
        maxLength={1200}
        placeholder="Escribí acá un mensaje para el alumno (opcional). Si lo dejás vacío, no sale en el PDF."
        aria-label="Mensaje para el alumno"
      />
      <p className="rp-note-text">{text}</p>
      {signature ? <p className="rp-note-sign">{signature}</p> : null}
    </section>
  );
}
