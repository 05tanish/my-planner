import esbuild from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

async function build() {
  const outdir = 'dist';
  
  // Clean dist directory
  await fs.remove(outdir);
  await fs.ensureDir(outdir);
  
  console.log('Bundling with esbuild...');
  await esbuild.build({
    entryPoints: [
      'src/background/service-worker.ts',
      'src/content/content.ts',
      'src/popup/popup.ts'
    ],
    bundle: true,
    outdir: path.join(outdir, 'src'),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: false,
    minify: false,
  });

  console.log('Copying static assets...');
  
  // Copy manifest.json
  await fs.copy('manifest.json', path.join(outdir, 'manifest.json'));
  
  // Copy popup html/css
  await fs.ensureDir(path.join(outdir, 'src/popup'));
  await fs.copy('src/popup/popup.html', path.join(outdir, 'src/popup/popup.html'));
  if (await fs.pathExists('src/popup/popup.css')) {
    await fs.copy('src/popup/popup.css', path.join(outdir, 'src/popup/popup.css'));
  }
  
  // Copy assets folder if it exists
  if (await fs.pathExists('assets')) {
    await fs.copy('assets', path.join(outdir, 'assets'));
  }

  console.log('Build complete! Load the "dist" folder as your unpacked extension.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
