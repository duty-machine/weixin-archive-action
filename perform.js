let puppeteer = require('puppeteer')
let fs = require('fs').promises
let { Octokit } = require("@octokit/rest")
let fetchPage = require('./src/fetchPage')

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
    pdf: false,
    jpg: true
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

async function pushFiles(number, title, key, options) {
  async function commitFile(type) {
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: `${number}/${title.replace(/\//g, '-')}.${type}`,
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

  if (options.jpg) {
    await commitFile('jpg')
  }

}

performTasks()

