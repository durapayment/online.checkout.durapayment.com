/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "durapayment-documents.s3.eu-north-1.amazonaws.com",
      },
    ],
  },
};

module.exports = nextConfig;
