# VM Import UI Installer

A web-based installer application designed to seamlessly deploy the [Harvester VM Import UI](https://github.com/doccaz/vm-import-ui) into your Kubernetes cluster.

## Features

* **Instant Manifest Generation:** Instantly generates the required Kubernetes YAML configuration needed to deploy the VM Import UI.
* **Streamlined Installation:** The generated YAML contains the Namespace, RBAC configs, Deployment, Service, and Ingress (at `/vm-import-ui`) to run the UI seamlessly in your cluster while still connecting to the target Harvester clusters via your provided kubeconfig.
* **Modern Interface:** A clean, responsive design inspired by the SUSE styling ecosystem, built with React, Tailwind CSS, and Vite.
* **Client-Only Architecture:** Completely static frontend so your cluster credentials and commands never leave your browser.

## Architecture & How It Works

This application is a 100% static client-side (SPA) web application built with React and Tailwind CSS. It works by generating the required YAML definitions purely in your browser. 

Since it doesn't have a backend and relies on standard Kubernetes tooling (`kubectl`), it is inherently safer, scalable, and fully compatible with static hosting services like GitHub Pages.

## Local Development

To run this tool locally:

```bash
# 1. Install dependencies
npm install

# 2. Run the development environment
npm run dev
```

The application will bind to port 3000 by default.

## Production Build

To compile a bundled and optimized static version of the frontend UI:

```bash
npm run build
``` 

The static files will be placed in the `dist` directory. You can serve them using any static web server.

## Deployment to GitHub Pages

A GitHub Actions workflow (`.github/workflows/pages.yml`) is provided in this repository to automatically build and deploy this site to GitHub Pages. Because this is purely a static frontend app, GitHub pages is perfectly capable of hosting it in full with zero loss of functionality.
