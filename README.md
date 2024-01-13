# 项目来源
https://github.com/ordinaryA/Awesome-Game.git
# 我只保留了扫雷，我喜欢玩扫雷
### 有两个releases
- 一个是可以自动标记下一次所有雷，就不用自己苦哈哈的标记了！相对方便！
- 二一个是自动循环标记所有雷，直到没有雷可以标记！超方便！
# 这样感觉比其他扫雷用起来舒适多了。
### 我添加了自动点击的逻辑js代码和循环点击标记的js代码。但是现在的代码是循环点击标记代码，但是没有关系！！！我会把仅仅自动点击的package传到releases。
# 我真的不会写前端，呜呜呜呜~。我只会java。好心累呀！

# 使用方法
- 可以自己拉项目打包
- 可以直接下载releases里的package

如果使用nginx

``` nginx
server {
	listen       80;
	listen  [::]:80;
	server_name  localhost;
	charset utf-8;
	root /;
	location /normal {
	   root   /usr/share/nginx/html;
	   index  index.html index.htm;
	}

	location /easy {
	   root   /usr/share/nginx/html;
	   index  index.html index.htm;
	}
	error_page   500 502 503 504  /50x.html;
	location = /50x.html {
	   root   /usr/share/nginx/html/normal;
	}
}
```
