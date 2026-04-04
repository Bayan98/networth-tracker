import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@networth/types', '@networth/utils'],
}

export default nextConfig
