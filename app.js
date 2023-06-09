const app = require('express')();
const dotenv = require('dotenv');
const login = require('./routes/login.js');

dotenv.config();

app.use('/login', login);

app.listen(process.env.PORT, () => {
    console.log('SERVER START');
});