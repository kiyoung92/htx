const app = require('express')();
const dotenv = require('dotenv');
const login = require('./routes/login.js');
const state = require('./state/state.js');

dotenv.config();

// TODO
state.SET_INFO = {
    BROWSER_PATH: '',           // puppeteer에 사용할 브라우저 경로
    PUBLIC_CERT_PATH: '',       // 공동인증서 .der 파일 경로
    PRIVATE_CERT_PATH: '',      // 공동인증서 .key 파일 경로
    PUBLIC_CERT_FILE_NAME: '',  // 공동인증서 .der 파일 이름
    PRIVATE_CERT_FILE_NAME: '', // 공동인증서 .key 파일 이름
    CERTIFICATE_PASSWORD: '',   // 공동인증서 비밀번호
    PUPPETEER_HEADLESS: '',     // puppeteer headless ('new' or true or false)
}

app.use('/login', login);

app.listen(process.env.PORT, () => {
    console.log('SERVER START');
});