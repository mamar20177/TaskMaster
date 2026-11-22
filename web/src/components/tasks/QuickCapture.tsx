import { useState, type ClipboardEvent } from "react";
import { InputAdornment, TextField } from "@mui/material";
import { Inbox as InboxIcon } from "@mui/icons-material";
import { createTask } from "../../api/tasksApi";
import { useNotify } from "../../context/NotifyContext";

interface Props {
  /** Nach jedem erfassten Gedanken (z. B. Liste neu laden). */
  onCaptured?: (title: string) => void;
  autoFocus?: boolean;
}

/**
 * GTD „Sammeln“: ein Gedanke pro Enter, ohne Kategorie und Status –
 * landet damit automatisch im Eingangskorb. Das Feld bleibt zum Weitertippen offen.
 * Eingefügter Text mit mehreren Zeilen wird zu einem Eintrag pro Zeile.
 */
export function QuickCapture({ onCaptured, autoFocus = false }: Props) {
  const notify = useNotify();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  /** Legt die Gedanken nacheinander an (Reihenfolge bleibt erhalten). */
  const capture = async (titles: string[]) => {
    if (titles.length === 0 || busy) return;
    setBusy(true);
    let done = 0;
    try {
      for (const title of titles) {
        await createTask({ title });
        done++;
        onCaptured?.(title);
      }
      setText("");
      if (titles.length > 1) notify(`${titles.length} Gedanken erfasst`);
    } catch {
      notify(done > 0 ? `Nur ${done} von ${titles.length} Gedanken erfasst` : "Konnte nicht erfasst werden", "error");
    } finally {
      setBusy(false);
    }
  };

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
      fullWidth size="small" autoFocus={autoFocus}
      placeholder="Was geht dir durch den Kopf? (Enter = in den Eingangskorb)"
      value={text} disabled={busy}
      onChange={(e) => setText(e.target.value)}
      onPaste={handlePaste}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void capture(text.trim() ? [text.trim()] : []); } }}
      inputProps={{ enterKeyHint: "send" }}
      InputProps={{ startAdornment: <InputAdornment position="start"><InboxIcon fontSize="small" /></InputAdornment> }}
    />
  );
}
