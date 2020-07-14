### 这是什么？

这是一个用于将微信文章保存为jpg和mht格式的github action。配置了此action的仓库，在新建issue的时候会触发抓取，最终文章的备份文件会被commit回仓库中。

抓取的样例可见：https://github.com/duty-machine/weixin-archive-action-demo/issues/1

### 如何配置？

1. 新建一个代码仓库，这个仓库将用来存放抓取到的文件，可以是私有仓库。
2. 在`Actions`标签页里Setup一个workflow，选择Simple workflow或者任意一个都可以。
3. 将编辑器里的内容替换成 https://github.com/duty-machine/weixin-archive-action/blob/master/samples/dockerfile_workflow.yml 的内容，然后保存。

### 如何使用？

在代码仓库中新建一个issue，在标题或正文中写入要抓取的微信文章链接，提交即可触发抓取。一般需要数分钟，抓取的过程可以在`Actions`标签页下看到。

### samples文件夹里的两个workflow有什么不同？

dockerhub_workflow会直接下载我预先推送到dockerhub上的镜像，所以可以跳过构建过程，会稍微快一点。dockerfile_workflow则是使用从Dockerfile开始构建的action。
