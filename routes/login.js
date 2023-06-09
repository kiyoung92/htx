const router = require('express').Router();
const pp = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Kp = require('../certificate/common.js');
const state = require('../state/state.js');

router.get('/', async (req, res) => {
    let publicCertPath = path.join(state.SET_INFO.PUBLIC_CERT_PATH, state.SET_INFO.PUBLIC_CERT_FILE_NAME);
    let privateCertPath = path.join(state.SET_INFO.PRIVATE_CERT_PATH, state.SET_INFO.PRIVATE_CERT_FILE_NAME);
    let publicCert = fs.readFileSync(publicCertPath, { encoding: 'base64' });
    let publicCertInfo = new crypto.X509Certificate(fs.readFileSync(publicCertPath));
    let publicCertSN = publicCertInfo.serialNumber.toLocaleLowerCase();
    let nowDate = new Date();
    let hashDate = `${nowDate.getFullYear()}${nowDate.getMonth() + 1 < 10 ? '0' + (nowDate.getMonth() + 1) : nowDate.getMonth() + 1}${nowDate.getDate() < 10 ? '0' + nowDate.getDate() : nowDate.getDate()}${nowDate.getHours() < 10 ? '0' + nowDate.getHours() : nowDate.getHours()}${nowDate.getMinutes() < 10 ? '0' + nowDate.getMinutes() : nowDate.getMinutes()}${nowDate.getSeconds() < 10 ? '0' + nowDate.getSeconds() : nowDate.getSeconds()}`
    let pem = `-----BEGIN CERTIFICATE-----\n${publicCert.match(new RegExp('.{1,64}', 'g')).join('\n')}\n-----END CERTIFICATE-----`;
    let privateCertInfo = new Kp(fs.readFileSync(publicCertPath), fs.readFileSync(privateCertPath), state.SET_INFO.CERTIFICATE_PASSWORD);
    let randomValue = Buffer.from(privateCertInfo.privateCertificate.random.valueBlock.valueHex, 'utf8').toString('base64');
    // state.SET_INFO = {
    //     BROWSER_PATH: '',           // puppeteer에 사용할 브라우저 경로
    //     PUBLIC_CERT_PATH: '',       // 공동인증서 .der 파일 경로
    //     PRIVATE_CERT_PATH: '',      // 공동인증서 .key 파일 경로
    //     PUBLIC_CERT_FILE_NAME: '',  // 공동인증서 .der 파일 이름
    //     PRIVATE_CERT_FILE_NAME: '', // 공동인증서 .key 파일 이름
    //     CERTIFICATE_PASSWORD: '',   // 공동인증서 비밀번호
    //     PUPPETEER_HEADLESS: '',     // puppeteer headless ('new' or true or false)
    // }

    const bs = await pp.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        defaultViewport: {
            width: 1000,
            height: 1000,
        },
        headless: false,
    });

    const htxPg = await bs.newPage();

    await htxPg.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index.xml');

    await htxPg.waitForSelector('a[class="w2group ico_wa"]');
})