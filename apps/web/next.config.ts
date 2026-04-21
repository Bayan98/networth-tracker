import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@networth/types', '@networth/utils'],
  allowedDevOrigins: ['*'],
}

module.exports = {
  allowedDevOrigins: ['192.168.1.138'],
}

export default nextConfig
