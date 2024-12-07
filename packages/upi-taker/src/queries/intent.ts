import { queryOptions } from "@tanstack/react-query";
import { intentAggregatorApi } from "./conts";
import { Intent } from "./intents";

export const intentQueryOptions = (intentId: string) =>
  queryOptions({
    queryKey: ["intent", intentId],
    queryFn: async () => {
      const res = await intentAggregatorApi
        .get<Intent>(`intents/${intentId}`)
        .json();

      return res;
    },
  });
