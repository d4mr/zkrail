import { queryOptions } from "@tanstack/react-query";
import { intentAggregatorApi } from "./conts";
import { Solution } from "./intents";

export const solutionsQueryOptions = (intentId: string) =>
  queryOptions({
    queryKey: ["solutions", intentId],
    queryFn: async () => {
      const res = await intentAggregatorApi
        .get<{ solutions: Solution[] }>(`intents/${intentId}/solutions`)
        .json();
      return res.solutions;
    },
  });
