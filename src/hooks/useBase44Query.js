import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Envuelve base44.functions.invoke(functionName, params) en useQuery.
 * Reemplaza el patrón useState+useEffect+invoke duplicado en pages/ y components/.
 *
 * @param {string} functionName - nombre de la función backend (ej. "getAliadaDashboard").
 * @param {object} [params] - parámetros enviados a la función. Forma parte de la queryKey.
 * @param {object} [options] - opciones de useQuery (enabled, refetchInterval, etc).
 * @returns {import("@tanstack/react-query").UseQueryResult<any, Error>}
 */
export function useBase44Query(functionName, params = {}, options = {}) {
  return useQuery({
    queryKey: [functionName, params],
    queryFn: async () => {
      const res = await base44.functions.invoke(functionName, params);
      return /** @type {any} */ (res?.data);
    },
    ...options,
  });
}
