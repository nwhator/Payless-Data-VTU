import "../css/app.css"

import { createInertiaApp } from "@inertiajs/react"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { createRoot } from "react-dom/client"
import AppProviders from "@/components/AppProviders"
import axios from 'axios';

// Extend Window interface
declare global {
  interface Window {
    axios: typeof axios;
  }
}

// Only run this in the browser (not during SSR)
if (typeof window !== 'undefined') {
    window.axios = axios;
    window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
}

const appName = import.meta.env.VITE_APP_NAME || 'Payless Data'

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) =>
    resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob("./pages/**/*.tsx")
    ),
  setup({ el, App, props }) {
    const root = createRoot(el)

    root.render(
      <AppProviders>
        <App {...props} />
      </AppProviders>
    )
  },
  progress: {
    color: "#4B5563",
  },
})