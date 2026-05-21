/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs (react-pdf) optionally requires Node 'canvas'; not needed in-browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
