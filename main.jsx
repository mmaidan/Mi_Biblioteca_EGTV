import React from "react";
import ReactDOM from "react-dom/client";
import storage from "./storage.js";
import App from "./App.jsx";
import "./index.css";

// La app original (hecha para los artifacts de Claude) usa window.storage.
// Acá lo reemplazamos por un adaptador que habla con Supabase, así el
// componente no necesita casi ningún cambio.
window.storage = storage;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
