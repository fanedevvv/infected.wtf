const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const targetUrl = 'https://discord-decoration.art/discord_avatar_decoration/';
const outputDir = path.join(__dirname, 'decorations');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Se citește pagina și se extrag linkurile...');

https.get(targetUrl, (res) => {
    let html = '';
    res.on('data', (chunk) => { html += chunk; });
    res.on('end', () => {
        // Extrage toate linkurile de imagini sau fișiere din HTML (src sau href)
        const matches = html.match(/(?:src|href)="([^"]+\.(?:png|webp|gif|svg))"/g) || [];
        const links = [...new Set(matches.map(m => {
            const quoteMatch = m.match(/"([^"]+)"/);
            return quoteMatch ? quoteMatch[1] : null;
        }).filter(Boolean))];

        console.log(`S-au găsit ${links.length} fișiere. Începe descărcarea...`);

        links.forEach((fileUrl, index) => {
            // Dacă e link relativ, îl transformăm în absolut
            let absoluteUrl = fileUrl;
            if (fileUrl.startsWith('/')) {
                const parsed = new URL(targetUrl);
                absoluteUrl = `${parsed.protocol}//${parsed.host}${fileUrl}`;
            } else if (!fileUrl.startsWith('http')) {
                absoluteUrl = `${targetUrl}/${fileUrl}`;
            }

            const ext = path.extname(absoluteUrl.split('?')[0]) || '.png';
            const fileName = `decoration_${index + 1}${ext}`;
            const filePath = path.join(outputDir, fileName);

            const client = absoluteUrl.startsWith('https') ? https : http;

            client.get(absoluteUrl, (fileRes) => {
                if (fileRes.statusCode === 200) {
                    const fileStream = fs.createWriteStream(filePath);
                    fileRes.pipe(fileStream);
                    fileStream.on('finish', () => {
                        fileStream.close();
                        console.log(`[+] Descărcat: ${fileName}`);
                    });
                }
            }).on('err', () => {});
        });
    });
}).on('error', (err) => {
    console.error('Eroare la conectare:', err.message);
});
