# PUNK HUB

- `hub/`      código do Hub (uma interface só, usada no Windows e no Android). `node hub/build.js` gera e copia.
- `windows/`  app Windows (Electron). Instalador: `npm install` e `npm run dist` em `windows/`, ou deixe o GitHub fazer.
- `android/`  app Android (Capacitor). APK: veja `android/README.md`, ou deixe o GitHub fazer.
- `tools/`    `lancar.js` prepara uma versão nova.
- `.github/workflows/release.yml` compila EXE e APK e cria o Release quando você cria uma tag `vX.Y.Z`.
- `site/`     site oficial de downloads (GitHub Pages), separado do app.
- `site-propostas/` as 3 propostas (a escolhida foi a A).

Passo a passo para publicar: `PUBLICAR.md`.
