import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: '/lead-radar-medical-aesthetics',
        assetPrefix: '/lead-radar-medical-aesthetics',
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
