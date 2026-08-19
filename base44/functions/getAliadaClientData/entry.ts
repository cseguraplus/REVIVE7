import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden — only aliadas or admins' }, { status: 403 });
    }

    // Find the aliada's profile by their user_id
    const aliadaProfiles = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
    if (!aliadaProfiles || aliadaProfiles.length === 0) {
      return Response.json({ error: 'AliadaProfile no encontrado para este usuario' }, { status: 404 });
    }
    const aliadaProfile = aliadaProfiles[0];

    // Find all clientas assigned to this aliada (cross-entity lookup that RLS cannot do)
    const clientaProfiles = await base44.asServiceRole.entities.ClientaProfile.filter({ aliada_id: aliadaProfile.id });

    const clientasData = [];
    for (const cp of clientaProfiles) {
      const enrollments = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id: cp.user_id });
      const videoProgress = await base44.asServiceRole.entities.VideoProgress.filter({ clienta_id: cp.user_id });
      const checkins = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id: cp.user_id });
      const metrics = await base44.asServiceRole.entities.WeeklyMetrics.filter({ clienta_id: cp.user_id });
      const alerts = await base44.asServiceRole.entities.Alert.filter({ clienta_id: cp.user_id, status: 'open' });

      // Filter emotional_comment when share_with_aliada is false (FLS limitation workaround)
      const filteredCheckins = checkins.map(c => {
        if (c.share_with_aliada === false) {
          return { ...c, emotional_comment: null };
        }
        return c;
      });

      clientasData.push({
        clienta_profile: cp,
        user: { id: cp.user_id, full_name: null },
        enrollments,
        video_progress: videoProgress,
        daily_checkins: filteredCheckins,
        weekly_metrics: metrics,
        alerts
      });
    }

    return Response.json({
      aliada_profile: aliadaProfile,
      clientas: clientasData,
      total_clientas: clientasData.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});