const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Pune aici URL-ul paginii sau endpoint-ul de unde poți lua linkurile, 
// sau un array direct cu linkurile către fișiere dacă le poți obține.
const targetUrl = 'https://discord-decoration.art/discord_avatar_decoration'; // sau URL-ul exact

// Alternativ, dacă ai deja o listă de linkuri, le poți pune direct într-un array:
// const urls = ['https://...', 'https://...'];

console.log('Scriptul rulează... Asigură-te că ai adăugat linkurile corecte.');
