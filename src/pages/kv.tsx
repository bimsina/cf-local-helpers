import { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import { getTypeOfEnvVariableValue } from "../utils";
import type { KVNamespace } from "@cloudflare/workers-types";
import ChipsList from "../components/chips_list";

export type KVPageProps = BaseProps & {
  env: {
    [key: string]: unknown;
  };
  kvId?: string;
  search?: string;
  kvData?: Array<{
    name: string;
    expiration?: number;
    metadata?: unknown;
    value?: string;
  }>;
};

export const KVRows: FC<{
  basePath: string;
  kvId: string;
  kvData: NonNullable<KVPageProps["kvData"]>;
}> = ({ basePath, kvId, kvData }) => {
  return (
    <tbody id="kv-rows">
      {kvData.map((item) => (
        <tr key={item.name} class="hover group">
          <td class="font-medium max-w-xs truncate" title={item.name}>
            {item.name}
          </td>
          <td class="max-w-xs truncate" title={item.value}>
            {item.value}
          </td>
          <td class="opacity-70 text-xs text-nowrap">
            {item.expiration
              ? new Date(item.expiration * 1000).toLocaleString()
              : "-"}
          </td>
          <td class="text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="btn btn-xs btn-square btn-ghost text-gray-500"
              hx-get={`${basePath}/kv/${kvId}/entries/${encodeURIComponent(
                item.name
              )}/edit`}
              hx-target="#kv-modal-content"
              hx-trigger="click"
              onclick="document.getElementById('kv_modal').showModal()"
            >
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button
              class="btn btn-xs btn-square btn-ghost text-gray-500"
              hx-delete={`${basePath}/kv/${kvId}/entries/${encodeURIComponent(
                item.name
              )}`}
              hx-confirm={`Are you sure you want to delete '${item.name}'?`}
              hx-target="#kv-rows"
              hx-swap="outerHTML"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  );
};

export const KVKeyForm: FC<{
  basePath: string;
  kvId: string;
  entry?: {
    key: string;
    value: string;
    expirationTtl?: number;
    metadata?: string;
  };
  error?: string;
}> = ({ basePath, kvId, entry, error }) => {
  const isEdit = !!entry;
  return (
    <div id="kv-modal-content" class="w-full">
      <h3 class="font-bold text-lg mb-4">
        {isEdit ? `Edit Key: ${entry.key}` : "Add New Key"}
      </h3>

      {error && (
        <div class="alert alert-error text-sm mb-4 rounded-md p-2">
          <span class="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      <form
        hx-post={`${basePath}/kv/${kvId}/entries`}
        hx-target="#kv-rows"
        hx-swap="outerHTML"
        // Close modal on success if we can detect it, or return a script to close it?
        // Simple way: htmx swap replaces rows, we need to close modal separately.
        // We can use hx-on::after-request="if(event.detail.successful) document.getElementById('kv_modal').close()"
        hx-on--after-request="if(event.detail.successful) document.getElementById('kv_modal').close()"
        class="flex flex-col gap-4"
      >
        {isEdit && <input type="hidden" name="key" value={entry.key} />}

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Key</span>
          </label>
          <input
            type="text"
            name="key"
            placeholder="e.g., config:app_name"
            class="input input-bordered w-full"
            value={entry?.key || ""}
            disabled={isEdit} // Key cannot be changed in simple edit
            required
          />
        </div>

        <div class="form-control w-full flex flex-col">
          <label class="label">
            <span class="label-text">Value</span>
          </label>
          <textarea
            name="value"
            class="textarea textarea-bordered h-24 font-mono text-sm w-full"
            placeholder="Value content..."
            required
          >
            {entry?.value || ""}
          </textarea>
        </div>

        <div class="form-control w-full flex flex-col">
          <label class="label">
            <span class="label-text">Expiration TTL (seconds)</span>
            <span class="label-text-alt opacity-60">Optional</span>
          </label>
          <input
            type="number"
            name="expirationTtl"
            placeholder="e.g., 3600"
            class="input input-bordered w-full"
            value={entry?.expirationTtl || ""}
          />
        </div>
        <div class="form-control w-full flex flex-col">
          <label class="label">
            <span class="label-text">Metadata (JSON)</span>
            <span class="label-text-alt opacity-60">Optional</span>
          </label>
          <textarea
            name="metadata"
            class="textarea textarea-bordered font-mono text-sm w-full"
            placeholder='{"source": "dashboard"}'
          >
            {entry?.metadata || ""}
          </textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            onclick="document.getElementById('kv_modal').close()"
          >
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            {isEdit ? "Update" : "Add Key"}
          </button>
        </div>
      </form>
    </div>
  );
};

export const KVPage: FC<KVPageProps> = (props) => {
  const kvs = Object.fromEntries(
    Object.entries(props.env)
      .map(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "KVNamespace" ? [key, typeInfo.value] : null;
      })
      .filter((entry): entry is [string, KVNamespace] => entry !== null)
  );

  const kvNames = Object.keys(kvs);
  const selectedKV =
    props.kvId && kvNames.includes(props.kvId)
      ? props.kvId
      : kvNames.length > 0
      ? kvNames[0]
      : null;

  if (kvNames.length === 0) {
    return (
      <div class="w-full h-full p-4">
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="text-gray-400 text-6xl mb-4">🔑</div>
            <h2 class="text-xl font-semibold text-gray-600 mb-2">
              No KV Namespaces
            </h2>
            <p class="text-gray-500">Bind KV namespaces to use this feature.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="w-full h-full p-6">
      <ChipsList
        title="Select KV Namespace"
        selected={selectedKV}
        chips={kvNames.map((name) => ({
          label: name,
          value: name,
          link: `${props.basePath}/kv/${name}`,
        }))}
      />

      {selectedKV && (
        <>
          <div class="flex justify-between mb-6 items-center w-full">
            <div class="flex gap-2">
              <button
                class="btn btn-primary btn-sm gap-2"
                onclick="document.getElementById('kv_modal').showModal()"
                hx-get={`${props.basePath}/kv/${selectedKV}/entries/new`}
                hx-target="#kv-modal-content"
                hx-swap="outerHTML"
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
                Add Key
              </button>
              <button
                class="btn btn-error btn-outline btn-sm gap-2"
                hx-delete={`${props.basePath}/kv/${selectedKV}/entries`}
                hx-confirm={`Are you sure you want to clear all data from '${selectedKV}'? This action cannot be undone.`}
                hx-target="#kv-rows"
                hx-swap="outerHTML"
              >
                <span class="material-symbols-outlined text-[18px]">
                  clear_all
                </span>
                Clear Data
              </button>
            </div>
            <div class="form-control w-64">
              <label class="input">
                <svg
                  class="h-[1em] opacity-50"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    stroke-width="2.5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </g>
                </svg>
                <input
                  type="text"
                  name="search"
                  value={props.search || ""}
                  placeholder="Search keys..."
                  hx-get={`${props.basePath}/kv/${selectedKV}`}
                  hx-trigger="input changed delay:500ms, search"
                  hx-target="#kv-rows"
                  hx-swap="outerHTML"
                />
              </label>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            {
              <div class="overflow-x-auto bg-base-100 rounded-box border border-base-200 shadow-sm">
                <table class="table w-full">
                  <thead>
                    <tr class="bg-base-200/50">
                      <th>Key</th>
                      <th>Value</th>
                      <th>Expiration</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <KVRows
                    basePath={props.basePath}
                    kvId={selectedKV}
                    kvData={props.kvData || []}
                  />
                </table>
              </div>
            }
          </div>
        </>
      )}

      {/* Modal for Add/Edit */}
      <dialog id="kv_modal" class="modal">
        <div class="modal-box">
          {/* Initial placeholder content, swapped by HTMX */}
          <div id="kv-modal-content">
            <div class="flex justify-center p-4">
              <span class="loading loading-spinner"></span>
            </div>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};
