import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole } from '../../shared/auth.ts';

// Dry-run de la migración del modelo legacy ("vendedora") al modelo vigente.
// Ver base44/LEGACY_MIGRATION_PLAN.md para el mapeo campo por campo completo.
//
// SOLO LEE. No llama a create/update/delete en ningún punto — reporta cuántos
// registros migrarían limpio y cuántos quedarían huérfanos o en conflicto, para
// dimensionar el trabajo antes de escribir un script de escritura real.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireRole(req, base44, ['superadmin']);
    if (!auth.ok) return auth.response;

    const [clientas, compras, vendedoras, kits, contenidoDiario, progresoDiario, users, clientaProfiles, aliadaProfiles] =
      await Promise.all([
        base44.asServiceRole.entities.Clienta.list(),
        base44.asServiceRole.entities.Compra.list(),
        base44.asServiceRole.entities.Vendedora.list(),
        base44.asServiceRole.entities.Kit.list(),
        base44.asServiceRole.entities.ContenidoDiario.list(),
        base44.asServiceRole.entities.ProgresoDiario.list(),
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.ClientaProfile.list(),
        base44.asServiceRole.entities.AliadaProfile.list(),
      ]);

    // --- Vendedora -> AliadaProfile, por codigo_aliada === aliada_code ---
    const aliadaByCode = {};
    const aliadaCodeDuplicates = new Set();
    for (const ap of aliadaProfiles) {
      if (!ap.aliada_code) continue;
      if (aliadaByCode[ap.aliada_code]) aliadaCodeDuplicates.add(ap.aliada_code);
      else aliadaByCode[ap.aliada_code] = ap;
    }
    let vendedorasClean = 0, vendedorasOrphaned = 0, vendedorasConflict = 0;
    const vendedoraToAliadaId = {};
    for (const v of vendedoras) {
      if (!v.codigo_aliada) { vendedorasOrphaned++; continue; }
      if (aliadaCodeDuplicates.has(v.codigo_aliada)) { vendedorasConflict++; continue; }
      const match = aliadaByCode[v.codigo_aliada];
      if (match) { vendedorasClean++; vendedoraToAliadaId[v.id] = match.id; }
      else vendedorasOrphaned++;
    }

    // --- Clienta -> User (por email) -> ClientaProfile ---
    const userByEmail = {};
    for (const u of users) {
      if (u.email) userByEmail[String(u.email).trim().toLowerCase()] = u;
    }
    const clientaProfileByUserId = {};
    for (const cp of clientaProfiles) {
      if (cp.user_id) clientaProfileByUserId[cp.user_id] = cp;
    }
    let clientasClean = 0, clientasUserSinPerfil = 0, clientasSinUser = 0, clientasVendedoraSinAliada = 0;
    const clientaToUserId = {};
    for (const c of clientas) {
      const email = c.email ? String(c.email).trim().toLowerCase() : '';
      const user = email ? userByEmail[email] : null;
      if (!user) { clientasSinUser++; continue; }
      clientaToUserId[c.id] = user.id;
      const hasProfile = !!clientaProfileByUserId[user.id];
      const vendedoraResuelta = c.vendedora_id ? !!vendedoraToAliadaId[c.vendedora_id] : true; // sin vendedora asignada no es un conflicto
      if (!hasProfile) { clientasUserSinPerfil++; continue; }
      if (c.vendedora_id && !vendedoraResuelta) { clientasVendedoraSinAliada++; continue; }
      clientasClean++;
    }

    // --- Compra -> Sale, depende de que la Clienta relacionada migre limpio ---
    let comprasClean = 0, comprasOrphaned = 0;
    for (const co of compras) {
      const clientaId = co.clienta_id;
      if (clientaId && clientaToUserId[clientaId]) comprasClean++;
      else comprasOrphaned++;
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      vendedora_to_aliadaProfile: {
        total_vendedoras: vendedoras.length,
        clean: vendedorasClean,
        orphaned_no_codigo_or_no_match: vendedorasOrphaned,
        conflict_codigo_aliada_duplicado: vendedorasConflict,
      },
      clienta_to_clientaProfile: {
        total_clientas: clientas.length,
        clean: clientasClean,
        sin_user_correspondiente_por_email: clientasSinUser,
        user_existe_sin_clientaProfile: clientasUserSinPerfil,
        vendedora_asignada_sin_aliadaProfile: clientasVendedoraSinAliada,
      },
      compra_to_sale: {
        total_compras: compras.length,
        clean: comprasClean,
        orphaned_clienta_no_migra: comprasOrphaned,
      },
      sin_migracion_1_a_1_solo_conteo: {
        kit: kits.length,
        contenidoDiario: contenidoDiario.length,
        progresoDiario: progresoDiario.length,
        nota: 'Ver base44/LEGACY_MIGRATION_PLAN.md — Kit no mapea 1:1 a IntensityGuide (requiere decisión de producto); ContenidoDiario/ProgresoDiario no tienen caller vivo en el repo.',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
