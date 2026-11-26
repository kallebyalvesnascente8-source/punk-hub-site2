# PUNK HUB para Windows

Painel desktop (Electron) com widgets, temas, PUNK Photos e PUNK AI (Ollama local).

## Gerar o instalador .exe (no Windows)

1. Instale o Node.js 18 ou mais novo: https://nodejs.org
2. Abra esta pasta e de dois cliques em `build-windows.bat`
   (ou, no terminal: `npm install` e depois `npm run dist`).
3. O instalador fica em `dist\PUNK-HUB-Setup-1.0.0.exe`.

Sem Windows por perto: suba a pasta para um repositorio no GitHub e rode a
acao "Build Windows installer" (aba Actions). O .exe sai como artefato.

## Rodar sem instalar

    npm install
    npm start

## PUNK AI

Instale o Ollama (https://ollama.com), rode `ollama pull llama3.2` e abra o PUNK AI.
Tudo local, sem APIs externas.

## PUNK Photos

Abra Fotos > "Fotos do PC" ou "Pasta...". Formatos: PNG, JPG, JPEG, WEBP, BMP.
Editar sempre cria uma copia ao lado do original (`nome-editado.png`); o original nunca e sobrescrito.
"Usar como wallpaper" aplica a imagem ao PUNK HUB.

## PUNK Music

Abra Musica. "Importar musicas" copia arquivos para a biblioteca do Hub; "Adicionar pasta" (so no app Windows) le a pasta sem copiar nada: o audio e transmitido do proprio disco pelo protocolo `punkaudio://`, com suporte a busca (Range). "Atualizar pastas" acrescenta musicas novas e tira as que sumiram.
Formatos: MP3, WAV, FLAC e OGG. So pastas que voce escolheu sao acessiveis (resolvendo links simbolicos), e so arquivos de audio.
O player continua tocando com outros modulos abertos, aparece como botao na barra e como widget "Musica" na tela inicial. Cores, fontes e efeitos vem do tema ativo do Hub.

## Dados e seguranca

- Personalizacoes ficam salvas automaticamente (localStorage do app e IndexedDB).
- O app so le imagens de pastas que voce escolher.
- O agente local escuta so em 127.0.0.1 e exige token. Encerrar processos vem desligado
  (Configuracoes > Sistema).

## Testes

`npm test` valida os helpers e o agente (33 + 9 testes).

## Se o electron.exe nao aparecer

O `build-windows.bat` roda `scripts/ensure-electron.js`, que mostra o erro completo do download
(tambem salvo em `install-electron.log`), testa a rede (DNS, GitHub, espelho), tenta de novo com
cache limpo e com o espelho npmmirror.com, e usa um .zip baixado a mao.

Se nada funcionar (rede corporativa, antivirus, proxy), faca o download manual:
1. Baixe `electron-v<versao>-win32-x64.zip` em https://github.com/electron/electron/releases (o script informa a versao exata).
2. Salve o zip na pasta do projeto ou em Downloads e rode `node scripts/ensure-electron.js`
   (ou `node scripts/ensure-electron.js --zip "C:\\caminho\\arquivo.zip"`).

O `package.json` ja libera o postinstall do Electron (`allowScripts`) e usa o Electron instalado
na hora de empacotar (`electronDist`).
