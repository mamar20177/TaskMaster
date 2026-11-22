import { forwardRef, useImperativeHandle, useRef, useState, type ClipboardEvent } from "react";
import { InputAdornment, TextField } from "@mui/material";
import { Inbox as InboxIcon } from "@mui/icons-material";
import { createTask } from "../../api/tasksApi";
import { useNotify } from "../../context/NotifyContext";

interface Props {
  /** Nach jedem erfassten Gedanken (z. B. Liste neu laden). */
  onCaptured?: (title: string) => void;
  autoFocus?: boolean;
}

export interface QuickCaptureHandle {
  /** Übernimmt einen noch getippten Gedanken und wartet, bis alles gespeichert ist. */
  flush: () => Promise<void>;
}

/**
 * GTD „Sammeln“: ein Gedanke pro Enter, ohne Kategorie und Status –
 * landet damit automatisch im Eingangskorb. Das Feld wird sofort geleert und
 * bleibt fokussiert, damit man ohne Klick weitertippen kann; gespeichert wird
 * der Reihe nach im Hintergrund. Eingefügter Text mit mehreren Zeilen wird zu
 * einem Eintrag pro Zeile.
 */
export const QuickCapture = forwardRef<QuickCaptureHandle, Props>(function QuickCapture({ onCaptured, autoFocus = false }, ref) {
  const notify = useNotify();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  /** Kette der laufenden Speichervorgänge – hält die Reihenfolge ein. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  const capture = (titles: string[]) => {
    if (titles.length === 0) return queue.current;
    setText("");
    inputRef.current?.focus();
    queue.current = queue.current.then(async () => {
      let done = 0;
      try {
        for (const title of titles) {
          await createTask({ title });
          done++;
          onCaptured?.(title);
        }
        if (titles.length > 1) notify(`${titles.length} Gedanken erfasst`);
      } catch {
        // Nicht Gespeichertes zurück ins Feld, damit nichts verloren geht.
        const rest = titles.slice(done).join(" ");
        setText((current) => (current ? `${rest} ${current}` : rest));
        notify(done > 0 ? `Nur ${done} von ${titles.length} Gedanken erfasst` : "Konnte nicht erfasst werden", "error");
      }
    });
    return queue.current;
  };

  useImperativeHandle(ref, () => ({
    flush: () => capture(text.trim() ? [text.trim()] : []),
  }));

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const lines = e.clipboardData.getData("text")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim()) // Aufzählungszeichen weglassen
      .filter(Boolean);
    if (lines.length < 2) return; // eine Zeile: normal einfügen
    e.preventDefault();
    void capture(text.trim() ? [text.trim(), ...lines] : lines);
  };

  return (
    <TextField
      fullWidth size="small" autoFocus={autoFocus} inputRef={inputRef}
      placeholder="Was geht dir durch den Kopf? (Enter = in den Eingangskorb)"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onPaste={handlePaste}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void capture(text.trim() ? [text.trim()] : []); } }}
      inputProps={{ enterKeyHint: "send" }}
      InputProps={{ startAdornment: <InputAdornment position="start"><InboxIcon fontSize="small" /></InputAdornment> }}
    />
  );
});
