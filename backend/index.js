require('dotenv').config({ path: '.env.local' });
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Backend running on http://localhost:${port}`);
});
