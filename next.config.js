const { withStoreConfig } = require("./store-config")
const store = require("./store.config.json")

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = withStoreConfig({
  features: store.features,
  reactStrictMode: true,

  // experimental: {
  //   middlewareSourceMaps: true,
  //   middleware: {
  //     timeout: 60000, // Increase the timeout to 60 seconds (adjust as needed)
  //   },
  // },
  
  images: {
    
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "http",
        hostname: "192.168.0.104:8000",
        
      },
      {
        protocol: "https",
        hostname: "https://backend-stock-pjg4.onrender.com",
        
      },
      {
        protocol:"http",
        hostname:"res.cloudinary.com",  
        pathname:"/dxvvl4bpp/**",
      },
      {
        protocol:"https",
        hostname:"res.cloudinary.com",
        pathname:"/dxvvl4bpp/**",
      },
    ],
  },
})

console.log("next.config.js", JSON.stringify(module.exports, null, 2))

module.exports = nextConfig
