# Quorum - Multi-model AI code review app

# Run the Electron app in dev mode (Vite + Electron with hot reload)
run:
    npm run electron:dev

# Run typechecking (both renderer and electron tsconfigs)
test:
    npm run typecheck

# Run Vite dev server only (no Electron shell)
dev:
    npm run dev

# Production build
build:
    npm run build

# Build distributable Electron package
package:
    npm run electron:build

# Preview the Vite production build
preview:
    npm run preview

# Install dependencies and rebuild native modules for Electron
install:
    npm install
    npx @electron/rebuild -m .
