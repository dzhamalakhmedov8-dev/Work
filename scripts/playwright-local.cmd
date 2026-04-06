@echo off
setlocal
set "ROOT=%~dp0.."
set "PLAYWRIGHT_BROWSERS_PATH=0"
"%ROOT%\.tools\node-v24.14.1-win-x64\node.exe" "%ROOT%\node_modules\playwright\cli.js" %*
