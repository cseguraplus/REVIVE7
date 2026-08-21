import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Agregado cross-entidad que RLS no puede resolver por sí sola: todas las
// clientas asignadas a una aliada, con su progreso. Compartido entre
// getAliadaClientData (edge function) y getAliadaDashboard (que lo reutiliza,
// igual que en Base44 vía functions.invoke).
export async function computeAliadaClientData(svc: SupabaseClient, aliadaUserId: string) {
  const { data: aliadaProfiles } = await svc.from('aliada_profiles').select('*').eq('user_id', aliadaUserId);
  if (!aliadaProfiles || aliadaProfiles.length === 0) {
    return { error: 'AliadaProfile no encontrado para este usuario', status: 404 };
  }
  const aliadaProfile = aliadaProfiles[0];

  const { data: clientaProfiles } = await svc.from('clienta_profiles').select('*').eq('aliada_id', aliadaProfile.id);

  // deno-lint-ignore no-explicit-any
  const clientasData: any[] = [];
  for (const cp of clientaProfiles || []) {
    const [
      { data: enrollments },
      { data: videoProgress },
      { data: checkins },
      { data: metrics },
      { data: alerts },
    ] = await Promise.all([
      svc.from('enrollments').select('*').eq('clienta_id', cp.user_id),
      svc.from('video_progress').select('*').eq('clienta_id', cp.user_id),
      svc.from('daily_checkins').select('*').eq('clienta_id', cp.user_id),
      svc.from('weekly_metrics').select('*').eq('clienta_id', cp.user_id),
      svc.from('alerts').select('*').eq('clienta_id', cp.user_id).eq('status', 'open'),
    ]);

    // Oculta emotional_comment cuando share_with_aliada es false (equivalente
    // al workaround de field-level RLS de Base44 para ese caso).
    const filteredCheckins = (checkins || []).map((c) => (
      c.share_with_aliada === false ? { ...c, emotional_comment: null } : c
    ));

    clientasData.push({
      clienta_profile: cp,
      user: { id: cp.user_id, full_name: null },
      enrollments: enrollments || [],
      video_progress: videoProgress || [],
      daily_checkins: filteredCheckins,
      weekly_metrics: metrics || [],
      alerts: alerts || [],
    });
  }

  return {
    status: 200,
    body: { aliada_profile: aliadaProfile, clientas: clientasData, total_clientas: clientasData.length },
  };
}
