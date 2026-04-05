import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@networth/types', '@networth/utils'],
  allowedDevOrigins: ['192.168.1.204'],
}

export default nextConfig
