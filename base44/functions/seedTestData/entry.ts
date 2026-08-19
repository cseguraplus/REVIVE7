import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden — solo superadmin u operaciones' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'all';
    const startDate = body.start_date || new Date().toISOString().split('T')[0];
    const vimeoIds = body.vimeo_ids || {
      bienvenida: 'VIMEO_ID_BIENVENIDA',
      dia_1: 'VIMEO_ID_DIA_1',
      dia_2: 'VIMEO_ID_DIA_2'
    };

    const results = {};
    const errors = [];

    // ── USERS ──
    if (action === 'all' || action === 'users') {
      results.users = [];
      results.profiles = {};

      const testUsers = [
        { email: 'superadmin@revive7.mx', role: 'admin', app_role: 'superadmin' },
        { email: 'aliada.prueba@revive7.mx', role: 'user', app_role: 'aliada' },
        { email: 'clienta.prueba@revive7.mx', role: 'user', app_role: 'clienta' }
      ];

      for (const tu of testUsers) {
        let existing = (await base44.asServiceRole.entities.User.filter({ email: tu.email }))[0];
        if (!existing) {
          try {
            await base44.users.inviteUser(tu.email, tu.role);
          } catch (e) {
            errors.push(`Error invitando ${tu.email}: ${e.message}`);
          }
          // retry find after invite
          existing = (await base44.asServiceRole.entities.User.filter({ email: tu.email }))[0];
        }
        if (existing) {
          await base44.asServiceRole.entities.User.update(existing.id, { app_role: tu.app_role });
          results.users.push({ email: tu.email, id: existing.id, app_role: tu.app_role, existed: true });
        } else {
          results.users.push({ email: tu.email, id: null, app_role: tu.app_role, existed: false, note: 'Invitación enviada; pendiente de registro' });
        }
      }

      // AliadaProfile for aliada.prueba
      const aliadaUser = (await base44.asServiceRole.entities.User.filter({ email: 'aliada.prueba@revive7.mx' }))[0];
      if (aliadaUser) {
        let aliadaProfile = (await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: aliadaUser.id }))[0];
        if (!aliadaProfile) {
          aliadaProfile = await base44.asServiceRole.entities.AliadaProfile.create({
            user_id: aliadaUser.id,
            public_name: 'Aliada Prueba',
            whatsapp: '',
            aliada_code: 'ALIADA-TEST-01',
            status: 'active',
            training_status: 'completed'
          });
        }
        results.profiles.aliada = aliadaProfile;
      }

      // ClientaProfile for clienta.prueba, assigned to ALIADA-TEST-01
      const clientaUser = (await base44.asServiceRole.entities.User.filter({ email: 'clienta.prueba@revive7.mx' }))[0];
      if (clientaUser) {
        const aliadaProfile = (await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: 'ALIADA-TEST-01' }))[0];
        let clientaProfile = (await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: clientaUser.id }))[0];
        if (!clientaProfile) {
          clientaProfile = await base44.asServiceRole.entities.ClientaProfile.create({
            user_id: clientaUser.id,
            aliada_id: aliadaProfile ? aliadaProfile.id : '',
            status: 'active',
            share_emotional_default: true
          });
        }
        results.profiles.clienta = clientaProfile;
      }
    }

    // ── GENERATION ──
    if (action === 'all' || action === 'generation') {
      let generation = (await base44.asServiceRole.entities.Generation.filter({ name: 'Generación Piloto 7' }))[0];
      if (!generation) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        generation = await base44.asServiceRole.entities.Generation.create({
          name: 'Generación Piloto 7',
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          enrollment_cutoff: startDate,
          status: 'open'
        });
      }
      results.generation = generation;
    }

    // ── ENROLLMENT ──
    if (action === 'all' || action === 'enrollment') {
      const clientaUser = (await base44.asServiceRole.entities.User.filter({ email: 'clienta.prueba@revive7.mx' }))[0];
      const generation = (await base44.asServiceRole.entities.Generation.filter({ name: 'Generación Piloto 7' }))[0];
      const aliadaProfile = (await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: 'ALIADA-TEST-01' }))[0];

      if (clientaUser && generation) {
        let enrollment = (await base44.asServiceRole.entities.Enrollment.filter({ clienta_id: clientaUser.id, generation_id: generation.id }))[0];
        if (!enrollment) {
          enrollment = await base44.asServiceRole.entities.Enrollment.create({
            clienta_id: clientaUser.id,
            aliada_id: aliadaProfile ? aliadaProfile.id : '',
            generation_id: generation.id,
            intensity: 'activa_7',
            status: 'active',
            start_date: startDate,
            end_date: generation.end_date
          });
        }
        results.enrollment = enrollment;
      } else {
        errors.push('Enrollment requiere usuarios y generación previos');
      }
    }

    // ── PROGRAM DAYS ──
    if (action === 'all' || action === 'program_days') {
      const days = [
        { day_number: 0, week_number: 1, day_type: 'welcome', title: 'Bienvenida a Revive 7', vimeo_video_id: vimeoIds.bienvenida, required_percent: 80, publish_status: 'published' },
        { day_number: 1, week_number: 1, day_type: 'daily', title: 'Día 1 · Comienza con intención', vimeo_video_id: vimeoIds.dia_1, required_percent: 80, publish_status: 'published' },
        { day_number: 2, week_number: 1, day_type: 'daily', title: 'Día 2 · Continúa tu avance', vimeo_video_id: vimeoIds.dia_2, required_percent: 80, publish_status: 'published' }
      ];
      results.program_days = [];
      for (const day of days) {
        let existing = (await base44.asServiceRole.entities.ProgramDay.filter({ day_number: day.day_number }))[0];
        if (existing) {
          existing = await base44.asServiceRole.entities.ProgramDay.update(existing.id, day);
          results.program_days.push(existing);
        } else {
          const created = await base44.asServiceRole.entities.ProgramDay.create(day);
          results.program_days.push(created);
        }
      }
    }

    return Response.json({ status: 'success', results, errors: errors.length ? errors : undefined });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});