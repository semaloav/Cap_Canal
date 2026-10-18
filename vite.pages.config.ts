import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath,URL} from "node:url";

export default defineConfig({
 root:fileURLToPath(new URL("./web",import.meta.url)),
 publicDir:fileURLToPath(new URL("./public",import.meta.url)),
 base:process.env.PAGES_BASE_PATH||"/Cap_Canal/",
 plugins:[react()],
 resolve:{dedupe:["react","react-dom"]},
 build:{outDir:fileURLToPath(new URL("./pages-dist",import.meta.url)),emptyOutDir:true},
});
