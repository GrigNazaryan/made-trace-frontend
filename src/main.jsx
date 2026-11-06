import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import { I18nProvider } from "./lib/i18n/index.jsx";
import { HashRouterProvider } from "./router/HashRouter.jsx";

import "./styles/styles.css";
import "./styles/polish.css";
import "./styles/refinement.css";

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <HashRouterProvider>
          <App />
        </HashRouterProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);
