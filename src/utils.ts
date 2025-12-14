import type { CloudflareEnvType } from "./types";

export function getTypeOfEnvVariableValue(value: unknown): CloudflareEnvType {
  let type = "object";

  // Handle primitive types and special values first
  switch (typeof value) {
    case "string":
      return {
        type: "string",
        value: value as string,
        isCloudflareType: false,
      };
    case "number":
      return {
        type: "number",
        value: value as number,
        isCloudflareType: false,
      };
    case "boolean":
      return {
        type: "boolean",
        value: value as boolean,
        isCloudflareType: false,
      };
    case "function":
      return {
        type: "function",
        value: value as Function,
        isCloudflareType: false,
      };
    default:
      if (value === null) {
        return { type: "null", value: null, isCloudflareType: false };
      } else if (value === undefined) {
        return { type: "undefined", value: undefined, isCloudflareType: false };
      }
      break;
  }

  // Check for other common types
  if (type === "object") {
    switch (true) {
      case Array.isArray(value):
        return {
          type: "array",
          value: value as unknown[],
          isCloudflareType: false,
        };
      case value instanceof Date:
        return { type: "date", value: value as Date, isCloudflareType: false };
      case value instanceof RegExp:
        return {
          type: "regexp",
          value: value as RegExp,
          isCloudflareType: false,
        };
    }
  }

  // Check for Cloudflare-specific types (by duck typing)
  if (type === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    switch (true) {
      // Workflow has create() method (and potentially others like get(), put(), etc in local dev)
      case typeof obj.create === "function":
        return {
          type: "Workflow",
          value: value as any,
          isCloudflareType: true,
        };

      // Hyperdrive has connectionString property or method?
      // Typically Hyperdrive bindings have a `connectionString` or specific methods.
      // Checking for `connect` or `query` might be safer if it's a database-like, but Hyperdrive is usually a configuration object.
      // Let's assume duck-typing: Hyperdrive often exposes `connectionString`.
      // NOTE: Exact methods depend on runtime. `connectionString` is a common property.
      case typeof (obj as any).connectionString === "string":
        return {
          type: "Hyperdrive",
          value: value as any,
          isCloudflareType: true,
        };

      // VectorizeIndex has query(), insert(), upsert(), delete(), getByIds(), describe()
      case typeof obj.query === "function" &&
        typeof obj.insert === "function" &&
        typeof obj.upsert === "function" &&
        typeof obj.delete === "function" &&
        typeof (obj as any).getByIds === "function":
        return {
          type: "VectorizeIndex",
          value: value as any,
          isCloudflareType: true,
        };

      // Ai has run() method
      case typeof obj.run === "function" && !obj.fetch: // fetch check to distinguish from Fetcher/Service
        return {
          type: "Ai",
          value: value as any,
          isCloudflareType: true,
        };

      // Service/Fetcher has fetch(), connect(), connect()
      case typeof obj.fetch === "function":
        // Distinguish Service vs other Fetchers if possible, but they are functionally similar
        // Cloudflare uses `Fetcher` for both `Browser` and `Service` bindings usually.
        // We'll map generic fetchers to "Fetcher" or "Service" based on context if we could, but here we just return Fetcher.
        // Or if we want to be specific:
        return {
          type: "Fetcher", // Covers Service and Browser
          value: value as any,
          isCloudflareType: true,
        };

      // R2Bucket has head(), get(), put(), delete() methods
      case typeof obj.head === "function" &&
        typeof obj.get === "function" &&
        typeof obj.put === "function" &&
        typeof obj.delete === "function" &&
        typeof obj.list === "function":
        return {
          type: "R2Bucket",
          value: value as any,
          isCloudflareType: true,
        };

      // DurableObjectNamespace has get(), alarm(), and jurisdiction() methods
      case typeof obj.get === "function" &&
        typeof obj.alarm === "function" &&
        typeof obj.jurisdiction === "function":
        return {
          type: "DurableObjectNamespace",
          value: value as any,
          isCloudflareType: true,
        };

      // D1Database has prepare(), dump(), and batch() methods
      case typeof obj.prepare === "function" &&
        typeof obj.dump === "function" &&
        typeof obj.batch === "function":
        return {
          type: "D1Database",
          value: value as any,
          isCloudflareType: true,
        };

      // KVNamespace has get(), put(), delete(), and list() methods
      case typeof obj.get === "function" &&
        typeof obj.put === "function" &&
        typeof obj.delete === "function" &&
        typeof obj.list === "function" &&
        !obj.head:
        // Distinguish from R2Bucket
        return {
          type: "KVNamespace",
          value: value as any,
          isCloudflareType: true,
        };

      // Queue has send() and sendBatch() methods
      case typeof obj.send === "function" &&
        typeof obj.sendBatch === "function":
        return { type: "Queue", value: value as any, isCloudflareType: true };

      // AnalyticsEngineDataset has writeDataPoint() method
      case typeof obj.writeDataPoint === "function":
        return {
          type: "AnalyticsEngineDataset",
          value: value as any,
          isCloudflareType: true,
        };
    }
  }

  // Default to object type
  return {
    type: "object",
    value: value as Record<string, unknown>,
    isCloudflareType: false,
  };
}
