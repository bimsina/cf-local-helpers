# Cloudflare Workers Local Helpers

A dashboard for managing Cloudflare Workers local resources (KV, D1, R2).

> ⚠️ **Warning**: This dashboard should only be used in development mode and never deployed to production. It provides direct access to your local Cloudflare resources and should not be exposed publicly.

## Features

**1. KV Editor**

- View all KV namespaces
- List, search, and filter keys
- Create, edit, and delete key-value pairs
- View key expiration and metadata

![KV Namespaces](https://raw.githubusercontent.com/bimsina/cf-local-helpers/refs/heads/main/feature_images/kv.png)

**2. D1 Explorer**

- View all D1 databases
- Browse tables and schema
- Run custom SQL queries with a built-in editor
- View query results in a table format with execution time

![D1 Databases](https://raw.githubusercontent.com/bimsina/cf-local-helpers/refs/heads/main/feature_images/d1.png)

**3. R2 Browser**

- Navigate R2 buckets and folders (breadcrumbs support)
- View object metadata (size, type, uploaded date)
- Preview images directly in the dashboard
- Download files

![R2 Buckets](https://raw.githubusercontent.com/bimsina/cf-local-helpers/refs/heads/main/feature_images/r2.png)

**4. Environment Variables Viewer**

- Inspect all environment variables and bindings bound to your worker

![Environment Variables](https://raw.githubusercontent.com/bimsina/cf-local-helpers/refs/heads/main/feature_images/env.png)

## Tech Stack

- HTMX ([htmx.org](https://htmx.org))
- TailwindCSS ([tailwindcss.com](https://tailwindcss.com))
- DaisyUI ([daisyui.com](https://daisyui.com))
- AlpineJS ([alpinejs.dev](https://alpinejs.dev))

## How to use

### 1. Installation

Add the package as a development dependency:

**npm**

```bash
npm install cf-local-helpers --save-dev
```

**yarn**

```bash
yarn add cf-local-helpers --dev
```

**pnpm**

```bash
pnpm add cf-local-helpers --save-dev
```

**bun**

```bash
bun add cf-local-helpers --save-dev
```

### 2. Usage Examples

#### Pure Cloudflare Worker

```ts
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/dashboard")) {
      const { default: createHandler } = await import("cf-local-helpers");
      const dashboard = createHandler({ basePath: "/dashboard" });
      return dashboard.fetch(request, env, ctx);
    }

    return new Response("Hello World!");
  },
} satisfies ExportedHandler<Env>;
```

#### Hono

```ts
import { Hono } from "hono";

const app = new Hono();

app.all("/dashboard/*", async (c) => {
  const { default: createHandler } = await import("cf-local-helpers");
  const dashboard = createHandler({ basePath: "/dashboard" });
  return dashboard.fetch(c.req.raw, c.env, c.executionCtx);
});

export default app;
```

#### TanStack Start

```ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/dashboard/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { default: createHandler } = await import("cf-local-helpers");
        const dashboard = createHandler({ basePath: "/api/dashboard" });
        return dashboard.fetch(request, env);
      },
      POST: async ({ request }: { request: Request }) => {
        const { default: createHandler } = await import("cf-local-helpers");
        const dashboard = createHandler({ basePath: "/api/dashboard" });
        return dashboard.fetch(request, env);
      },
    },
  },
});
```

#### Itty Router

```ts
router.all("/dashboard/*", async (request, env, ctx) => {
  const { default: createHandler } = await import("cf-local-helpers");
  const dashboard = createHandler({ basePath: "/dashboard" });
  return dashboard.fetch(request, env, ctx);
});
```
