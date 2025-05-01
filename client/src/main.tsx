// import { createRoot } from "react-dom/client";
// import App from "./App";
// import "./index.css";

// createRoot(document.getElementById("root")!).render(<App />);


// main.jsx or index.jsx
// src/main.jsx
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./msalConfig";

ReactDOM.createRoot(document.getElementById("root")).render(
    <MsalProvider instance={msalInstance}>
        <App />
    </MsalProvider>
);

