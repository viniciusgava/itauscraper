const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const mkdirp = require('mkdirp')
const path = require('path')
const { v4: uuid } = require('uuid')
const moment = require('moment')
const os = require('os')

const stepLogin = async (page, options) => {
  // Open homepage and fill account info
  console.log('Opening bank homepage...')
  console.debug('Itaú url:', options.itau.url)
  await page.goto(options.itau.url)
  console.log('Homepage loaded.')
  await page.type('#agencia', options.branch)
  await page.type('#conta', options.account)
  console.log('Account and branch number has been filled.')
  await page.waitForTimeout(500)
  await page.click('.login_button')

  if(!!options.name){
    console.log('Opening account holder page...');
    await page.waitForTimeout(2000)
    await stepAwaitRegularLoading(page)
    await page.waitForSelector('ul.selecao-nome-titular', { visible: true })
    console.log('Account holder page loaded.')

    const names = await page.$$('ul.selecao-nome-titular a[role="button"]');
    for (const name of names) {
      const text = await page.evaluate(element => element.textContent, name);
      if(text.toUpperCase() == options.name.toUpperCase()){
        name.click();
        console.log('Account holder selected.')
      }
    }
  }

  console.log('Opening password page...')
  await page.waitForTimeout(2000)
  await stepAwaitRegularLoading(page)
  await page.waitForSelector('div.modulo-login', { visible: true })
  console.log('Password page loaded.')

  // Input password
  const passwordKeys = await mapPasswordKeys(page)
  await page.waitForTimeout(500)

  console.log('Filling account password...')
  for (const digit of options.password.toString()) {
    await page.evaluate((selector) => {
      document.querySelector(selector).click()
    }, passwordKeys[digit])
    await page.waitForTimeout(300)
  }

  console.log('Password has been filled...login...')
  await page.waitForTimeout(1000)
  page.click('#acessar', { delay: 300 })
  await page.waitForSelector('#sectionHomePessoaFisica')
  console.log('Logged!')
}

const stepExport = async (page, options) => {
  console.log('Opening statement page...')
  // Go to statement page
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'block' })
  await page.waitForTimeout(1000)

  await page.evaluate(() => {
    const xpath = '//a[contains(., \'saldo e extrato\')]'
    const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null) // eslint-disable-line
    result.iterateNext().click()
  })
  console.log('Statement page loaded.')

  // Close guide
  await stepCloseStatementGuide(page)
  console.log('Statement has been closed')

  // Close menu
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'none' })
  await page.waitForTimeout(1000)
  console.log('Menu has been closed')

  // Select period of days
  await page.select('cpv-select[model=\'pc.periodoSelecionado\'] select', options.days.toString())
  console.log('Selected period of days on the filters')
  await stepAwaitRegularLoading(page)

  // Sort by most  recent transactions first
  await page.select('cpv-select[model=\'app.ordenacao\'] select', 'maisRecente')
  console.log('Sorted by most recent transactions first')
  await stepAwaitRegularLoading(page)

  // configure Download Trigger
  let triggerDownload = (fileFormat) => { exportarExtratoArquivo('formExportarExtrato', fileFormat) }// eslint-disable-line
  if (options.file_format === 'pdf') {
    triggerDownload = (fileFormat) => { exportarArquivoLancamentoImprimirPdf('pdf') } // eslint-disable-line
  }

  const finalFilePath = path.resolve(
    options.download.path,
    options.download.filename.interpolate({
      days: options.days,
      timestamp: moment().unix()
    })
  )

  console.log('Starting download...')
  const finalFilePathWithExtension = await download(page, triggerDownload, finalFilePath, options)
  console.log('Download has been finished.')
  console.log('Export document final path: ', finalFilePathWithExtension)
}

const stepAwaitRegularLoading = async (page) => {
  await page.waitForSelector('div.loading-nova-internet', { visible: true, timeout: 3000 })
  await page.waitForSelector('div.loading-nova-internet', { hidden: true })
}

const stepCloseStatementGuide = async (page) => {
  await page.waitForSelector('.feature-discovery-extrato button.hopscotch-cta', { timeout: 4000 })
    .then(() => page.click('.feature-discovery-extrato button.hopscotch-cta')) // eslint-disable-line
    .catch(() => {})
}

const stepClosePossiblePopup = async (page) => {
  await page.waitForSelector('div.mfp-wrap', { timeout: 4000 })
    .then(() => page.evaluate(() => popFechar())) // eslint-disable-line
    .catch(() => {})
}

const mapPasswordKeys = async (page) => {
  const keys = await page.$$('.teclas .tecla')
  const keyMapped = {}

  for (const key of keys) {
    const text = await page.evaluate(element => element.textContent, key)
    if (text.includes('ou')) {
      const rel = await page.evaluate(element => element.getAttribute('rel'), key)
      const selectorToClick = `a[rel="${rel}"]`
      const digits = text.split('ou').map(digit => digit.trim())
      keyMapped[digits[0]] = selectorToClick
      keyMapped[digits[1]] = selectorToClick
    }
  }

  return keyMapped
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const download = async (page, triggerDownload, finalFilePath, options) => {
  const downloadPath = path.resolve(os.tmpdir(), 'download', uuid())
  mkdirp(downloadPath)
  console.log('Temporary downloading file to:', downloadPath)
  await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath })

  await page.evaluate(triggerDownload, options.file_format)

  const filename = await waitForFileToDownload(downloadPath)
  const tempFilePath = path.resolve(downloadPath, filename)
  const extension = path.extname(tempFilePath)

  finalFilePath += extension

  console.log('Moving file to final path.')
  await fs.moveSync(tempFilePath, finalFilePath)

  return finalFilePath
}

const waitForFileToDownload = async (downloadPath) => {
  console.log('Waiting to download file...')
  let filename
  while (!filename || filename.endsWith('.crdownload')) {
    filename = fs.readdirSync(downloadPath)[0]
    await sleep(500)
  }
  return filename
}

const scraper = async (options) => {
  console.log('Starting Itaú scraper...')
  console.log('Account Branch Number:', options.branch)
  console.log('Account number:', options.account)
  console.log('Transaction log days:', options.days)
  console.log('File Format:', options.file_format)

  console.debug('Puppeter - options', options.puppeteer)
  const browser = await puppeteer.launch(options.puppeteer)

  const page = await browser.newPage()
  console.debug('Viewport - options', options.viewport)
  page.setViewport(options.viewport)

  await stepLogin(page, options)
  await stepClosePossiblePopup(page)
  await stepExport(page, options)

  await browser.close()

  console.log('Itaú scraper finished.')
}

/* eslint-disable */
String.prototype.interpolate = function (params) {
  const names = Object.keys(params)
  const vals = Object.values(params)
  return new Function(...names, `return \`${this}\`;`)(...vals)
}
/* eslint-enable */

module.exports = scraper
