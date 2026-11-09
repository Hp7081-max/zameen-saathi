import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ऑफ़लाइन में भी ऐप का ढाँचा (और फ़ॉन्ट) खुले। /api कभी cache नहीं होता: देखें public/sw.js
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
}
