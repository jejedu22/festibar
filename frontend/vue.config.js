module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Adresse du backend Node.js
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  }
};