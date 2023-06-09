const dotenv = require('dotenv');

dotenv.config();

let state = {};

state[process.env.HTX_USER_INFO] = {};
state[process.env.PP_BROWSER] = null;

module.exports = state;