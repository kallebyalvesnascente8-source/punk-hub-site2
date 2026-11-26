@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === PUNK HUB: gerando instalador para Windows ===
where node >nul 2>nul || (echo Instale o Node.js 18 ou mais novo em https://nodejs.org e rode de novo. & pause & exit /b 1)
call npm install || (echo Falha no npm install & pause & exit /b 1)
rem npm novo bloqueia o postinstall do Electron (que baixa o binario). Este script confere,
rem mostra o erro completo, tenta cache limpo e espelho, e aceita um .zip baixado a mao.
node scripts\ensure-electron.js || (echo. & echo O binario do Electron nao foi obtido. Veja as mensagens acima e o arquivo install-electron.log. & pause & exit /b 1)
if not exist "node_modules\electron\dist\electron.exe" (echo electron.exe continua ausente & pause & exit /b 1)
call npm test || (echo Testes falharam & pause & exit /b 1)
call npm run dist || (echo Falha ao gerar o instalador & pause & exit /b 1)
if not exist "dist\PUNK-HUB-Setup-1.0.0.exe" (echo Instalador nao encontrado em dist & pause & exit /b 1)
echo.
echo Pronto. O instalador esta em: %cd%\dist\PUNK-HUB-Setup-1.0.0.exe
explorer dist
pause
