/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empacota só o necessário para rodar — a imagem final fica em torno de
  // 150 MB em vez de arrastar node_modules inteiro para o Container Apps.
  output: "standalone",
  // O pg usa require dinâmico; deixar fora do bundle evita quebrar no build.
  serverExternalPackages: ["pg"],
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
