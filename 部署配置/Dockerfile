# YC股票估值系统 - Docker配置
# 多阶段构建优化镜像大小

# 第一阶段：构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端依赖文件
COPY client/package*.json ./

# 安装前端依赖
RUN npm ci --only=production && npm cache clean --force

# 复制前端源代码
COPY client/ ./

# 构建前端应用
RUN npm run build

# 第二阶段：构建后端和最终镜像
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# 复制后端依赖文件
COPY package*.json ./

# 安装后端依赖
RUN npm ci --only=production && npm cache clean --force

# 创建必要的目录
RUN mkdir -p routes client/build

# 复制后端源代码
COPY server.js ./
COPY routes/ ./routes/

# 从前端构建阶段复制构建结果
COPY --from=frontend-builder /app/client/build ./client/build

# 设置文件所有者
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# 构建标签和元数据
LABEL maintainer="Davy Zhao (YC) <email@example.com>"
LABEL version="1.0.0"
LABEL description="YC专业股票估值系统"
LABEL org.opencontainers.image.title="YC Stock Valuation System"
LABEL org.opencontainers.image.description="Professional stock valuation platform based on real financial data"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="YC Financial Technology"
LABEL org.opencontainers.image.licenses="MIT"