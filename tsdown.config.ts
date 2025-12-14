import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.tsx"],
  dts: true,
  tsconfig: "./tsconfig.build.json",
});
