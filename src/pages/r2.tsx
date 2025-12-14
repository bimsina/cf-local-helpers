import { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import { getTypeOfEnvVariableValue } from "../utils";
import type { R2Bucket, R2Object } from "@cloudflare/workers-types";
import ChipsList from "../components/chips_list";

export const R2Page: FC<
  BaseProps & {
    env: {
      [key: string]: unknown;
    };
    bucketName?: string;
    objects?: R2Object[];
    delimitedPrefixes?: string[]; // Folders
    currentPrefix?: string;
    previewKey?: string;
    previewMeta?: R2Object;
  }
> = (props) => {
  const buckets = Object.fromEntries(
    Object.entries(props.env)
      .map(([key, value]) => {
        const typeInfo = getTypeOfEnvVariableValue(value);
        return typeInfo.type === "R2Bucket" ? [key, typeInfo.value] : null;
      })
      .filter((entry): entry is [string, R2Bucket] => entry !== null)
  );

  const bucketNames = Object.keys(buckets);
  const selectedBucket =
    props.bucketName && bucketNames.includes(props.bucketName)
      ? props.bucketName
      : bucketNames.length > 0
      ? bucketNames[0]
      : null;

  if (bucketNames.length === 0) {
    return (
      <div class="w-full h-full p-4">
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="text-gray-400 text-6xl mb-4">☁️</div>
            <h2 class="text-xl font-semibold text-gray-600 mb-2">
              No R2 Buckets Available
            </h2>
            <p class="text-gray-500">
              Bind R2 buckets to your environment to view and manage files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If we have a preview key, show the preview
  if (props.bucketName && props.previewKey && props.previewMeta) {
    const isImage =
      props.previewMeta.httpMetadata?.contentType?.startsWith("image/") ||
      false;
    const downloadUrl = `${props.basePath}/r2/${props.bucketName}/raw/${props.previewKey}`;

    return (
      <div class="w-full h-full p-6 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          {/* Back button should return to the folder containing the file */}
          <a
            href={`${props.basePath}/r2/${props.bucketName}${
              // Try to construct back link with prefix if possible, though we don't have it easily here
              // unless we parse the key or pass it via props. For now, simple back
              ""
            }`}
            onclick="history.back(); return false;" /* Better to use history back for folder context */
            class="btn btn-sm btn-ghost gap-2"
          >
            <span class="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </a>
        </div>
        <div class="card bg-base-100 shadow-sm border border-base-200 flex-1 overflow-hidden">
          <div class="card-body p-0 flex flex-col h-full">
            <div class="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/30">
              <div>
                <h3 class="font-bold text-lg truncate max-w-xl">
                  {props.previewKey}
                </h3>
                <div class="text-xs text-base-content/60 flex gap-4 mt-1">
                  <span>
                    Size: {(props.previewMeta.size / 1024).toFixed(2)} KB
                  </span>
                  <span>
                    Type:{" "}
                    {props.previewMeta.httpMetadata?.contentType || "Unknown"}
                  </span>
                  <span>
                    Uploaded: {props.previewMeta.uploaded.toLocaleString()}
                  </span>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={props.previewKey.split("/").pop()} // Suggest filename
                class="btn btn-primary btn-sm gap-2"
              >
                <span class="material-symbols-outlined text-[18px]">
                  download
                </span>
                Download
              </a>
            </div>
            <div class="flex-1 overflow-auto p-8 flex items-center justify-center bg-base-200/50">
              {isImage ? (
                <img
                  src={downloadUrl}
                  alt={props.previewKey}
                  class="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                />
              ) : (
                <div class="text-center opacity-60">
                  <div class="text-6xl mb-4">📄</div>
                  <p>Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generate breadcrumbs from prefix
  const breadcrumbs = [];
  if (selectedBucket) {
    breadcrumbs.push({ name: selectedBucket, prefix: "" });
    if (props.currentPrefix) {
      const parts = props.currentPrefix.split("/").filter(Boolean);
      let currentPath = "";
      parts.forEach((part) => {
        currentPath += part + "/";
        breadcrumbs.push({ name: part, prefix: currentPath });
      });
    }
  }

  return (
    <div class="w-full h-full p-6">
      <div class="flex flex-col gap-6 h-full">
        <div class="flex justify-between items-center">
          {/* Breadcrumbs */}
          <div class="text-sm breadcrumbs">
            <ul>
              {/* Always modify root link to reset prefix */}
              <li>
                <a
                  href={`${props.basePath}/r2/${
                    selectedBucket ? selectedBucket : ""
                  }`}
                >
                  Root
                </a>
              </li>
              {breadcrumbs.slice(1).map((crumb, index) => (
                <li key={crumb.prefix}>
                  {index === breadcrumbs.length - 2 ? (
                    <span class="font-bold">{crumb.name}</span>
                  ) : (
                    <a
                      href={`${props.basePath}/r2/${selectedBucket}?prefix=${crumb.prefix}`}
                    >
                      {crumb.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Bucket Switcher (Only if there are multiple buckets?) or just simple label */}
          {/* We can keep ChipsList but maybe smaller or integrated differently if we want breadcrumbs to be main nav */}
        </div>

        {/* Bucket Selection Chips - Keep for switching buckets */}
        <ChipsList
          selected={selectedBucket}
          chips={bucketNames.map((name) => ({
            label: name,
            value: name,
            link: `${props.basePath}/r2/${name}`, // Default link resets prefix
          }))}
        />

        {/* Object List */}
        {selectedBucket && (
          <div class="flex flex-col gap-4 flex-1 overflow-hidden">
            {props.objects || props.delimitedPrefixes ? (
              props.objects?.length === 0 &&
              (!props.delimitedPrefixes ||
                props.delimitedPrefixes.length === 0) ? (
                <div class="alert alert-info shadow-sm">
                  <span class="material-symbols-outlined">info</span>
                  <span>Folder is empty</span>
                </div>
              ) : (
                <div class="overflow-x-auto bg-base-100 rounded-box border border-base-200 shadow-sm flex-1">
                  <table class="table table-pin-rows w-full">
                    <thead>
                      <tr class="bg-base-200/50">
                        <th class="w-10"></th>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Uploaded</th>
                        <th class="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Go Up Directory */}
                      {props.currentPrefix && (
                        <tr
                          class="hover cursor-pointer"
                          onclick={`window.location.href='${
                            props.basePath
                          }/r2/${selectedBucket}?prefix=${
                            // Remove last segment
                            props.currentPrefix
                              .split("/")
                              .slice(0, -2)
                              .join("/") +
                            (props.currentPrefix.split("/").length > 2
                              ? "/"
                              : "")
                          }'`}
                        >
                          <td class="text-center">
                            <span class="material-symbols-outlined">
                              folder_open
                            </span>
                          </td>
                          <td class="font-medium" colspan={5}>
                            ..
                          </td>
                        </tr>
                      )}

                      {/* Folders */}
                      {props.delimitedPrefixes?.map((prefix) => (
                        <tr
                          key={prefix}
                          class="hover cursor-pointer group"
                          onclick={`window.location.href='${props.basePath}/r2/${selectedBucket}?prefix=${prefix}'`}
                        >
                          <td class="text-center">
                            <span class="material-symbols-outlined">
                              folder
                            </span>
                          </td>
                          <td class="font-medium">
                            <a
                              href={`${props.basePath}/r2/${selectedBucket}?prefix=${prefix}`}
                              class="link link-hover hover:text-primary no-underline font-bold"
                              onclick="event.stopPropagation();"
                            >
                              {prefix.split("/").filter(Boolean).pop()}/
                            </a>
                          </td>
                          <td class="opacity-50 italic">-</td>
                          <td class="opacity-50 italic">Folder</td>
                          <td class="opacity-50 italic">-</td>
                          <td class="text-right">
                            <span class="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100">
                              Open
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Files */}
                      {props.objects?.map((obj) => (
                        <tr key={obj.key} class="hover">
                          <td class="text-center">
                            <span class="material-symbols-outlined text-base-content/50">
                              draft
                            </span>
                          </td>
                          <td
                            class="font-medium max-w-xs truncate"
                            title={obj.key}
                          >
                            {/* Display only filename if prefixed */}
                            {obj.key.startsWith(props.currentPrefix || "")
                              ? obj.key.slice(
                                  (props.currentPrefix || "").length
                                )
                              : obj.key}
                          </td>
                          <td class="opacity-70 font-mono text-xs">
                            {(obj.size / 1024).toFixed(2)} KB
                          </td>
                          <td class="opacity-70 truncate max-w-xs text-xs">
                            {obj.httpMetadata?.contentType || "-"}
                          </td>
                          <td class="opacity-70 text-xs text-nowrap">
                            {obj.uploaded.toLocaleString()}
                          </td>
                          <td class="text-right">
                            <a
                              href={`${
                                props.basePath
                              }/r2/${selectedBucket}/view/${encodeURIComponent(
                                obj.key
                              )}`}
                              class="btn btn-xs btn-ghost text-primary"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div class="hero bg-base-200 rounded-box p-8">
                <div class="hero-content text-center">
                  <div class="max-w-md">
                    <span class="text-4xl">🔄</span>
                    <h3 class="text-lg font-bold mt-2">
                      Loading bucket contents...
                    </h3>
                    <p class="py-4">
                      Navigate to{" "}
                      <code class="badge badge-neutral">{`${props.basePath}/r2/${selectedBucket}`}</code>{" "}
                      to load data
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
