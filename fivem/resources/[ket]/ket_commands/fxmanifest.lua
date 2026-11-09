fx_version 'cerulean'
game 'gta5'

name 'ket_commands'
description 'Player commands: /id, /inventory, /myjob'
version '2.0.0'
node_version '22'

server_script 'dist/server.js'

dependencies { 'oxmysql', 'ket_core', 'ket_chat', 'ket_hud' }
