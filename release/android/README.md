# PUNK HUB para Android

App Android independente. Usa o mesmo Hub da versao Windows dentro de um WebView (Capacitor),
com tudo salvo no proprio celular. Nao precisa do computador.

## Gerar o APK

### Opcao A: GitHub (sem instalar nada)
1. Suba esta pasta para um repositorio no GitHub.
2. Aba Actions > "Build Android APK" > Run workflow.
3. Baixe o artefato `PUNK-HUB-apk` (contem `PUNK-HUB-<versao>.apk`).

### Opcao B: no seu computador
1. Instale Node.js 20+, JDK 21 e o Android Studio (ele baixa o Android SDK).
2. Defina `ANDROID_HOME` (Windows: `%LOCALAPPDATA%\Android\Sdk`).
3. Rode `npm run apk`. O APK sai em `dist-apk/`.

O APK e assinado com a chave de depuracao do Android: instala normalmente no celular, mas
nao serve para publicar na Play Store (isso exige uma chave propria).

## Instalar no celular
Copie o APK, abra-o e permita "instalar apps desconhecidos" para o app que o abriu.

## PUNK AI no celular
Roda 100% no aparelho via Termux + Ollama (`pkg install ollama`). As instrucoes aparecem no proprio app,
no PUNK AI. Modelos pequenos (ex.: llama3.2:1b) sao os mais viaveis; o desempenho depende do aparelho.

## O que e diferente do Windows
- Fotos: importa da galeria pelo seletor do Android; editar cria copia na biblioteca do app.
  "Salvar como" abre a folha de compartilhamento do Android (salvar em Arquivos, Drive, etc.).
- Botao Voltar do Android fecha visualizador, paineis e janelas; na tela inicial minimiza o app.
- Monitor de CPU/RAM/processos e busca de arquivos do PC dependem do agente do computador e
  ficam opcionais; o widget de informacoes mostra dados do aparelho.

## Atualizar o Hub
Substitua `www/index.html` pelo build novo e rode `npm run sync` (ou `npm run apk`).
