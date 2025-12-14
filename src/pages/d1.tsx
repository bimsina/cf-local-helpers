import { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import { getTypeOfEnvVariableValue } from "../utils";
import type { D1Database } from "@cloudflare/workers-types";
import ChipsList from "../components/chips_list";

export const D1Results: FC<{
  queryResult?: {
    columns: string[];
    rows: unknown[][];
    error?: string;
    meta?: any;
  };
}> = ({ queryResult }) => {
  return (
    <div
      class="flex-1 min-h-0 card bg-base-100 border border-base-200 shadow-sm flex flex-col overflow-hidden"
      id="d1-results"
    >
      <div class="p-3 border-b border-base-200 bg-base-200/50 flex justify-between items-center">
        <span class="font-bold opacity-80">Results</span>
        {queryResult?.meta?.duration && (
          <span class="badge badge-sm badge-neutral">
            {queryResult.meta.duration.toFixed(2)}ms
          </span>
        )}
      </div>
      <div class="flex-1 overflow-auto p-0 relative">
        {queryResult ? (
          queryResult.error ? (
            <div class="p-4 alert alert-error rounded-none">
              <span class="material-symbols-outlined">error</span>
              <span class="font-mono text-sm whitespace-pre-wrap">
                Error: {queryResult.error}
              </span>
            </div>
          ) : queryResult.rows.length > 0 ? (
            <table class="table table-pin-rows table-xs sm:table-sm w-full">
              <thead>
                <tr class="bg-base-200/50">
                  {queryResult.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryResult.rows.map((row, idx) => (
                  <tr key={idx} class="hover">
                    {queryResult!.columns.map((col, colIdx) => (
                      <td key={`${idx}-${colIdx}`} class="max-w-xs truncate">
                        {row[colIdx] === null ? (
                          <span class="opacity-40 italic">null</span>
                        ) : typeof row[colIdx] === "object" ? (
                          JSON.stringify(row[colIdx])
                        ) : (
                          String(row[colIdx])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div class="p-12 text-center opacity-50 italic">
              No results returned
            </div>
          )
        ) : (
          <div class="p-12 text-center opacity-40">
            Run a query to see results
          </div>
        )}
      </div>
    </div>
  );
};

export const D1Page: FC<
  BaseProps & {
    env: {
      [key: string]: unknown;
    };
    dbName?: string;
    tables?: string[];
    queryResult?: {
      columns: string[];
      rows: unknown[][];
      error?: string;
      meta?: any;
    };
    lastQuery?: string;
  }
> = (props) => {
  const d1s = Object.fromEntries(
    Object.entries(props.env)
      .map(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "D1Database" ? [key, typeInfo.value] : null;
      })
      .filter((entry): entry is [string, D1Database] => entry !== null)
  );

  const dbNames = Object.keys(d1s);
  const selectedDb =
    props.dbName && dbNames.includes(props.dbName)
      ? props.dbName
      : dbNames.length > 0
      ? dbNames[0]
      : null;

  if (dbNames.length === 0) {
    return (
      <div class="w-full h-full p-4">
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="text-gray-400 text-6xl mb-4">🗄️</div>
            <h2 class="text-xl font-semibold text-gray-600 mb-2">
              No D1 Databases Available
            </h2>
            <p class="text-gray-500">
              Bind D1 databases to your environment to view and query data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="w-full h-full p-6 flex flex-col gap-6">
      <ChipsList
        title="Select D1 Database"
        selected={selectedDb}
        chips={dbNames.map((name) => ({
          label: name,
          value: name,
          link: `${props.basePath}/d1/${name}`,
        }))}
      />

      {selectedDb && (
        <div class="flex flex-col gap-6 flex-1 min-h-0">
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
            {/* Sidebar: Tables List */}
            <div class="lg:col-span-1 card bg-base-100 border border-base-200 shadow-sm flex flex-col overflow-hidden max-h-[500px] lg:max-h-full">
              <div class="p-3 border-b border-base-200 bg-base-200/50 font-bold opacity-80">
                Tables {props.tables && `(${props.tables.length})`}
              </div>
              <div class="flex-1 overflow-y-auto p-2">
                {props.tables ? (
                  props.tables.length > 0 ? (
                    <ul class="menu menu-sm w-full p-0">
                      {props.tables.map((table) => (
                        <li key={table}>
                          <button
                            type="button"
                            onclick={`document.getElementById('sql-input').value = 'SELECT * FROM ${table} LIMIT 10';`}
                          >
                            <span class="material-symbols-outlined text-xs opacity-50">
                              table_view
                            </span>
                            {table}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div class="text-center p-4 opacity-50 italic">
                      No tables found
                    </div>
                  )
                ) : (
                  <div class="text-center p-4 opacity-50 loading loading-dots"></div>
                )}
              </div>
            </div>

            {/* Main: Query Runner */}
            <div class="lg:col-span-3 flex flex-col gap-4 min-h-0">
              <div class="card bg-base-100 border border-base-200 shadow-sm">
                <div class="card-body p-4">
                  <form
                    action={`${props.basePath}/d1/${selectedDb}/query`}
                    method="post"
                    class="flex flex-col gap-3"
                    hx-post={`${props.basePath}/d1/${selectedDb}/query`}
                    hx-target="#d1-results"
                    hx-swap="outerHTML"
                  >
                    <label for="sql-input" class="font-bold text-sm opacity-80">
                      SQL Query
                    </label>
                    <textarea
                      id="sql-input"
                      name="query"
                      rows={4}
                      class="textarea textarea-bordered w-full font-mono text-sm leading-relaxed"
                      placeholder="SELECT * FROM sqlite_master"
                    >
                      {props.lastQuery || ""}
                    </textarea>
                    <div class="flex justify-end">
                      <button
                        type="submit"
                        class="btn btn-primary btn-sm gap-2"
                      >
                        <span class="material-symbols-outlined text-[18px]">
                          play_arrow
                        </span>
                        Run Query
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Results Area */}
              <D1Results queryResult={props.queryResult} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
