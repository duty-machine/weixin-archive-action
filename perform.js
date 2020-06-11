let puppeteer = require('puppeteer')
let fs = require('fs').promises
let { Octokit } = require("@octokit/rest")

require('dotenv').config()

let TOKEN = process.env.TOKEN
let OWNER = process.env.OWNER
let REPO = process.env.REPO

let octokit = new Octokit({
  auth: TOKEN
})

async function performTasks() {
  let { data } = await octokit.issues.listForRepo({
    owner: OWNER,
    repo: REPO,
    state: 'open'
  })

  let promises = data.map(async (issue) => {
    if (issue.title == 'archive') {
      let {title, key} = await fetchPage(issue.body)
      await pushFiles(issue.number, title, key)
      await octokit.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        body: `https://github.com/${OWNER}/${REPO}/tree/master/${issue.number}`
      })
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed'
      })
    } else {
      await octokit.issues.update({
        owner: OWNER,
        repo: REPO,
        issue_number: issue.number,
        state: 'closed'
      })
    }
  })

  await Promise.all(promises)
}

async function fetchPage(url, opts) {
  let key = +new Date()

  let defaultOptions = {
    pdf: true,
    mht: true
  }

  let options = Object.assign(defaultOptions, opts)

  let browser = await puppeteer.launch()
  let page = await browser.newPage()

  await page.setViewport({
    width: 414,
    height: 736,
    deviceScaleFactor: 2
  })
  let {height} = await page.viewport()

  await page.goto(url, {
    waitUntil: 'domcontentloaded'
  })

  await page.evaluate(() => {
    let promises = Array.from(document.querySelectorAll('.img_loading')).map(img => {
      return new Promise(resolve => {
        img.src = img.dataset.src
        img.addEventListener('load', resolve)
      })
    })
    return Promise.all(promises)
  })

  let title = await page.evaluate(() => document.querySelector('meta[property="og:title"]').content)

  if (options.pdf) {
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

  await browser.close()

  return {
    title,
    key
  }
}

async function pushFiles(number, title, key) {
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: `${number}/${title}.png`,
    message: 'commit',
    content: await fs.readFile(`${key}.png`, {encoding: 'base64'}),
    committer: {
      name: 'none',
      email: 'none@none.com'
    },
    author: {
      name: 'none',
      email: 'none@none.com'
    }
  })
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: `${number}/${title}.mht`,
    message: 'commit',
    content: await fs.readFile(`${key}.mht`, {encoding: 'base64'}),
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

performTasks()
