# weixin-archive-action

将微信文章保存为pdf和mht格式的github action，抓取之后会将文件提交到github仓库。

抓取样例见：https://github.com/duty-machine/weixin-archive-action-demo/issues/1

# 使用指南

新建一个代码仓库，可以是私有仓库，在`Actions`标签页里新建一个workflow，然后填入 https://github.com/duty-machine/weixin-archive-action/blob/master/samples/dockerhub_workflow.yml 的内容，保存。

在这个代码仓库新建一个issue，在标题或正文中写入要抓取的微信文章链接，提交之后会触发抓取，在`Actions`标签页也可以看到执行情况。

由于每个github仓库有1gb的大小限制，建议自行建立仓库使用。

samples文件夹里的有两个workflow，其中dockerhub_workflow会快一点，因为是直接从dockerhub上下载构建好的镜像，另一个则是从dockerfile开始构建。
