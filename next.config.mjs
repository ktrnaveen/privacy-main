/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    webpack: (config, { isServer }) => {
        // Required for pdfjs-dist canvas stub
        config.resolve.alias.canvas = false;

        if (!isServer) {
            // Allow TypeScript web workers to be bundled correctly
            // This is needed for new Worker(new URL('...', import.meta.url))
            config.output = {
                ...config.output,
                globalObject: 'globalThis',
            };
        }

        return config;
    },
};

export default nextConfig;
