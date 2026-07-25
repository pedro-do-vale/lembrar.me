set PATH=%PATH%;C:\Program Files\nodejs
call npm run build
powershell -Command "Compress-Archive -Path dist\* -DestinationPath dist.zip -Force"
