import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@networth/types', '@networth/utils'],
  allowedDevOrigins: [
    'localhost',
    '*.localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '10.*.*.*',
    '172.*.*.*',
    '192.168.*.*',
    '169.254.*.*',
  ],
}

export default nextConfig
