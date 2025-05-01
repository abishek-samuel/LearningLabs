// msalConfig.js
import { PublicClientApplication } from "@azure/msal-browser";

export const msalInstance = new PublicClientApplication({
    auth: {
        clientId: "64a69f48-2310-408e-bd4d-d539a11498b0",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin,
    },
});
