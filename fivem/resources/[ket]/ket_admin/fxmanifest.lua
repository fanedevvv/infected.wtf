fx_version 'cerulean'
game 'gta5'

name 'ket_admin'
description 'Admin commands and control panel (/admin)'
version '2.0.0'
node_version '22'

ui_page 'dist/web/index.html'
files { 'dist/web/**' }

client_script 'dist/client.js'
server_script 'dist/server.js'

dependencies { 'oxmysql', 'ket_core', 'ket_chat' }
