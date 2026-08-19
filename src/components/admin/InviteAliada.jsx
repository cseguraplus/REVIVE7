import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function InviteAliada() {
  const [email, setEmail] = useState("ditecosapidecv@gmail.com");
  const [publicName, setPublicName] = useState("Aliada Piloto");
  const [whatsapp, setWhatsapp] = useState("+52 1 5640006540");
  const [aliadaCode, setAliadaCode] = useState("ALIADA01");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const Msg = () => {
    if (!msg) return null;
    const ok = msg.type === "ok";
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${ok ? "bg-revive-green-pale text-revive-dark" : "bg-red-50 text-red-700"}`}>
        {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
        <span>{msg.text}</span>
      </div>
    );
  };

  const sendInvite = async () => {
    setBusy("invite"); setMsg(null);
    try {
      await base44.users.inviteUser(email, "user");
      setMsg({ type: "ok", text: `Invitación enviada a ${email}. La persona debe aceptarla y completar su registro.` });
    } catch (e) {
      setMsg({ type: "err", text: String((e && (e.message || e)) || "No se pudo enviar la invitación") });
    } finally { setBusy(null); }
  };

  const setupProfile = async () => {
    setBusy("setup"); setMsg(null);
    try {
      const users = await base44.entities.User.filter({ email });
      const u = users && users[0];
      if (!u) {
        setMsg({ type: "err", text: "Aún no existe un usuario con ese correo. Pídele que acepte la invitación y se registre, luego vuelve a presionar este botón." });
        return;
      }
      await base44.entities.User.update(u.id, { app_role: "aliada" });
      const existing = await base44.entities.AliadaProfile.filter({ user_id: u.id });
      if (!existing.length) {
        await base44.entities.AliadaProfile.create({
          user_id: u.id,
          public_name: publicName,
          whatsapp,
          aliada_code: aliadaCode,
          status: "active",
          training_status: "completed",
        });
      }
      setMsg({ type: "ok", text: `Aliada configurada: rol "aliada" asignado y perfil creado con código ${aliadaCode}.` });
    } catch (e) {
      setMsg({ type: "err", text: String((e && (e.message || e)) || "No se pudo configurar la aliada") });
    } finally { setBusy(null); }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-revive-green" />
        <h2 className="font-heading font-bold text-lg text-revive-dark">Invitar aliada</h2>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aliada@correo.com" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Nombre público</Label>
            <Input value={publicName} onChange={(e) => setPublicName(e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Código de aliada</Label>
          <Input value={aliadaCode} onChange={(e) => setAliadaCode(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button onClick={sendInvite} disabled={busy === "invite"} className="bg-revive-green text-revive-dark hover:bg-revive-green-light">
          {busy === "invite" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar invitación
        </Button>
        <Button onClick={setupProfile} disabled={busy === "setup"} variant="outline" className="border-revive-green text-revive-dark hover:bg-revive-green-pale">
          {busy === "setup" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Configurar perfil de aliada
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Paso 1: envía la invitación. Paso 2: cuando ella acepte y se registre, presiona "Configurar perfil" para asignarle el rol y crear su AliadaProfile.
      </p>

      <Msg />
    </div>
  );
}