import React from "react";
import ReactDOM from "react-dom/client";
import { Toast } from "./components/Toast";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Toast />
  </React.StrictMode>,
);
