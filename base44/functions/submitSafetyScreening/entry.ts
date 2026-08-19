import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Cuestionario preventivo (no diagnóstico, no autoriza consumo).
// Calcula safety_flag y risk_level a partir de respuestas de precaución.
// Guarda SafetyScreening (la aliada nunca lee las respuestas detalladas).
const KEYS = ['adult', 'pregnancy_nursing', 'diagnosed', 'medications', 'allergies', 'medical_supervision', 'supplement_restriction'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'clienta' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { answers } = body;
    if (!answers || typeof answers !== 'object') return Response.json({ error: 'answers inválido' }, { status: 400 });

    const a = answers;
    const precautions = [];
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

    const screening = await base44.asServiceRole.entities.SafetyScreening.create({
      clienta_id: user.id, questionnaire_json: JSON.stringify(answers), risk_level, notes: precautions.join('; '),
    });

    const profiles = await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: user.id });
    if (profiles && profiles[0]) await base44.asServiceRole.entities.ClientaProfile.update(profiles[0].id, { safety_flag });

    const recommendation = safety_flag
      ? 'Detectamos puntos que conviene revisar con un profesional de salud antes de iniciar. Recomendamos consultar a tu médico antes de comenzar el programa.'
      : 'No se identificaron precauciones declaradas. Continúa con tu preparación.';

    return Response.json({ ok: true, safety_flag, risk_level, recommendation, screening_id: screening.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});