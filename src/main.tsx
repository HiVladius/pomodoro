import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initDatabase } from "./db/database";
import { testDatabaseConnection } from "./db/test";

// Inicializar la base de datos al cargar la app
initDatabase()
  .then(() => {
    console.log("Database initialized");
    // Ejecutar prueba de conexión
    return testDatabaseConnection();
  })
  .then((result) => {
    console.log("Database test result:", result);
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
  });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
