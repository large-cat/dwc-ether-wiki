# 部署到服务器 ubuntu@43.136.97.247

## 方法 A：Git 推送（推荐）

### 1. 本地克隆
```bash
git clone <你的GitHub仓库URL> dwc-ether-qos-qa
cd dwc-ether-qos-qa
```

### 2. 上传到服务器
```bash
# 打包本地项目
tar czf dwc-qos.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' .

# 上传到服务器
scp dwc-qos.tar.gz ubuntu@43.136.97.247:~/
```

### 3. 服务器部署
```bash
ssh ubuntu@43.136.97.247

# 解压
mkdir -p ~/dwc-ether-qos-qa
tar xzf ~/dwc-qos.tar.gz -C ~/dwc-ether-qos-qa

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 构建
cd ~/dwc-ether-qos-qa
npm install
npm run build

# 安装 Nginx
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/dwc-qos << 'EOF'
server {
    listen 80;
    server_name _;
    root /home/ubuntu/dwc-ether-qos-qa/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/dwc-qos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 完成！访问 http://43.136.97.247
```

## 方法 B：从 GitHub 直接拉取

```bash
ssh ubuntu@43.136.97.247

git clone https://github.com/你的用户名/dwc-ether-qos-qa.git
cd dwc-ether-qos-qa

# 然后同上：安装 Node.js → npm install → npm run build → Nginx
```

## 方法 C：使用 Docker（可选）

```bash
cd ~/dwc-ether-qos-qa

# 创建 Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EOF

docker build -t dwc-qos .
docker run -d -p 80:80 dwc-qos
```

## 知识引擎使用（服务器上）

```bash
ssh ubuntu@43.136.97.247
cd ~/dwc-ether-qos-qa

# 安装 Python 依赖
pip3 install PyPDF2

# 测试知识引擎
python3 tools/knowledge_growth.py stats
python3 tools/knowledge_growth.py ask "RGMII有什么特点"
```

## 文件说明

| 路径 | 说明 |
|------|------|
| `~/dwc-ether-qos-qa/` | 项目根目录 |
| `~/dwc-ether-qos-qa/dist/` | 前端构建产物（Nginx 服务此目录） |
| `~/dwc-ether-qos-qa/raw/` | PDF 源文档（不可变） |
| `~/dwc-ether-qos-qa/wiki/` | 知识树（懒加载，自动生长） |
| `~/dwc-ether-qos-qa/tools/` | 知识引擎 |
| `~/dwc-ether-qos-qa/CLAUDE.md` | Claude Code 指令 |
