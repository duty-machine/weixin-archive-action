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

  let options = {
    png: false,
    mht: true,
    pdf: true
  }

  let promises = data.map(async (issue) => {
    if (issue.title == 'archive') {
      let {title, key} = await fetchPage(issue.body, options)
      await pushFiles(issue.number, title, key, options)
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
      return new Promise(resolve => {
        img.src = img.dataset.src
        img.addEventListener('load', resolve)
      })
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
