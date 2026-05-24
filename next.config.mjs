/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    webpack: (config) => {
        // Required: prevents pdfjs-dist from trying to load the canvas native module
        config.resolve.alias.canvas = false;
        // Required: prevents pdfjs from trying to resolve the 'fs' module in browser
        config.resolve.alias.fs = false;
        return config;
    },
};

export default nextConfig;
