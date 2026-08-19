export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: 'https://watchlist-saham.vercel.app/sitemap.xml',
  }
}
