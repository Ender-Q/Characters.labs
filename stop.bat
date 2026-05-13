@echo off
title Stop Character Labs
echo Stopping Character Labs servers...
taskkill /F /IM node.exe 2>nul
echo Done!