import { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import { getTypeOfEnvVariableValue } from "../utils";

export const EnvPage: FC<
  BaseProps & {
    env: {
      [key: string]: unknown;
    };
  }
> = (props) => {
  return (
    <div class="w-full h-full p-6" x-data="{ showValues: false }">
      <div class="flex justify-between items-center mb-6">
        <div></div>
        <button
          class="btn btn-sm btn-outline gap-2"
          type="button"
          x-on:click="showValues = !showValues"
        >
          <span
            class="material-symbols-outlined text-[18px]"
            x-text="showValues ? 'visibility_off' : 'visibility'"
          >
            visibility
          </span>
          <span x-text="showValues ? 'Hide Values' : 'Show Values'">
            Show Values
          </span>
        </button>
      </div>
      <div class="overflow-x-auto bg-base-100 rounded-box border border-base-200 shadow-sm">
        <table class="table w-full">
          <thead>
            <tr class="bg-base-200/50">
              <th>Variable Name</th>
              <th>Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(props.env).map(([key, value]) => {
              const typeInfo = getTypeOfEnvVariableValue(value);

              return (
                <tr key={key} class="hover">
                  <td class="font-medium">{key}</td>
                  <td>
                    <span class="badge badge-sm badge-ghost">
                      {typeInfo.type}
                    </span>
                  </td>
                  <td>
                    {typeInfo.isCloudflareType ? (
                      <span class="text-base-content/60 italic">
                        {typeInfo.type}
                      </span>
                    ) : (
                      <div>
                        <code
                          x-show="showValues"
                          class="font-mono text-sm break-all"
                          style="display: none;"
                        >
                          {JSON.stringify(typeInfo.value)}
                        </code>
                        <span
                          x-show="!showValues"
                          class="text-base-content/40 tracking-widest text-sm select-none"
                        >
                          ••••••••
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
