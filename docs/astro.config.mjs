// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: "/docs",
  trailingSlash: "always",
  outDir: "./dist",
  integrations: [
    starlight({
      title: "Pulse Board",
      description: "Real-time online polling platform — admin and developer docs.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/developedbysaad/pulse-board",
        },
      ],
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Overview", slug: "" },
            { label: "Local development", slug: "local-development" },
            { label: "Architecture", slug: "architecture" },
          ],
        },
        {
          label: "Design",
          items: [
            { label: "Design principles", slug: "design-principles" },
            { label: "Design system", slug: "design-system" },
            { label: "Technical architecture", slug: "technical-architecture" },
          ],
        },
        {
          label: "Using Pulse Board",
          items: [
            { label: "Creating polls", slug: "creating-polls" },
            { label: "Response modes", slug: "response-modes" },
            { label: "Publishing results", slug: "publishing-results" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "REST API", slug: "api-reference" },
            { label: "WebSocket events", slug: "websocket-events" },
            { label: "Database schema", slug: "schema" },
          ],
        },
        {
          label: "Operations",
          items: [
            { label: "Deploying with Kamal", slug: "deploying" },
            { label: "Environment variables", slug: "environment" },
            { label: "Secrets, deploys & safety", slug: "secrets-and-safety" },
          ],
        },
      ],
    }),
  ],
});
