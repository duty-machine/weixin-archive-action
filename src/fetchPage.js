let puppeteer = require('puppeteer')
let fs = require('fs').promises

module.exports = async function fetchPage(url, options) {
  let key = +new Date()

  let browser = await puppeteer.launch({executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage']})
  let page = await browser.newPage()

  await page.setViewport({
    width: 414,
    height: 736,
    deviceScaleFactor: 3
  })

  await page.goto(url, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  })

  let clientHeight = await page.evaluate('document.body.clientHeight')

  await page.evaluate(() => {
    let promises = Array.from(document.querySelectorAll('.img_loading')).map(img => {
      let timeout = new Promise(resolve => {
        setTimeout(resolve, 9000)
      })
      let load = new Promise(resolve => {
        if (img.src == img.dataset.src) {
          resolve()
        } else {
          img.src = img.dataset.src
          img.classList.remove('img_loading')
          img.addEventListener('load', resolve)
        }
      })
      return Promise.race([timeout, load])
    })
    return Promise.all(promises)
  })

  await page.waitFor(1000)

  let title = await page.evaluate(() => document.querySelector('meta[property="og:title"]').content)

  if (options.png) {
    await page.screenshot({
      path: `${key}.png`,
      fullPage: true
    })
  }

  if (options.jpg) {
    await page.screenshot({
      path: `${key}.jpg`,
      fullPage: true,
      type: 'jpeg',
      quality: 87
    })
  }

  if (options.mht) {
    let client = await page.target().createCDPSession()
    let { data } = await client.send('Page.captureSnapshot')

    await fs.writeFile(`${key}.mht`, data)
  }

  if (options.pdf) {
    await page.pdf({
      path: `${key}.pdf`,
      width: '414px',
      height: '1000px'
    })
  }

  await browser.close()

  return {
    title,
    key
  }
}