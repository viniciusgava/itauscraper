const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const path = require('path');
const uuid = require('uuid/v1');
const moment = require('moment');
const os = require('os');

const stepLogin = async (page, options) => {
    // Open homepage and fill account info
    console.log('Opening bank homepage...');
    console.debug('Itaú url:', options.itau.url);
    await page.goto(options.itau.url);
    console.log('Homepage loaded.');
    await page.type('#agencia', options.branch);
    await page.type('#conta', options.account);
    console.log('Account and branch number has been filled.');
    await page.waitFor(500);
    await page.click('#btnLoginSubmit');
    console.log('Opening password page...');

    // Input password
    await page.waitFor('div.modulo-login');
    console.log('Password page loaded.');
    let passwordKeys = await mapPasswordKeys(page);
    let keyClickOption = {delay: 300};
    await page.waitFor(500);
    console.log('Filling account password...');
    for (const digit of options.password.toString()) {
        await passwordKeys[digit].click(keyClickOption);
    }
    console.log('Password has been filled...login...');
    await page.waitFor(500);
    page.click('#acessar', keyClickOption);
    await page.waitFor('#sectionHomePessoaFisica');
    console.log('Logged!');
};

const stepExportOfx = async (page, options) => {
    console.log('Opening statement page...');
    // Go to extrato page
    await page.waitFor('a[title="ver extrato"]');
    await page.click('a[title="ver extrato"]');
    await page.waitForNavigation();
    console.log('Statement page loaded.');

    // Select frame
    const frame = page.frames().find(frame => frame.name() === 'CORPO');

    // Go to ofx export page
    await frame.waitFor('a[title="Salvar em outros formatos"]');
    console.log('Opening export page...');
    await frame.click('a[title="Salvar em outros formatos"]');
    await frame.waitForNavigation();
    console.log('Export page loaded.');


    let searchDate = moment().subtract(options.days, 'days');
    searchDate = {
        year: searchDate.format('YYYY'),
        month: searchDate.format('MM'),
        day: searchDate.format('DD'),
    };

    console.log('Filling export date period..: ', searchDate);
    // Fill export fields
    await frame.waitFor('#TRNcontainer01');
    await frame.type('#Dia', searchDate.day);
    await frame.type('#Mes', searchDate.month);
    await frame.type('#Ano', searchDate.year);
    console.log('Selecting export document type..: OFX');
    await frame.click('.TRNinput[value=OFX]');

    const finalFilePath = path.resolve(
        options.download.path,
        eval('`'+options.download.filename+'`')
    );

    console.log('Export document final path: ', finalFilePath);

    console.log('Starting download...');
    await download(frame, 'img[alt="Continuar"]', finalFilePath);
    console.log('Download has been finished.');
};

const stepClosePossiblePopup = async(page) => {
    await page.waitForSelector('div.mfp-wrap', {timeout: 4000})
        .then(() => page.evaluate(() => popFechar()))
        .catch(() => {});
};

const mapPasswordKeys = async (page) => {
    let keys = await page.$$('.teclas .tecla');
    let keyMapped = {};

    for (const key of keys) {
        let text = await page.evaluate(element => element.textContent,  key);
        if (text.includes('ou')) {
            let digits = text.split('ou').map(digit => digit.trim());
            keyMapped[digits[0]] = key;
            keyMapped[digits[1]] = key;
        }
    }

    return keyMapped;
};

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const download = async (page, selector, finalFilePath) => {
    const downloadPath = path.resolve(os.tmpdir(), 'download', uuid());
    mkdirp(downloadPath);
    console.log('Temporary downloading file to:', downloadPath);
    await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

    await page.click(selector);

    const filename = await waitForFileToDownload(downloadPath);
    const tempFilePath = path.resolve(downloadPath, filename);

    console.log('Moving file to final path.');
    await fs.moveSync(tempFilePath, finalFilePath);
};

const waitForFileToDownload = async (downloadPath) => {
    console.log('Waiting to download file...');
    let filename;
    while (!filename || filename.endsWith('.crdownload')) {
        filename = fs.readdirSync(downloadPath)[0];
        await sleep(500);
    }
    return filename;
};

const scraper = async (options) => {
    console.log('Starting Itaú scraper...');
    console.log('Account Branch Number:', options.branch);
    console.log('Account number:', options.branch);
    console.log('Transaction log days:', options.days);

    console.debug('Puppeter - options', options.puppeteer);
    const browser = await puppeteer.launch(options.puppeteer);

    const page = await browser.newPage();
    console.debug('Viewport - options', options.viewport);
    page.setViewport(options.viewport);

    await stepLogin(page, options);
    await stepClosePossiblePopup(page);
    await stepExportOfx(page, options);

    await browser.close();

    console.log('Itaú scraper finished.');
};

module.exports = scraper;
