import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@networth/types', '@networth/utils'],
  allowedDevOrigins: ['192.168.1.204', '192.168.1.117'],
}

export default nextConfig
