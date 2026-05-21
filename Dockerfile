FROM node:22-alpine

WORKDIR /app

# 安装 python3 和 pip，用于运行 knowledge_growth.py 工具
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages PyPDF2

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json package-lock.json ./
RUN npm ci

# 复制项目代码
COPY . .

# Vite 开发服务器端口
EXPOSE 3000

# 允许外部访问（Vite 默认只绑定 localhost）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]