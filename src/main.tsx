import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { Site } from "./site/Site.tsx"
import { homeRedirectTarget, normalizePath } from "./site/paths.ts"
import "./styles.css"

const redirect = homeRedirectTarget(window.location.pathname, window.location.search, window.location.hash)
if (redirect) {
  window.location.replace(redirect)
} else {
  const path = normalizePath(window.location.pathname)
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {path === "/app" ? <App /> : <Site path={path} />}
    </StrictMode>,
  )
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js")
  })
}
