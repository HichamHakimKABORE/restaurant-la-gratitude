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

// Synchronise automatiquement les fichiers manquants dans le dossier de sauvegarde Windows
// sans écraser les fichiers déjà sauvegardés avant la modification, et sans copier les secrets (.env*).
if (process.platform === 'win32') {
  try {
    const backupRoot = 'h:\\Appli\\Restaurant_Sauvegarde_Commandes';
    const projectRoot = process.cwd();
    const skipDirs = new Set(['node_modules', '.next', '.git']);

    function isSensitiveFile(name) {
      return name.startsWith('.env') || name.endsWith('.pem') || name.endsWith('.key');
    }

    function copyMissingRecursive(srcDir, destDir) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        if (skipDirs.has(entry.name)) continue;
        if (!entry.isDirectory() && isSensitiveFile(entry.name)) continue;
        const srcFull = path.join(srcDir, entry.name);
        const destFull = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
          copyMissingRecursive(srcFull, destFull);
        } else if (!fs.existsSync(destFull)) {
          fs.copyFileSync(srcFull, destFull);
        }
      }
    }

    copyMissingRecursive(projectRoot, backupRoot);
  } catch (err) {
    // Ignore backup errors
  }
}
