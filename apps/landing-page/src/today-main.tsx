import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { TodayApp } from "./TodayApp";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <TodayApp />
  </StrictMode>
);
