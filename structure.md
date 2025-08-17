yc-stock-valuation/
├── 📁 后端核心文件
│   ├── server.js                    # Express服务器入口
│   ├── package.json                 # 后端依赖配置
│   └── routes/
│       ├── stockData.js            # 股票数据API (Yahoo Finance)
│       └── valuation.js            # 估值计算API
│
├── 📁 前端应用
│   └── client/
│       ├── package.json            # 前端依赖
│       ├── public/index.html       # HTML模板
│       └── src/
│           ├── index.js            # React入口
│           ├── App.js             # 主应用组件
│           ├── App.css            # 应用样式
│           ├── index.css          # 全局样式
│           └── components/
│               └── StockValuationApp.js  # 核心估值组件
│
├── 📁 部署配置
│   ├── Procfile                    # Heroku部署
│   ├── vercel.json                 # Vercel部署
│   ├── Dockerfile                  # Docker容器化
│   ├── docker-compose.yml          # Docker编排
│   └── .github/workflows/deploy.yml # CI/CD流水线
│
├── 📁 脚本和文档
│   ├── scripts/deploy.sh           # 自动化部署脚本
│   ├── README.md                   # 详细说明文档
│   ├── LICENSE                     # MIT开源协议
│   ├── .env.example               # 环境变量示例
│   └── .gitignore                 # Git忽略配置