fx_version 'cerulean'
game 'gta5'

name 'ket_core'
description 'Accounts, authentication, sessions and spawning'
version '2.0.0'
node_version '22'

ui_page 'dist/web/index.html'
files { 'dist/web/**' }

client_script 'dist/client.js'
server_script 'dist/server.js'

dependency 'oxmysql'
