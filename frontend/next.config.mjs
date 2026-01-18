/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  // Workspace root (one level up) to ensure output file tracing uses the repo root
  outputFileTracingRoot: path.join(__dirname, '..'),
  // Standalone output for Docker (optimized production build)
  output: 'standalone',
};

export default nextConfig;
