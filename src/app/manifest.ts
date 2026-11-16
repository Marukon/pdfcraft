/**
 * Web App Manifest Generation
 * Configures PWA settings for the application
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
 */

import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

// Required for static export
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: 'PDFCraft',
    description: siteConfig.description,
    lang: 'zh-CN',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/home.png',
        sizes: '1280x720',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: '合并 PDF',
        short_name: '合并',
        description: '合并多个 PDF 文件',
        url: '/zh/tools/merge-pdf',
        icons: [{ src: '/icons/merge.png', sizes: '96x96' }],
      },
      {
        name: '拆分 PDF',
        short_name: '拆分',
        description: '将 PDF 拆分为多个文件',
        url: '/zh/tools/split-pdf',
        icons: [{ src: '/icons/split.png', sizes: '96x96' }],
      },
      {
        name: '压缩 PDF',
        short_name: '压缩',
        description: '缩小 PDF 文件体积',
        url: '/zh/tools/compress-pdf',
        icons: [{ src: '/icons/compress.png', sizes: '96x96' }],
      },
    ],
  };
}
