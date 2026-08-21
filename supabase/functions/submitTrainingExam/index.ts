import { requireRole, serviceClient } from '../_shared/auth.ts';

// Califica la evaluación de capacitación. Si los 3 módulos están completos,
// los lineamientos aceptados y el examen aprobado → training_status=completed
// y aliada_profiles.status=active. Audita.
const MODULE_KEYS = ['revive7_intro', 'intensities', 'clients_sales'];

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['aliada', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { answers } = body; // array de índices de opción alineados a las preguntas
    if (!Array.isArray(answers)) return Response.json({ error: 'answers inválido (array)' }, { status: 400 });

    const { data: exams } = await svc.from('training_exams').select('*').eq('active', true);
    const exam = exams && exams[0];
    if (!exam) return Response.json({ error: 'No hay evaluación activa' }, { status: 404 });

    // deno-lint-ignore no-explicit-any
    let questions: any[] = [];
    try { questions = JSON.parse(exam.questions_json || '[]'); } catch { questions = []; }
    if (!Array.isArray(questions) || questions.length < 5) return Response.json({ error: 'La evaluación debe tener al menos 5 preguntas' }, { status: 400 });

    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (exam.passing_score || 70);

    await svc.from('training_exam_attempts').insert({
      user_id: auth.user.id, exam_id: exam.id, score, passed,
      answers_json: JSON.stringify(answers), taken_at: new Date().toISOString(),
    });

    const { data: progress } = await svc.from('training_progress').select('*').eq('user_id', auth.user.id);
    const completedKeys = new Set((progress || []).filter((p) => p.status === 'completed').map((p) => p.module_key));
    const allModules = MODULE_KEYS.every((k) => completedKeys.has(k));

    const { data: profiles } = await svc.from('aliada_profiles').select('*').eq('user_id', auth.user.id);
    const profile = profiles && profiles[0];
    const guidelinesOk = !!(profile && profile.guidelines_accepted_at);

    let activated = false;
    if (passed && allModules && guidelinesOk && profile) {
      await svc.from('aliada_profiles').update({ training_status: 'completed', status: 'active' }).eq('id', profile.id);
      await svc.from('profiles').update({ account_status: 'active' }).eq('id', auth.user.id);
      activated = true;
      await svc.from('audit_logs').insert({
        actor_user_id: auth.user.id, action: 'aliada_training_completed',
        entity_type: 'AliadaProfile', entity_id: profile.id,
        old_value_json: JSON.stringify({ training_status: profile.training_status, status: profile.status }),
        new_value_json: JSON.stringify({ training_status: 'completed', status: 'active' }),
        reason: 'Capacitación completada: 3 módulos + lineamientos + evaluación', timestamp: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, score, passed, all_modules: allModules, guidelines_accepted: guidelinesOk, activated });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
