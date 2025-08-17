#!/bin/bash

# YC股票估值系统部署脚本
# 支持 Heroku 和 Vercel 部署

set -e  # 遇到错误立即退出

echo "🚀 YC股票估值系统部署脚本启动"
echo "=================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印彩色信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未找到，请先安装"
        exit 1
    fi
}

# 检查环境
print_info "检查部署环境..."
check_command "node"
check_command "npm"
check_command "git"

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "需要 Node.js 18 或更高版本，当前版本: $(node -v)"
    exit 1
fi
print_success "Node.js 版本检查通过: $(node -v)"

# 获取部署类型
DEPLOY_TYPE=""
while [[ ! "$DEPLOY_TYPE" =~ ^[1-3]$ ]]; do
    echo ""
    echo "请选择部署方式:"
    echo "1. Heroku"
    echo "2. Vercel"
    echo "3. 本地构建测试"
    read -p "输入选择 (1-3): " DEPLOY_TYPE
done

case $DEPLOY_TYPE in
    1)
        PLATFORM="heroku"
        ;;
    2)
        PLATFORM="vercel"
        ;;
    3)
        PLATFORM="local"
        ;;
esac

print_info "选择的部署平台: $PLATFORM"

# 检查 git 状态
if [ -n "$(git status --porcelain)" ]; then
    print_warning "检测到未提交的更改"
    read -p "是否继续部署？(y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        print_info "部署已取消"
        exit 0
    fi
fi

# 安装依赖
print_info "安装后端依赖..."
npm install --production=false

print_info "安装前端依赖..."
cd client && npm install && cd ..

# 运行测试
print_info "运行健康检查..."
if npm run test --silent 2>/dev/null; then
    print_success "健康检查通过"
else
    print_warning "未找到测试脚本，跳过测试"
fi

# 构建前端
print_info "构建前端应用..."
cd client && npm run build
if [ $? -eq 0 ]; then
    print_success "前端构建成功"
else
    print_error "前端构建失败"
    exit 1
fi
cd ..

# 根据平台执行不同的部署流程
case $PLATFORM in
    "heroku")
        print_info "开始 Heroku 部署..."
        
        # 检查 Heroku CLI
        check_command "heroku"
        
        # 检查是否登录
        if ! heroku whoami &> /dev/null; then
            print_error "请先登录 Heroku: heroku login"
            exit 1
        fi
        
        # 获取应用名称
        read -p "输入 Heroku 应用名称: " HEROKU_APP
        if [ -z "$HEROKU_APP" ]; then
            print_error "应用名称不能为空"
            exit 1
        fi
        
        # 检查应用是否存在
        if ! heroku apps:info $HEROKU_APP &> /dev/null; then
            print_info "创建新的 Heroku 应用: $HEROKU_APP"
            heroku create $HEROKU_APP
        fi
        
        # 设置环境变量
        print_info "设置环境变量..."
        heroku config:set NODE_ENV=production --app $HEROKU_APP
        
        # 可选的环境变量设置
        read -p "是否设置 Tushare Token? (y/N): " SET_TUSHARE
        if [[ "$SET_TUSHARE" =~ ^[Yy]$ ]]; then
            read -p "输入 Tushare Token: " TUSHARE_TOKEN
            heroku config:set TUSHARE_TOKEN=$TUSHARE_TOKEN --app $HEROKU_APP
        fi
        
        # 部署
        print_info "推送代码到 Heroku..."
        git add -A
        git commit -m "Deploy to Heroku $(date)" || true
        
        if git remote get-url heroku &> /dev/null; then
            git remote set-url heroku https://git.heroku.com/$HEROKU_APP.git
        else
            git remote add heroku https://git.heroku.com/$HEROKU_APP.git
        fi
        
        git push heroku main --force
        
        # 打开应用
        print_success "部署完成！"
        print_info "应用URL: https://$HEROKU_APP.herokuapp.com"
        read -p "是否打开应用？(y/N): " OPEN_APP
        if [[ "$OPEN_APP" =~ ^[Yy]$ ]]; then
            heroku open --app $HEROKU_APP
        fi
        ;;
        
    "vercel")
        print_info "开始 Vercel 部署..."
        
        # 检查 Vercel CLI
        if ! command -v vercel &> /dev/null; then
            print_info "安装 Vercel CLI..."
            npm install -g vercel
        fi
        
        # 登录检查
        if ! vercel whoami &> /dev/null; then
            print_info "请登录 Vercel..."
            vercel login
        fi
        
        # 部署
        print_info "部署到 Vercel..."
        vercel --prod
        
        print_success "Vercel 部署完成！"
        ;;
        
    "local")
        print_info "本地构建测试..."
        
        # 设置环境变量
        export NODE_ENV=production
        export PORT=5000
        
        # 启动服务器进行测试
        print_info "启动服务器测试..."
        timeout 10s npm start &
        SERVER_PID=$!
        
        sleep 5
        
        # 健康检查
        if curl -s http://localhost:5000/api/health > /dev/null; then
            print_success "本地服务器启动成功"
            print_info "可以访问 http://localhost:5000"
        else
            print_error "本地服务器启动失败"
        fi
        
        # 清理
        kill $SERVER_PID 2>/dev/null || true
        ;;
esac

# 清理临时文件
print_info "清理临时文件..."
rm -rf tmp/ || true

# 显示部署后的操作建议
echo ""
echo "=================================="
print_success "部署流程完成！"
echo ""
print_info "后续操作建议："
echo "1. 测试主要功能是否正常工作"
echo "2. 检查数据源连接状态"
echo "3. 监控应用性能和错误日志"
echo "4. 设置必要的环境变量"
echo ""
print_info "常用命令："
case $PLATFORM in
    "heroku")
        echo "查看日志: heroku logs --tail --app $HEROKU_APP"
        echo "重启应用: heroku restart --app $HEROKU_APP"
        echo "查看配置: heroku config --app $HEROKU_APP"
        ;;
    "vercel")
        echo "查看项目: vercel ls"
        echo "查看日志: vercel logs"
        echo "查看配置: vercel env ls"
        ;;
    "local")
        echo "启动开发: npm run dev"
        echo "查看日志: npm start 2>&1 | tee app.log"
        ;;
esac

echo ""
print_success "🎉 部署脚本执行完成！"