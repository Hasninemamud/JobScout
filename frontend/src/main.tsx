import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/anton";
import "@fontsource-variable/plus-jakarta-sans";
import { App } from "@/app/App";
import "@/styles/tokens.css";
import "@/styles/global.css";
import "@/styles/app-header.css";
import "@/styles/hero.css";
import "@/styles/jobs.css";
import "@/styles/job-modal.css";
import "@/styles/landing.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
