let puppeteer = require('puppeteer')
let fs = require('fs').promises
let { Octokit } = require("@octokit/rest")

require('dotenv').config()

let TOKEN = process.env.TOKEN
let REPOSITORY = process.env.REPOSITORY
let [OWNER, REPO] = REPOSITORY.split('/')

let octokit = new Octokit({
  auth: TOKEN
})

async function performTasks() {
  let { data } = await octokit.issues.listForRepo({
    owner: OWNER,
    repo: REPO,
    state: 'open'
  })

  let options = {
    png: false,
    mht: true,
    pdf: true
  }

  let promises = data.map(async (issue) => {
    try {
      let {title, key} = await fetchPage(issue.body || issue.title, options)
      await pushFiles(issue.number, title, key, options)
      await octokit.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        body: `已保存于：https://github.com/${OWNER}/${REPO}/tree/master/${issue.number}`
      })
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed',
        title: '已保存'
      })
    } catch(error) {
      await octokit.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        body: `错误 ${error.toString()}`
      })
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed',
        title: '错误'
      })
      throw error
    }
  })

  await Promise.all(promises)
}

async function fetchPage(url, options) {
  let key = +new Date()

  let browser = await puppeteer.launch({args: ['--no-sandbox']})
  let page = await browser.newPage()

  await page.setViewport({
    width: 414,
    height: 736,
    deviceScaleFactor: 2
  })
  let {height} = await page.viewport()

  await page.goto(url, {
    waitUntil: ['domcontentloaded', 'networkidle2']
  })

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

  if (options.mht) {
    let client = await page.target().createCDPSession()
    let { data } = await client.send('Page.captureSnapshot')

    await fs.writeFile(`${key}.mht`, data)
  }

  if (options.pdf) {
    await page.pdf({
      path: `${key}.pdf`,
      width: '414px',
      height: '2000px'
    })
  }

  await browser.close()

  return {
    title,
    key
  }
}

async function pushFiles(number, title, key, options) {
  async function commitFile(type) {
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: `${number}/${title}.${type}`,
      message: 'commit',
      content: await fs.readFile(`${key}.${type}`, {encoding: 'base64'}),
      committer: {
        name: 'none',
        email: 'none@none.com'
      },
      author: {
        name: 'none',
        email: 'none@none.com'
      }
    })
  }

  if (options.png) {
    await commitFile('png')
  }

  if (options.mht) {
    await commitFile('mht')
  }

  if (options.pdf) {
    await commitFile('pdf')
  }

}

performTasks()

