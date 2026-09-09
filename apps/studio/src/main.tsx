import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Shell } from "./shell.js";
import { Workshop } from "./workshop.js";
import { ProjectPage } from "./project-page.js";
import "./studio.css";
const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});
const rootRoute = createRootRoute({ component: Shell });
const workshopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Workshop,
});
const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/project",
  component: ProjectPage,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([workshopRoute, projectRoute]),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
