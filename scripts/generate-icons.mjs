// Script one-shot pour générer les icônes PNG de la PWA
// Exécuter une seule fois : node scripts/generate-icons.mjs
//
// Nécessite : npm install --save-dev sharp
// (sharp est une dep de dev, pas incluse dans le bundle de prod)

import sharp from "sharp";
import { writeFileSync } from "fs";

const SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#18181b"/>
  <text
    x="50%"
    y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="system-ui, sans-serif"
    font-weight="700"
    font-size="${size * 0.38}"
    fill="#ffffff"
    letter-spacing="-1"
  >M</text>
</svg>
`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(SVG(size)))
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`✓ icon-${size}.png généré`);
}
