import type { FC } from "hono/jsx";
import type { BaseProps } from "../types";
import Head from "./head";

const Header: FC<{ title?: string }> = (props) => {
  return (
    <header class="px-6 h-12 flex-shrink-0 pt-2 border-b border-gray-200">
      <div class="flex-1 flex items-center">
        <h2 class="text-xl font-semibold opacity-80">
          {props.title || "Dashboard"}
        </h2>
      </div>
      <div class="flex-none gap-2"></div>
    </header>
  );
};

const SidebarItem: FC<{
  label: string;
  href: string;
  currentPath: string;
  icon?: any;
}> = (props) => {
  const isActive =
    props.currentPath === props.href ||
    (props.href !== "/" &&
      props.href !== "" &&
      props.currentPath.startsWith(props.href + "/"));

  return (
    <li>
      <a href={props.href} class={isActive ? "bg-gray-100" : ""}>
        {props.icon && <span>{props.icon}</span>}
        <span>{props.label}</span>
      </a>
    </li>
  );
};

export const SidebarLayout: FC<
  BaseProps & {
    activePath: string;
  }
> = (props) => {
  const getTitle = () => {
    // Simple heuristic for title based on active path
    if (props.activePath.includes("/env")) return "Environment Variables";
    if (props.activePath.includes("/kv")) return "KV Namespaces";
    if (props.activePath.includes("/r2")) return "R2 Buckets";
    if (props.activePath.includes("/d1")) return "D1 Databases";
    return "Home";
  };

  return (
    <html>
      <Head />
      <body class="flex h-screen bg-base-200 font-sans text-base-content antialiased overflow-hidden">
        {/* Sidebar */}
        <aside class="w-72 flex flex-col bg-base-100 z-10 border-r border-gray-200">
          <div class="h-16 flex items-center px-6">
            <div class="flex items-center gap-2 text-primary">
              <span class="text-lg font-bold tracking-tight">CF Helpers</span>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-3 py-4">
            <ul class="menu w-full gap-1 p-0">
              <SidebarItem
                href={`${props.basePath}/`}
                currentPath={props.activePath}
                label="Dashboard"
                icon={<span class="material-symbols-outlined">dashboard</span>}
              />
              <SidebarItem
                href={`${props.basePath}/env`}
                currentPath={props.activePath}
                label="Environment"
                icon={
                  <span class="material-symbols-outlined">
                    settings_suggest
                  </span>
                }
              />
              <SidebarItem
                href={`${props.basePath}/kv`}
                currentPath={props.activePath}
                label="KV Namespaces"
                icon={<span class="material-symbols-outlined">dns</span>}
              />
              <SidebarItem
                href={`${props.basePath}/r2`}
                currentPath={props.activePath}
                label="R2 Buckets"
                icon={<span class="material-symbols-outlined">cloud</span>}
              />
              <SidebarItem
                href={`${props.basePath}/d1`}
                currentPath={props.activePath}
                label="D1 Databases"
                icon={<span class="material-symbols-outlined">database</span>}
              />
            </ul>
          </div>
        </aside>

        {/* Main Content Area */}
        <div class="flex-1 flex flex-col min-w-0">
          <Header title={getTitle()} />

          <main class="flex-1 p-2 h-full overflow-auto">{props.children}</main>
        </div>
      </body>
    </html>
  );
};
