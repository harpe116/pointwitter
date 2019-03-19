const fs = require('fs');

const path = './.env';

try {
  if (!fs.existsSync(path)) {
    fs.copyFile('.env.example', '.env', (err) => {
      if (err) console.error(err);
      console.log("No .env file found. I've autogenerated one for you from the example.");
    });
  }
} catch (err) {
  console.error(err);
}