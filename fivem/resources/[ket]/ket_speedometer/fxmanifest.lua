fx_version 'cerulean'
game 'gta5'

name 'ket_speedometer'
description 'Vehicle speedometer: speed, RPM, gear, fuel and engine health (/speedo)'
version '2.0.0'
-- Design and original script by Ved (https://github.com/vedrion/ved-speedometer, MIT, see LICENSE).
-- Ported to TypeScript for this server.

ui_page 'dist/web/index.html'
files { 'dist/web/**' }

client_script 'dist/client.js'

dependency 'ket_core'
