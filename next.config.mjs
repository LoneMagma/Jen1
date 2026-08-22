/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Restricts which browser features iframes on your page can access.
          // - popup=()          → blocks the Popup API (window.open via new API)
          // - window-management=() → blocks multi-screen window placement
          // Does NOT block classic window.open() from iframe JS (that needs
          // sandbox), but removes the newer privileged popup mechanisms.
          {
            key: 'Permissions-Policy',
            value: [
              'popup=()',
              'window-management=()',
              'autoplay=(*)',
              'fullscreen=(*)',
              'picture-in-picture=(*)',
            ].join(', '),
          },
          // Prevents your page from being embedded in someone else's iframe
          // (protects against clickjacking on jen1 itself, unrelated to ads).
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
}

export default nextConfig
