# YC专业股票估值系统

基于真实财务数据的价值投资决策平台，支持美股、港股、A股的自动化估值分析。

## 🌟 主要功能

### 📊 多数据源支持
- **Yahoo Finance API**: 自动获取美股、港股实时数据
- **Tushare Pro**: 支持A股数据获取（需要Token）
- **手动输入**: 支持年报数据手动录入

### 🧮 专业估值分析
- **DCF + PE双重估值**: 基于现金流和市盈率的综合估值
- **安全边际保护**: 默认50%安全边际
- **风险调整**: 高杠杆企业PE自动折价
- **三年预测**: 基于增长率的未来利润预测

### 📈 详细计算过程
- **透明化计算**: 展示每一步计算过程和公式
- **数据验证**: 利润质量、资本消耗、杠杆率检查
- **风险提示**: 自动识别潜在风险因素

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 本地开发

1. **克隆项目**
```bash
git clone <your-repo-url>
cd yc-stock-valuation
```

2. **安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client && npm install && cd ..
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. **启动开发环境**
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run server    # 后端服务 (端口5000)
npm run client    # 前端服务 (端口3000)
```

5. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:5000/api
- 健康检查: http://localhost:5000/api/health

## 📦 部署

### Heroku部署

1. **创建Heroku应用**
```bash
heroku create your-app-name
```

2. **设置环境变量**
```bash
heroku config:set NODE_ENV=production
heroku config:set TUSHARE_TOKEN=your_token_here
```

3. **部署**
```bash
git push heroku main
```

### Vercel部署

1. **安装Vercel CLI**
```bash
npm i -g vercel
```

2. **部署**
```bash
vercel --prod
```

### 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | 是 |
| `PORT` | 服务端口 | 否 |
| `TUSHARE_TOKEN` | Tushare Pro Token | 否 |
| `CORS_ORIGIN` | 跨域配置 | 否 |

## 🏗️ 项目结构

```
yc-stock-valuation/
├── server.js                 # 后端入口文件
├── routes/
│   ├── stockData.js         # 股票数据API
│   └── valuation.js         # 估值计算API
├── client/                  # React前端
│   ├── src/
│   │   ├── App.js          # 主应用
│   │   └── components/
│   │       └── StockValuationApp.js
│   └── package.json
├── package.json             # 后端依赖
├── Procfile                 # Heroku配置
├── vercel.json             # Vercel配置
└── README.md
```

## 🔧 API文档

### 股票数据API

#### 获取股票报价
```http
GET /api/stock/quote/{symbol}?market={market}
```

#### 获取财务数据
```http
GET /api/stock/financials/{symbol}?market={market}
```

#### 获取股票列表
```http
GET /api/stock/list
```

### 估值计算API

#### 计算估值
```http
POST /api/valuation/calculate
Content-Type: application/json

{
  "financialData": {
    "symbol": "AAPL",
    "netIncome": 100000000000,
    "totalShares": 16000000000,
    "currentPrice": 150.00,
    // ... 其他财务数据
  },
  "parameters": {
    "growthRate": 0.1,
    "reasonablePE": 20,
    "safetyMargin": 0.5
  }
}
```

#### 获取估值预设
```http
GET /api/valuation/presets
```

## 💡 使用指南

### 1. 选择股票
- 从预设列表选择热门股票
- 支持美股、港股、A股代码格式

### 2. 配置数据源
- **自动获取**: 推荐用于美股和港股
- **手动输入**: 适用于需要精确控制数据的场景

### 3. 设置估值参数
- **预期增长率**: 基于公司历史和行业前景
- **合理PE倍数**: 参考行业平均水平
- **安全边际**: 保守投资者建议50%以上

### 4. 分析结果
- **买入价**: 基于50%安全边际的建议价格
- **卖出价**: 保守的目标价格
- **风险提示**: 关注财务质量问题

## ⚠️ 重要声明

本系统提供的估值分析仅供参考，不构成投资建议。投资者应该：

- 结合多种分析方法
- 考虑市场情绪和宏观环境
- 控制投资风险和仓位
- 寻求专业投资顾问建议

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 👨‍💻 作者

**Davy Zhao (YC)**
- 专注价值投资和金融科技创新

---

⭐ 如果这个项目对您有帮助，请给个Star！
- 广东粤财信托

---

⭐ 如果这个项目对您有帮助，请给个Star！