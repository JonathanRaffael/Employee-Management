/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // OK kalau internal app
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}

export default nextConfig
