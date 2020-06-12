let fetchPage = require('./src/fetchPage')

;(async () => {
  console.log(await fetchPage(process.argv[2], {
    jpg: true,
    pdf: true,
    mht: true
  }))
})()
