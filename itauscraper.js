const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const mkdirp = require('mkdirp')
const path = require('path')
const uuid = require('uuid/v1')
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
  await page.waitFor(500)
  await page.click('#btnLoginSubmit')
  console.log('Opening password page...')

  // Input password
  await page.waitFor('div.modulo-login')
  console.log('Password page loaded.')
  const passwordKeys = await mapPasswordKeys(page)
  const keyClickOption = { delay: 300 }
  await page.waitFor(500)
  console.log('Filling account password...')
  for (const digit of options.password.toString()) {
    await passwordKeys[digit].click(keyClickOption)
  }
  console.log('Password has been filled...login...')
  await page.waitFor(500)
  page.click('#acessar', keyClickOption)
  await page.waitFor('#sectionHomePessoaFisica')
  console.log('Logged!')
}

const stepExport = async (page, options) => {
  console.log('Opening statement page...')
  // Go to extrato page
  await page.evaluate(() => { document.querySelector('.sub-mnu').style.display = 'block' })
  await page.waitFor(1000)
  await page.hover('#varejo > header > div > nav > ul > li > div > div > div:nth-child(1) > ul:nth-child(1) > li:nth-child(3) > a')
  await page.click('#varejo > header > div > nav > ul > li > div > div > div:nth-child(1) > ul:nth-child(1) > li:nth-child(3) > a')
  await page.waitForNavigation()
  console.log('Statement page loaded.')

  // Select frame
  const frame = page.frames().find(frame => frame.name() === 'CORPO')

  // Go to export page
  await frame.waitFor('a[title="Salvar em outros formatos"]')
  console.log('Opening export page...')
  await frame.click('a[title="Salvar em outros formatos"]')
  await frame.waitForNavigation()
  console.log('Export page loaded.')

  let searchDate = moment().subtract(options.days, 'days')
  searchDate = {
    year: searchDate.format('YYYY'),
    month: searchDate.format('MM'),
    day: searchDate.format('DD'),
    timestamp: moment().unix()
  }

  console.log('Filling export date period..: ', searchDate)
  // Fill export fields
  await frame.waitFor('#TRNcontainer01')
  await frame.type('#Dia', searchDate.day)
  await frame.type('#Mes', searchDate.month)
  await frame.type('#Ano', searchDate.year)
  console.log('Selecting export document type..: ' + options.file_format)
  await frame.click(getFileFormatSelector(options))

  const finalFilePath = path.resolve(
    options.download.path,
    eval('`' + options.download.filename + '`') // eslint-disable-line
  )

  console.log('Starting download...')
  const finalFilePathWithExtension = await download(frame, 'img[alt="Continuar"]', finalFilePath)
  console.log('Download has been finished.')
  console.log('Export document final path: ', finalFilePathWithExtension)
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
      const digits = text.split('ou').map(digit => digit.trim())
      keyMapped[digits[0]] = key
      keyMapped[digits[1]] = key
    }
  }

  return keyMapped
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const getFileFormatSelector = (options) => {
  return '.TRNinput[value=' + options.file_format.toUpperCase() + ']'
}

const download = async (page, selector, finalFilePath) => {
  const downloadPath = path.resolve(os.tmpdir(), 'download', uuid())
  mkdirp(downloadPath)
  console.log('Temporary downloading file to:', downloadPath)
  await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath })

  await page.click(selector)

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

module.exports = scraper
