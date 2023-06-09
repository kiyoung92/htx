const router = require('express').Router();
const pp = require('puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const keyPair = require('../certificate/common.js');
const state = require('../state/state.js');

router.get('/login', async (req, res) => {
    let publicCertPath = path.join(state.SET_INFO.PUBLIC_CERT_PATH, state.SET_INFO.PUBLIC_CERT_FILE_NAME);
    let privateCertPath = path.join(state.SET_INFO.PRIVATE_CERT_PATH, state.SET_INFO.PRIVATE_CERT_FILE_NAME);
    let publicCert = fs.readFileSync(publicCertPath, { encoding: 'base64' });
    let publicCertInfo = new crypto.X509Certificate(fs.readFileSync(publicCertPath));
    let publicCertSN = publicCertInfo.serialNumber.toLocaleLowerCase();
    let nowDate = new Date();
    let hashDate = `${nowDate.getFullYear()}${nowDate.getMonth() + 1 < 10 ? '0' + (nowDate.getMonth() + 1) : nowDate.getMonth() + 1}${nowDate.getDate() < 10 ? '0' + nowDate.getDate() : nowDate.getDate()}${nowDate.getHours() < 10 ? '0' + nowDate.getHours() : nowDate.getHours()}${nowDate.getMinutes() < 10 ? '0' + nowDate.getMinutes() : nowDate.getMinutes()}${nowDate.getSeconds() < 10 ? '0' + nowDate.getSeconds() : nowDate.getSeconds()}`;
    let pem = `-----BEGIN CERTIFICATE-----\n${publicCert.match(new RegExp('.{1,64}', 'g')).join('\n')}\n-----END CERTIFICATE-----`;
    let privateCertInfo = new keyPair(fs.readFileSync(publicCertPath), fs.readFileSync(privateCertPath), state.SET_INFO.CERTIFICATE_PASSWORD);
    let randomValue = Buffer.from(privateCertInfo.privateCertificate.random.valueBlock.valueHex, 'utf8').toString('base64');

    const bs = await pp.launch({
        executablePath: state.SET_INFO.BROWSER_PATH,
        defaultViewport: {
            width: 1000,
            height: 1000,
        },
        headless: state.SET_INFO.PUPPETEER_HEADLESS,
    });

    const htxPg = await bs.newPage();

    await htxPg.goto('https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index.xml');

    await htxPg.waitForSelector('a[class="w2group ico_wa"]');

    const htxSession = await htxPg.evaluate(async () => {
        const response = await fetch('/wqAction.do?actionId=ATXPPZXA001R01&screenId=UTXPPABA01', {method: 'POST'}).then(res => {
            console.log(res.headers.get('Cookie'))
            return res.text();
        }).then(data => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(data, 'text/html');
            const cookies = document.cookie.split(';').map(item => item.split('=')[1]);

            return { 'SSN': dom.documentElement.querySelector('pkcEncSsn').innerHTML, 'WMONID': cookies[0], 'TXPPsessionID': cookies[1] };
        });

        return response;
    });

    const bufferSSN = Buffer.from(htxSession.SSN);
    const digitalSign = crypto.sign('RSA-SHA256', bufferSSN, privateCertInfo.privateCertificate.decryptedNativePrivateKey);
    const signature = digitalSign.toString('base64');
    const logSgnt = Buffer.from(`${htxSession.SSN}$${publicCertSN}$${hashDate}$${signature}`, 'utf8').toString('base64');

    await delay(100);

    const htxLoginResult = await htxPg.evaluate(async data => {
        const params = { cert: data.cert, logSgnt: data.logSgnt, pkcLgnClCd: '04', pkcLoginYnImpv: 'Y', randomEnc: data.randomValue, WMONID: data.WMONID, NTS_LOGIN_SYSTEM_CODE_P: 'TXPP', TXPPsessionID: data.TXPPsessionID };
        const htxLogin = await fetch(`/pubcLogin.do?domain=hometax.go.kr&mainSys=Y&${new URLSearchParams(params)}`, { method: 'POST' }).then(res => {
            return res.text();
        }).then(data => {
            let trimData = decodeURIComponent(data).replace(/\s/g,'').replace(/'/g, '"');
            let sliceStr = trimData.slice(trimData.indexOf('{'), trimData.indexOf('"err')) + trimData.slice(trimData.indexOf('n"),"lgn') + 4, trimData.indexOf('}') + 1);
            return JSON.parse(sliceStr);
        });
        return htxLogin;
    }, { 'cert': pem, 'logSgnt': logSgnt, 'randomValue': randomValue, 'WMONID': htxSession.WMONID, 'TXPPsessionID': htxSession.TXPPsessionID });

    if (htxLoginResult.lgnRsltCd === '01') {
        await $log('로그인 성공');
        let userInfo = await getUserInfo();
        res.send(userInfo);
    } else if (htxLoginResult.lgnRsltCd === '03') {
        await $log('회원가입 후 이용해주세요.');
        res.send(htxLoginResult);
    }
    async function getUserInfo() {
        let getHtxUserInfo = await htxPg.evaluate(async () => {
            const getUserInfo = await fetch('/permission.do?screenId=index').then(res => {
                return res.text();
            }).then(data => {
                let xml = new DOMParser();
                let parser = xml.parseFromString(data, 'text/html');
    
                return parser;
            });
    
            let loginUserInfo = { 'USER_NM': getUserInfo.querySelector('usernm').innerHTML, 'USER_BIRTH': getUserInfo.querySelector('bmanofbdt').innerHTML, 'USER_PUB_NM': getUserInfo.querySelector('pubcuserno').innerHTML, 'USER_TIN': getUserInfo.querySelector('tin').innerHTML };
    
            return loginUserInfo;
        });

        return getHtxUserInfo;
    };
    function delay(time) {
        return new Promise((rs) => setTimeout(rs, time));
    }
    async function $log(str) {
        console.log(str);
    }
});

module.exports = router;