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
import { GoogleOAuthProvider, GoogleLogin, useGoogleLogin } from "@react-oauth/google";

const clientId =
  "986989868035-bbbpdr11ndnft9igim3p4oj5ha9mc658.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
    <MsalProvider instance={msalInstance}>
        <GoogleOAuthProvider clientId={clientId}>
            <App />
        </GoogleOAuthProvider>
    </MsalProvider>
);

