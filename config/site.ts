export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Checkout Smharty",

  description:
    "Checkout Smharty is a cutting-edge checkout solution designed to revolutionize the online shopping experience. With its seamless integration and user-friendly interface, it empowers businesses to provide a secure and efficient checkout process for their customers. By leveraging advanced technologies, Checkout Smharty streamlines transactions, reduces cart abandonment rates, and enhances overall customer satisfaction. Whether you're a small business or a large enterprise, Checkout Smharty is the ultimate tool to optimize your e-commerce operations and drive sales growth.",

  pagesPaths: {},

  colors: {
    primary: "#0B3371",
    bgPrimaryVariant: "bg-[#0B34710D]",
  },

  baseUrl: process.env.LARAVEL_API_URL || "http://localhost:8000",
  baseAppUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
