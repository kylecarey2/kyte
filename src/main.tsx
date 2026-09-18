import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ToastProvider from "./components/toast/ToastProvider";
import StartupTransition from "./components/StartupTransition";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StartupTransition />
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
