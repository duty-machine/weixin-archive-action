let fetchPage = require('./src/fetchPage')

;(async () => {
  console.log(await fetchPage(process.argv[2], {
    jpg: true,
    mht: true
  }))
})()
