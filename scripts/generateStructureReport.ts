// scripts/generateStructureReport.ts

import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'docs');
const mdPath = path.join(outputDir, 'structure-report.md');
const jsonPath = path.join(outputDir, 'structure-report.json');

const ignoredDirs = ['node_modules', '.git', '.vercel', 'dist', '.next'];
const ignoredExts = ['.lock', '.map', '.png', '.jpg', '.jpeg', '.webp'];

const result: any[] = [];

function walk(dir: string, base = '') {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const relPath = path.relative(process.cwd(), fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (ignoredDirs.includes(entry)) continue;
      walk(fullPath, path.join(base, entry));
    } else {
      const ext = path.extname(entry);
      if (ignoredExts.includes(ext)) continue;

      const preview = fs.readFileSync(fullPath, 'utf-8').split('\n').slice(0, 10).join('\n');

      result.push({
        name: entry,
        path: relPath,
        size: stat.size,
        preview: preview.trim()
      });
    }
  }
}

function generateMarkdownReport() {
  let md = `# 📁 Project Structure Report\n\n`;

  for (const file of result) {
    md += `## 📄 ${file.name}\n`;
    md += `**Path**: \`${file.path}\`  \n`;
    md += `**Size**: ${file.size} bytes\n`;
    md += `**Preview:**\n\n\`\`\`\n${file.preview}\n\`\`\`\n\n---\n`;
  }

  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
}

function main() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  walk(process.cwd());
  generateMarkdownReport();
  console.log(`✅ Structure report generated at:\n→ ${mdPath}\n→ ${jsonPath}`);
}

main();