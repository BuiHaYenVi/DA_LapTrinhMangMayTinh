@echo off
chcp 65001 > nul
title Discord Mini - Giao diện Java Swing Desktop
echo ============================================================
echo   DISCORD MINI - GIAO DIỆN DESKTOP JAVA SWING NATIVE
echo ============================================================
echo Dang khoi dong cua so Java Swing...
echo.

cd /d "%~dp0ChatClient"
start "" javaw -cp bin com.discordmini.client.SwingApplication
exit
