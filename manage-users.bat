@echo off
chcp 65001 > nul
set CLASSPATH=Chatserver/build/classes;Chatserver/lib/*

if "%1"=="" (
    java -cp "%CLASSPATH%" com.discordmini.server.tools.UserTool list
    goto end
)

java -cp "%CLASSPATH%" com.discordmini.server.tools.UserTool %*

:end
