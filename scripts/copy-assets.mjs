import fs from 'fs';
import path from 'path';

const artifactDir = 'C:\\Users\\Hp Elitebook 1040 G6\\.gemini\\antigravity\\brain\\1cb382be-876c-4834-99a3-40308ecb43d4';
const targetDir = path.join(process.cwd(), 'public', 'images');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(artifactDir)) {
  const filesToCopy = [
    { src: 'logo_gratitude_v1_1793924327324.jpg', dest: 'logo_gratitude.jpg' },
    { src: '.user_uploaded\\media_1793973610759_0d746226.jpg', dest: 'monument_exact.jpg' },
    { src: 'dishes_grid_1_1793926539101.jpg', dest: 'dishes_grid_1.jpg' },
    { src: 'dishes_grid_2_1793926569444.jpg', dest: 'dishes_grid_2.jpg' },
    { src: 'dishes_grid_3_1793926600742.jpg', dest: 'dishes_grid_3.jpg' },
    { src: 'dishes_grid_4_1793926627467.jpg', dest: 'dishes_grid_4.jpg' }
  ];

  for (const item of filesToCopy) {
    const srcPath = path.join(artifactDir, item.src);
    const destPath = path.join(targetDir, item.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
