import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { toISOInTZ } from './dates.ts';
import type { AppUser } from './auth.ts';

export type EffectiveNow = {
  now: string;
  date: string;
  tz: string;
  testMode: boolean;
  simulated: null;
  isTestUser: boolean;
  usingSimulated: boolean;
};

// "Ahora" efectivo del usuario autenticado. Producción = fecha real en
// app_settings.timezone. Cuentas de prueba (is_test_account=true) con un
// test_control habilitado obtienen la fecha simulada (individual, nunca
// afecta a usuarios normales). A diferencia de Base44 (que obligaba a
// duplicar esta lógica inline en cada función por no permitir imports
// locales), aquí es un módulo compartido real — una sola fuente de verdad.
export async function getEffectiveNow(svc: SupabaseClient, user: AppUser): Promise<EffectiveNow> {
  const { data: settings } = await svc.from('app_settings').select('*').maybeSingle();
  const tz = (settings && settings.timezone) || 'America/Mexico_City';
  const isTestAccount = !!user.is_test_account;

  let usingSimulated = false;
  let nowISO: string;

  if (isTestAccount) {
    const { data: tc } = await svc.from('test_control').select('*').eq('user_id', user.id).maybeSingle();
    if (tc && tc.enabled && tc.effective_datetime) {
      usingSimulated = true;
      nowISO = String(tc.effective_datetime).slice(0, 19);
    }
  }
  if (!usingSimulated) {
    nowISO = toISOInTZ(new Date(), tz);
  }

  return {
    now: nowISO!,
    date: nowISO!.slice(0, 10),
    tz,
    testMode: false,
    simulated: null,
    isTestUser: isTestAccount,
    usingSimulated,
  };
}
