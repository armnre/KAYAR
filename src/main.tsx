import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/vazirmatn/wght.css";
import "@fontsource-variable/sora/wght.css";
import "./index.css";
import App from "./App";
import { KayarProvider } from "./app/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KayarProvider>
      <App />
    </KayarProvider>
  </StrictMode>
);

// PWA registration — offline shell + installability. Production https only.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is progressive enhancement */
    });
  });
}
