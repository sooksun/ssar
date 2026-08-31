/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Serve ไฟล์อัปโหลดที่เขียนทีหลัง (Next standalone ไม่ serve ไฟล์ที่เพิ่มใน public ตอน runtime)
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: '/api/serve-upload/:path*' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // ปิดสิทธิ์อุปกรณ์ที่ระบบไม่ได้ใช้
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // HSTS — NPM เป็นตัว terminate TLS ให้ (เปิดหลัง HTTPS นิ่งแล้วตาม checklist)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb', // เพิ่ม limit เพื่อรองรับวิดีโอขนาด 1000MB
    },
    // เพิ่ม middlewareClientMaxBodySize เพื่อรองรับไฟล์ขนาดใหญ่ใน middleware
    middlewareClientMaxBodySize: '1000mb',
  },
};

module.exports = nextConfig;
