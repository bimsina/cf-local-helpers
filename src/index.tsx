import { Hono } from "hono";
import { SidebarLayout } from "./components/sidebar_layout";
import { EnvPage } from "./pages/env";
import { getTypeOfEnvVariableValue } from "./utils";
import { KVPage, KVKeyForm, KVRows } from "./pages/kv";
import { R2Page } from "./pages/r2";
import { D1Page, D1Results } from "./pages/d1";
import { DashboardPage } from "./pages/dashboard";
import { kvEntrySchema } from "./schemas";
import type {
  R2Bucket,
  D1Database,
  KVNamespace,
} from "@cloudflare/workers-types";

type DashboardOptions = {
  basePath?: string;
};

export default function createHandler(options: DashboardOptions = {}) {
  const app = new Hono();
  if (options.basePath) app.basePath(options.basePath);
  const basePath = options.basePath || "/";

  app.get(`${basePath}/env`, (c) => {
    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/env`}>
        <EnvPage
          basePath={basePath}
          env={c.env as { [key: string]: unknown }}
        />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/kv`, (c) => {
    const env = c.env as { [key: string]: unknown };

    // Find available KV namespaces
    const kvNames = Object.entries(env)
      .filter(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "KVNamespace";
      })
      .map(([key]) => key);

    // If there are KV namespaces, redirect to the first one
    if (kvNames.length > 0) {
      return c.redirect(`${basePath}/kv/${kvNames[0]}`);
    }

    // Otherwise, show the KV page with no selection
    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/kv`}>
        <KVPage basePath={basePath} env={env} />
      </SidebarLayout>
    );
  });
  app.get(`${basePath}/kv/:kvId`, async (c) => {
    const kvId = c.req.param("kvId");
    const search = c.req.query("search");
    const env = c.env as { [key: string]: unknown };

    // Find the KV namespace
    let kvData:
      | Array<{
          name: string;
          expiration?: number;
          metadata?: unknown;
          value?: string;
        }>
      | undefined;

    try {
      const kvEntry = Object.entries(env).find(([key, value]) => {
        if (key === kvId) {
          const typeInfo = getTypeOfEnvVariableValue(value);
          return typeInfo.type === "KVNamespace";
        }
        return false;
      });

      if (kvEntry) {
        const [, kvNamespace] = kvEntry;
        const typeInfo = getTypeOfEnvVariableValue(kvNamespace);
        if (typeInfo.type === "KVNamespace") {
          const kv = typeInfo.value;
          const { keys } = await kv.list();

          // Filter keys if search is present
          const filteredKeys = search
            ? keys.filter((k) =>
                k.name.toLowerCase().includes(search.toLowerCase())
              )
            : keys;

          // Fetch values for each key
          kvData = await Promise.all(
            filteredKeys.map(async (key) => {
              try {
                const value = await kv.get(key.name);
                return {
                  ...key,
                  value:
                    typeof value === "string" ? value : JSON.stringify(value),
                };
              } catch (error) {
                console.error(
                  `Failed to get value for key ${key.name}:`,
                  error
                );
                return {
                  ...key,
                  value: "[Error loading value]",
                };
              }
            })
          );
        }
      }
    } catch (error) {
      console.error("Failed to load KV data:", error);
      kvData = [];
    }

    if (c.req.header("HX-Request")) {
      return c.html(
        <KVRows basePath={basePath} kvId={kvId} kvData={kvData || []} />
      );
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/kv/${kvId}`}>
        <KVPage
          basePath={basePath}
          env={env}
          kvId={kvId}
          kvData={kvData}
          search={search}
        />
      </SidebarLayout>
    );
  });

  // KV CRUD Routes
  app.get(`${basePath}/kv/:kvId/entries/new`, (c) => {
    const kvId = c.req.param("kvId");
    return c.html(<KVKeyForm basePath={basePath} kvId={kvId} />);
  });

  app.get(`${basePath}/kv/:kvId/entries/:key/edit`, async (c) => {
    const kvId = c.req.param("kvId");
    const rawKey = c.req.param("key");
    const key = decodeURIComponent(rawKey);
    const env = c.env as { [key: string]: unknown };

    try {
      const entry = Object.entries(env).find(([k]) => k === kvId);
      if (entry) {
        const kv = entry[1] as KVNamespace;
        const { value, metadata } = await kv.getWithMetadata(key);

        const kvEntry = {
          key,
          value: value || "", // Should handle streams if needed, but for dashboard simple string
          metadata: metadata ? JSON.stringify(metadata, null, 2) : "",
          expirationTtl: undefined, // KV doesn't return TTL on get
        };

        return c.html(
          <KVKeyForm basePath={basePath} kvId={kvId} entry={kvEntry} />
        );
      }
    } catch (e) {
      console.error("Error loading KV key for edit:", e);
    }
    return c.text("Error loading key", 500);
  });

  app.post(`${basePath}/kv/:kvId/entries`, async (c) => {
    const kvId = c.req.param("kvId");
    const env = c.env as { [key: string]: unknown };
    const body = await c.req.parseBody();

    const validation = kvEntrySchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = validation.error.issues.map((i) => i.message).join(", ");
      // Return the form with validation errors
      // Need to reconstruct entry from body
      const entry = {
        key: body["key"] as string,
        value: body["value"] as string,
        expirationTtl: body["expirationTtl"]
          ? Number(body["expirationTtl"])
          : undefined,
        metadata: body["metadata"] as string,
      };
      return c.html(
        <KVKeyForm
          basePath={basePath}
          kvId={kvId}
          entry={entry}
          error={errorMsg}
        />
      );
    }

    const { key, value, expirationTtl, metadata } = validation.data;

    try {
      const entry = Object.entries(env).find(([k]) => k === kvId);
      if (entry) {
        const kv = entry[1] as KVNamespace;

        await kv.put(key, value, {
          expirationTtl: expirationTtl,
          metadata: metadata ? JSON.parse(metadata) : undefined,
        });

        // Return updated rows (htmx swap)
        // Re-fetch all data... simplistic approach for small KV
        const { keys } = await kv.list();
        const kvData = await Promise.all(
          keys.map(async (k) => {
            const val = await kv.get(k.name);
            return {
              ...k,
              value: typeof val === "string" ? val : "[binary/json]",
            };
          })
        );

        // To close the modal, we rely on the hx-on::after-request in the form
        // Or we could return OOB swap to close modal + update rows.
        // Current plan: Form handles modal close on success via client-side script in hx-on
        // We just return the new tbody
        return c.html(
          <KVRows basePath={basePath} kvId={kvId} kvData={kvData} />
        );
      }
    } catch (e: any) {
      return c.text(`Error saving KV: ${e.message}`, 500);
    }
    return c.text("KV not found", 404);
  });

  app.delete(`${basePath}/kv/:kvId/entries/:key`, async (c) => {
    const kvId = c.req.param("kvId");
    const rawKey = c.req.param("key");
    const key = decodeURIComponent(rawKey);
    const env = c.env as { [key: string]: unknown };

    try {
      const entry = Object.entries(env).find(([k]) => k === kvId);
      if (entry) {
        const kv = entry[1] as KVNamespace;
        await kv.delete(key);

        // Return updated rows
        const { keys } = await kv.list();
        const kvData = await Promise.all(
          keys.map(async (k) => {
            const val = await kv.get(k.name);
            return {
              ...k,
              value: typeof val === "string" ? val : "[binary/json]",
            };
          })
        );

        return c.html(
          <KVRows basePath={basePath} kvId={kvId} kvData={kvData} />
        );
      }
    } catch (e) {
      console.error("Delete failed", e);
    }
    return c.html(<div />); // Return empty or error indicator? HTML swap for tr usually removes it.
    // Actually returning empty string or fragment works for delete if swapping outerHTML of row
  });

  // R2 Routes
  app.get(`${basePath}/r2`, (c) => {
    const env = c.env as { [key: string]: unknown };

    // Find available R2 buckets
    const bucketNames = Object.entries(env)
      .filter(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "R2Bucket";
      })
      .map(([key]) => key);

    // If there are buckets, redirect to the first one
    if (bucketNames.length > 0) {
      return c.redirect(`${basePath}/r2/${bucketNames[0]}`);
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/r2`}>
        <R2Page basePath={basePath} env={env} />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/r2/:bucketName`, async (c) => {
    const bucketName = c.req.param("bucketName");
    const prefix = c.req.query("prefix") || undefined;
    const env = c.env as { [key: string]: unknown };
    let objects;
    let delimitedPrefixes;

    try {
      const entry = Object.entries(env).find(([key, value]) => {
        return (
          key === bucketName &&
          getTypeOfEnvVariableValue(value).type === "R2Bucket"
        );
      });

      if (entry) {
        const bucket = entry[1] as R2Bucket;
        const result = await bucket.list({
          prefix,
          delimiter: "/",
        });
        objects = result.objects;
        delimitedPrefixes = result.delimitedPrefixes;
      }
    } catch (e) {
      console.error("Error listing R2 bucket:", e);
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/r2`}>
        <R2Page
          basePath={basePath}
          env={env}
          bucketName={bucketName}
          objects={objects}
          delimitedPrefixes={delimitedPrefixes}
          currentPrefix={prefix}
        />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/r2/:bucketName/view/*`, async (c) => {
    const bucketName = c.req.param("bucketName");
    // Extract everything after /view/ as the key
    const rawKey = c.req.path.split(`/r2/${bucketName}/view/`)[1];
    const key = decodeURIComponent(rawKey);

    const env = c.env as { [key: string]: unknown };
    let objectMeta;

    try {
      const entry = Object.entries(env).find(([key, value]) => {
        return (
          key === bucketName &&
          getTypeOfEnvVariableValue(value).type === "R2Bucket"
        );
      });

      if (entry) {
        const bucket = entry[1] as R2Bucket;
        const object = await bucket.head(key);
        if (object) {
          objectMeta = object;
        }
      }
    } catch (e) {
      console.error("Error getting R2 primitive:", e);
    }

    // Pass undefined objects to force loading list if coming directly
    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/r2`}>
        <R2Page
          basePath={basePath}
          env={env}
          bucketName={bucketName}
          previewKey={key}
          previewMeta={objectMeta}
        />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/r2/:bucketName/raw/*`, async (c) => {
    const bucketName = c.req.param("bucketName");
    const rawKey = c.req.path.split(`/r2/${bucketName}/raw/`)[1];
    const key = decodeURIComponent(rawKey);

    const env = c.env as { [key: string]: unknown };

    try {
      const entry = Object.entries(env).find(([key, value]) => {
        return (
          key === bucketName &&
          getTypeOfEnvVariableValue(value).type === "R2Bucket"
        );
      });

      if (entry) {
        const bucket = entry[1] as R2Bucket;
        const object = await bucket.get(key);

        if (object) {
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set("etag", object.httpEtag);

          return new Response(object.body as any, {
            headers,
          });
        }
      }
    } catch (e) {
      console.error("Error serving raw R2 file:", e);
    }
    return c.text("File not found", 404);
  });

  // D1 Routes
  app.get(`${basePath}/d1`, (c) => {
    const env = c.env as { [key: string]: unknown };

    // Find available D1 databases
    const dbNames = Object.entries(env)
      .filter(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "D1Database";
      })
      .map(([key]) => key);

    // If there are databases, redirect to the first one
    if (dbNames.length > 0) {
      return c.redirect(`${basePath}/d1/${dbNames[0]}`);
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/d1`}>
        <D1Page basePath={basePath} env={env} />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/d1/:dbName`, async (c) => {
    const dbName = c.req.param("dbName");
    const env = c.env as { [key: string]: unknown };
    let tables: string[] = [];

    try {
      const entry = Object.entries(env).find(([key, value]) => {
        return (
          key === dbName &&
          getTypeOfEnvVariableValue(value).type === "D1Database"
        );
      });

      if (entry) {
        const db = entry[1] as D1Database;
        // List tables using sqlite_master
        const result = await db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
          )
          .all();
        tables = result.results.map((r: any) => r.name as string);
      }
    } catch (e) {
      console.error("Error listing D1 tables:", e);
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/d1`}>
        <D1Page basePath={basePath} env={env} dbName={dbName} tables={tables} />
      </SidebarLayout>
    );
  });

  app.post(`${basePath}/d1/:dbName/query`, async (c) => {
    const dbName = c.req.param("dbName");
    const env = c.env as { [key: string]: unknown };
    const body = await c.req.parseBody();
    const query = body["query"] as string;

    let tables: string[] = [];
    let queryResult;

    try {
      const entry = Object.entries(env).find(([key, value]) => {
        return (
          key === dbName &&
          getTypeOfEnvVariableValue(value).type === "D1Database"
        );
      });

      if (entry) {
        const db = entry[1] as D1Database;

        // Get tables for sidebar
        const tablesResult = await db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
          )
          .all();
        tables = tablesResult.results.map((r: any) => r.name as string);

        // Run user query
        if (query) {
          const start = performance.now();
          try {
            // Determine if it's a SELECT or other query to extract columns properly
            // raw() gives rows as arrays, which is easier for generic table
            // but we also need columns. .all() gives objects.
            // Let's use .all() and extract headers from the first row if present, or meta?
            // Actually raw() is better for "just showing data" but .all() is safer for mixed types?
            // Cloudflare D1 .all() returns { results: [], meta: ... }
            const result = await db.prepare(query).all();
            const end = performance.now();

            const rows = result.results || [];
            // Extract columns from first row if available
            const columns =
              rows.length > 0 ? Object.keys(rows[0] as object) : [];
            // Convert rows to array of values for consistency
            const rowValues = rows.map((r) => Object.values(r as object));

            queryResult = {
              columns,
              rows: rowValues,
              meta: {
                ...result.meta,
                duration: end - start,
              },
            };
          } catch (err: any) {
            queryResult = {
              columns: [],
              rows: [],
              error: err.message,
            };
          }
        }
      }
    } catch (e) {
      console.error("Error running D1 query:", e);
    }

    // If HTMX request, return only the results fragment
    if (c.req.header("HX-Request")) {
      return c.html(<D1Results queryResult={queryResult} />);
    }

    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/d1`}>
        <D1Page
          basePath={basePath}
          env={env}
          dbName={dbName}
          tables={tables}
          queryResult={queryResult}
          lastQuery={query}
        />
      </SidebarLayout>
    );
  });

  app.get(`${basePath}/*`, (c) => {
    const env = c.env as { [key: string]: unknown };
    return c.html(
      <SidebarLayout basePath={basePath} activePath={`${basePath}/`}>
        <DashboardPage basePath={basePath} env={env} />
      </SidebarLayout>
    );
  });

  return app;
}
