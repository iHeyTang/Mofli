import { resolve } from "node:path";
import { writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { registryFor } from "./registry.mjs";
export function projectPlugin(projectRoot) {
  const moduleId = "\0mofli-creator-project";
  return {
    name: "mofli-project",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        (source === "./project.js" || source === "../project.js") &&
        (importer?.endsWith("/reference.ts") ||
          importer?.endsWith("/catalog.ts"))
      )
        return moduleId;
    },
    load(id) {
      if (id === moduleId)
        return `export {default} from ${JSON.stringify(resolve(projectRoot, "mofli.project.ts"))};export const projectMode=true;export const projectKey=${JSON.stringify(projectRoot)};`;
    },
    configureServer(server) {
      server.middlewares.use("/__mofli/save-pet", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (
          req.method !== "POST" ||
          req.headers.origin !== `http://${req.headers.host}` ||
          !req.headers["content-type"]?.startsWith("application/json")
        ) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Invalid local request" }));
          return;
        }
        try {
          let size = 0;
          const chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 500000) throw new Error("Configuration exceeds 500 KB");
            chunks.push(chunk);
          }
          const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const project = (
            await server.ssrLoadModule(resolve(projectRoot, "mofli.project.ts"))
          ).default;
          const config = (await registryFor(project)).resolve(value).config;
          const temporary = resolve(
            projectRoot,
            ".mofli-" + randomUUID() + ".tmp",
          );
          try {
            await writeFile(temporary, JSON.stringify(config, null, 2) + "\n", {
              flag: "wx",
            });
            await rename(temporary, resolve(projectRoot, "pet.json"));
          } finally {
            await rm(temporary, { force: true });
          }
          res.end(JSON.stringify({ file: "pet.json" }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
