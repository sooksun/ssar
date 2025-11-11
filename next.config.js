/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb', // เพิ่ม limit เพื่อรองรับวิดีโอขนาด 1000MB
    },
    // เพิ่ม middlewareClientMaxBodySize เพื่อรองรับไฟล์ขนาดใหญ่ใน middleware
    middlewareClientMaxBodySize: '1000mb',
  },
};

module.exports = nextConfig;

