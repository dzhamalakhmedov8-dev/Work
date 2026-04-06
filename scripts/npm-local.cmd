@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_HOME=%ROOT%\.tools\node-v24.14.1-win-x64"
set "PATH=%NODE_HOME%;%PATH%"
"%NODE_HOME%\npm.cmd" %*
