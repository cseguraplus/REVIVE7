import { requireRole, serviceClient } from '../_shared/auth.ts';

// Cuestionario preventivo (no diagnóstico, no autoriza consumo).
// Calcula safety_flag y risk_level a partir de respuestas de precaución.
// Guarda safety_screenings (la aliada nunca lee las respuestas detalladas).
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['clienta', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { answers } = body;
    if (!answers || typeof answers !== 'object') return Response.json({ error: 'answers inválido' }, { status: 400 });

    // deno-lint-ignore no-explicit-any
    const a: any = answers;
    const precautions: string[] = [];
    if (a.adult === false) precautions.push('menor de edad');
    if (a.pregnancy_nursing === true) precautions.push('embarazo o lactancia');
    if (a.diagnosed === true) precautions.push('diagnóstico declarado');
    if (a.medications === true) precautions.push('medicamentos de prescripción');
    if (a.allergies === true) precautions.push('alergias conocidas');
    if (a.medical_supervision === true) precautions.push('supervisión médica');
    if (a.supplement_restriction === true) precautions.push('restricción médica para suplementos');

    const safety_flag = precautions.length > 0;
    let risk_level = 'none';
    if (precautions.length >= 3) risk_level = 'high';
    else if (precautions.length === 2) risk_level = 'medium';
    else if (precautions.length === 1) risk_level = 'low';

    const { data: screening } = await svc.from('safety_screenings').insert({
      clienta_id: auth.user.id, questionnaire_json: JSON.stringify(answers), risk_level, notes: precautions.join('; '),
    }).select().single();

    const { data: profiles } = await svc.from('clienta_profiles').select('*').eq('user_id', auth.user.id);
    if (profiles && profiles[0]) await svc.from('clienta_profiles').update({ safety_flag }).eq('id', profiles[0].id);

    const recommendation = safety_flag
      ? 'Detectamos puntos que conviene revisar con un profesional de salud antes de iniciar. Recomendamos consultar a tu médico antes de comenzar el programa.'
      : 'No se identificaron precauciones declaradas. Continúa con tu preparación.';

    return Response.json({ ok: true, safety_flag, risk_level, recommendation, screening_id: screening?.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
