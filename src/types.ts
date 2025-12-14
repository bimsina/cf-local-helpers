import type { PropsWithChildren } from "hono/jsx";
import type {
  KVNamespace,
  R2Bucket,
  DurableObjectNamespace,
  D1Database,
  Queue,
  AnalyticsEngineDataset,
  Workflow,
  Hyperdrive,
  Ai,
  VectorizeIndex,
  Service,
  Fetcher,
} from "@cloudflare/workers-types";

export type BaseProps = PropsWithChildren & {
  basePath: string;
};

export type CloudflareEnvType =
  | { type: "KVNamespace"; value: KVNamespace; isCloudflareType: true }
  | { type: "R2Bucket"; value: R2Bucket; isCloudflareType: true }
  | {
      type: "DurableObjectNamespace";
      value: DurableObjectNamespace;
      isCloudflareType: true;
    }
  | { type: "D1Database"; value: D1Database; isCloudflareType: true }
  | { type: "Queue"; value: Queue; isCloudflareType: true }
  | {
      type: "AnalyticsEngineDataset";
      value: AnalyticsEngineDataset;
      isCloudflareType: true;
    }
  | { type: "Workflow"; value: Workflow; isCloudflareType: true }
  | { type: "Hyperdrive"; value: Hyperdrive; isCloudflareType: true }
  | { type: "Ai"; value: Ai; isCloudflareType: true }
  | { type: "VectorizeIndex"; value: VectorizeIndex; isCloudflareType: true }
  | { type: "Service"; value: Service; isCloudflareType: true }
  | { type: "Fetcher"; value: Fetcher; isCloudflareType: true }
  | { type: "string"; value: string; isCloudflareType: false }
  | { type: "number"; value: number; isCloudflareType: false }
  | { type: "boolean"; value: boolean; isCloudflareType: false }
  | { type: "null"; value: null; isCloudflareType: false }
  | { type: "undefined"; value: undefined; isCloudflareType: false }
  | { type: "array"; value: unknown[]; isCloudflareType: false }
  | { type: "date"; value: Date; isCloudflareType: false }
  | { type: "regexp"; value: RegExp; isCloudflareType: false }
  | { type: "object"; value: Record<string, unknown>; isCloudflareType: false }
  | { type: "function"; value: Function; isCloudflareType: false };
