import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Envuelve base44.functions.invoke(functionName, params) en useMutation.
 * Uso: const { mutateAsync, isPending } = useBase44Mutation("registerSale");
 *      await mutateAsync(formValues);
 *
 * @param {string} functionName - nombre de la función backend (ej. "registerSale").
 * @param {object} [options] - opciones de useMutation (onSuccess, onError, etc).
 * @returns {import("@tanstack/react-query").UseMutationResult<any, Error, any>}
 */
export function useBase44Mutation(functionName, options = {}) {
  return useMutation({
    mutationFn: async (params) => {
      const res = await base44.functions.invoke(functionName, params);
      return /** @type {any} */ (res?.data);
    },
    ...options,
  });
}
