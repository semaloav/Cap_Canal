import {build} from "vite";
import react from "@vitejs/plugin-react";
import {pathToFileURL} from "node:url";
import path from "node:path";
await build({configFile:false,plugins:[react()],logLevel:"error",build:{ssr:"tests/gvf-render.fixture.tsx",outDir:".qa-gvf",rollupOptions:{output:{entryFileNames:"render.mjs"}}}});
await import(pathToFileURL(path.resolve(".qa-gvf/render.mjs")).href);
