import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Pencil, Check, X } from "lucide-react";

export default function VimeoPanel({ programDays, onUpdate, busy }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const startEdit = (d) => {
    setEditingId(d.id);
    setDraft({
      vimeo_video_id: d.vimeo_video_id || "",
      required_percent: d.required_percent ?? 80,
      publish_status: d.publish_status || "draft",
    });
  };
  const save = async (id) => {
    await onUpdate(id, {
      vimeo_video_id: draft.vimeo_video_id || null,
      required_percent: Number(draft.required_percent) || 80,
      publish_status: draft.publish_status,
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5 text-revive-dark" />
        <h3 className="font-heading font-semibold text-revive-dark">IDs Vimeo · ProgramDays</h3>
      </div>

      {programDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay ProgramDays. Usa "Datos semilla" para crearlos.</p>
      ) : (
        <div className="space-y-2">
          {programDays.map((d) => (
            <div key={d.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-sm text-revive-dark">
                    Día {d.day_number} · {d.title || "Sin título"}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${d.publish_status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {d.publish_status}
                    </span>
                  </p>
                </div>
                {editingId === d.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => save(d.id)} disabled={busy}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => startEdit(d)}><Pencil className="w-4 h-4" /></Button>
                )}
              </div>
              {editingId === d.id ? (
                <div className="space-y-2 mt-2">
                  <div>
                    <Label className="text-xs">Vimeo ID (numérico)</Label>
                    <Input value={draft.vimeo_video_id} onChange={(e) => setDraft({ ...draft, vimeo_video_id: e.target.value })} className="font-mono text-sm" placeholder="1210381293" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">% requerido</Label>
                      <Input type="number" value={draft.required_percent} onChange={(e) => setDraft({ ...draft, required_percent: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <select value={draft.publish_status} onChange={(e) => setDraft({ ...draft, publish_status: e.target.value })} className="w-full h-10 rounded-md border border-input bg-white px-2 text-sm">
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                        <option value="archived">archived</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">{d.vimeo_video_id ? String(d.vimeo_video_id).slice(0, 60) : "—"}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}