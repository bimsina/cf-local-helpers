import { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import { getTypeOfEnvVariableValue } from "../utils";

export const DashboardPage: FC<
  BaseProps & {
    env: {
      [key: string]: unknown;
    };
  }
> = ({ basePath, env }) => {
  // Calculate stats
  let kvCount = 0;
  let r2Count = 0;
  let d1Count = 0;
  let otherCount = 0;

  Object.values(env).forEach((value) => {
    const typeInfo = getTypeOfEnvVariableValue(value);
    switch (typeInfo.type) {
      case "KVNamespace":
        kvCount++;
        break;
      case "R2Bucket":
        r2Count++;
        break;
      case "D1Database":
        d1Count++;
        break;
      default:
        otherCount++;
    }
  });

  const cards = [
    {
      title: "KV Namespaces",
      count: kvCount,
      icon: "dns",
      link: `${basePath}/kv`,
      desc: "Key-Value storage for high read volumes.",
    },
    {
      title: "R2 Buckets",
      count: r2Count,
      icon: "cloud",
      link: `${basePath}/r2`,
      desc: "S3-compatible object storage.",
    },
    {
      title: "D1 Databases",
      count: d1Count,
      icon: "database",
      link: `${basePath}/d1`,
      desc: "Serverless SQL database.",
    },
    {
      title: "Environment Variables",
      count: Object.keys(env).length,
      icon: "settings_suggest",
      link: `${basePath}/env`,
      desc: "Manage your app configuration.",
    },
  ];

  return (
    <div class="w-full h-full p-8 overflow-y-auto">
      <div class="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Welcome Section */}
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl font-bold text-base-content">Local Helpers</h1>
          <p class="text-base-content/60 text-lg">
            Manage your local Cloudflare Workers environment bindings.
          </p>
        </div>

        {/* Stats Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <a
              href={card.link}
              class="card bg-base-100 border border-base-200 hover:border-base-300 transition-colors duration-200"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <span class="material-symbols-outlined text-4xl opacity-80">
                    {card.icon}
                  </span>
                  <div class="text-2xl font-bold opacity-40">{card.count}</div>
                </div>
                <h2 class="font-bold text-lg mb-1">{card.title}</h2>
                <p class="text-base-content/60 text-sm">{card.desc}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Recent/Info Section */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="card bg-base-100 border border-base-200">
            <div class="card-body p-6">
              <h3 class="font-bold text-lg flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-base-content/70">
                  info
                </span>
                Local Development
              </h3>
              <p class="text-base-content/60 text-sm">
                These helpers interact directly with your local
                Miniflare/Workerd instance. Changes here affect your local
                bindings immediately.
              </p>
            </div>
          </div>
          <div class="card bg-base-100 border border-base-200">
            <div class="card-body p-6">
              <h3 class="font-bold text-lg flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-base-content/70">
                  code
                </span>
                Tips
              </h3>
              <ul class="list-disc list-inside text-base-content/60 text-sm space-y-1">
                <li>
                  Use{" "}
                  <code class="bg-base-200 px-1 rounded text-xs">?prefix=</code>{" "}
                  in URL for R2 folder nav.
                </li>
                <li>D1 query runner supports basic SQLite syntax.</li>
                <li>KV values are JSON stringified if objects.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
