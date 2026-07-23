import React from "react";
import MainWindow from "./mainWindow";
import { AdminStudioApp } from "./AdminStudioApp";
import { createRoot } from "react-dom/client";

const container = document.getElementById("app");
const root = createRoot(container);

const isAdmin = window.location.search.includes("mode=admin") || process.env.APP_MODE === "admin";

if (isAdmin) {
  root.render(<AdminStudioApp />);
} else {
  root.render(<MainWindow />);
}
