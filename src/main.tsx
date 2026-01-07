// Environment validation - runs at startup to fail fast if misconfigured
import "./env";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./shared/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
