import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Califica la evaluación de capacitación. Si los 3 módulos están completos,
// los lineamientos aceptados y el examen aprobado → training_status=completed
// y AliadaProfile.status=active. Audita.
const MODULE_KEYS = ['revive7_intro', 'intensities', 'clients_sales'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { answers } = body; // array of option indexes aligned to exam questions
    if (!Array.isArray(answers)) return Response.json({ error: 'answers inválido (array)' }, { status: 400 });

    const exams = await base44.asServiceRole.entities.TrainingExam.filter({ active: true });
    const exam = exams && exams[0];
    if (!exam) return Response.json({ error: 'No hay evaluación activa' }, { status: 404 });

    let questions = [];
    try { questions = JSON.parse(exam.questions_json || '[]'); } catch (e) { questions = []; }
    if (!Array.isArray(questions) || questions.length < 5) return Response.json({ error: 'La evaluación debe tener al menos 5 preguntas' }, { status: 400 });

    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (exam.passing_score || 70);

    await base44.asServiceRole.entities.TrainingExamAttempt.create({
      user_id: user.id, exam_id: exam.id, score, passed,
      answers_json: JSON.stringify(answers), taken_at: new Date().toISOString(),
    });

    // Check full completion
    const progress = await base44.asServiceRole.entities.TrainingProgress.filter({ user_id: user.id });
    const completedKeys = new Set((progress || []).filter((p) => p.status === 'completed').map((p) => p.module_key));
    const allModules = MODULE_KEYS.every((k) => completedKeys.has(k));

    const profiles = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
    const profile = profiles && profiles[0];
    const guidelinesOk = !!(profile && profile.guidelines_accepted_at);

    let activated = false;
    if (passed && allModules && guidelinesOk && profile) {
      await base44.asServiceRole.entities.AliadaProfile.update(profile.id, { training_status: 'completed', status: 'active' });
      try { await base44.asServiceRole.entities.User.update(user.id, { account_status: 'active' }); } catch (e) {}
      activated = true;
      await base44.asServiceRole.entities.AuditLog.create({
        actor_user_id: user.id, action: 'aliada_training_completed',
        entity_type: 'AliadaProfile', entity_id: profile.id,
        old_value_json: JSON.stringify({ training_status: profile.training_status, status: profile.status }),
        new_value_json: JSON.stringify({ training_status: 'completed', status: 'active' }),
        reason: 'Capacitación completada: 3 módulos + lineamientos + evaluación', timestamp: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, score, passed, all_modules: allModules, guidelines_accepted: guidelinesOk, activated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});