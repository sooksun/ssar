/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Serve ไฟล์อัปโหลดที่เขียนทีหลัง (Next standalone ไม่ serve ไฟล์ที่เพิ่มใน public ตอน runtime)
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: '/api/serve-upload/:path*' }];
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
