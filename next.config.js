/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: https://images.unsplash.com https://*.unsplash.com https://www.quickks.in https://quickks.in https://www.google-analytics.com https://www.googletagmanager.com",
              "connect-src 'self' https://api.quickks.in https://www.quickks.in https://quickks.in https://checkout.razorpay.com https://*.razorpay.com https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com",
              "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self' https://api.quickks.in",
              "object-src 'none'",
              "media-src 'self'",
              "worker-src 'self' blob:",
            ].join('; ')
          }
        ]
      },
      { source: '/sitemap.xml', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }] },
      { source: '/robots.txt', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }] }
    ]
  }
}
module.exports = nextConfig
