import ky from "ky";

export const API_URL = "https://zkrail-intent-aggregator.d4mr.workers.dev/api/";

export const intentAggregatorApi = ky.create({
  prefixUrl: API_URL,
})