/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许 Vercel 部署 + 本地 dev
  reactStrictMode: true,
  // API routes 默认就是 serverless,无需特殊配置
};

module.exports = nextConfig;