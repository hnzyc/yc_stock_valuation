import React, { useState, useEffect } from 'react';
import { 
  Calculator, TrendingUp, AlertCircle, CheckCircle, XCircle, 
  BarChart3, DollarSign, Settings, Download, Database, 
  Edit3, Key, Activity, FileText, Layers, Clock, 
  ChevronDown, Search, Loader
} from 'lucide-react';

const StockValuationApp = () => {
  // 状态管理
  const [selectedStock, setSelectedStock] = useState('');
  const [dataSource, setDataSource] = useState('auto'); // 'auto', 'manual', 'tushare'
  const [tushareToken, setTushareToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [valuationParams, setValuationParams] = useState({
    growthRate: 0.1,
    reasonablePE: 20,
    safetyMargin: 0.5,
    highLeverageThreshold: 0.7
  });
  const [manualData, setManualData] = useState({
    netIncome: '',
    totalShares: '',
    operatingCashFlow: '',
    totalAssets: '',
    interestBearingDebt: '',
    capex: '',
    depreciation: '',
    currentPrice: ''
  });
  const [stockData, setStockData] = useState(null);
  const [valuationResult, setValuationResult] = useState(null);
  const [activeTab, setActiveTab] = useState('input'); // 'input', 'data', 'calculation', 'result'
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // 通知系统
  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // 加载股票列表
  useEffect(() => {
    const loadStockList = async () => {
      try {
        const response = await fetch('/api/stock/list');
        if (response.ok) {
          const data = await response.json();
          setStockList(data.data || []);
        } else {
          throw new Error('获取股票列表失败');
        }
      } catch (error) {
        console.error('获取股票列表失败:', error);
        // 使用默认股票列表
        setStockList([
          { code: 'AAPL', market: 'US', name: '苹果公司', category: '科技' },
          { code: 'MSFT', market: 'US', name: '微软', category: '科技' },
          { code: 'GOOGL', market: 'US', name: '谷歌', category: '科技' },
          { code: 'TSLA', market: 'US', name: '特斯拉', category: '汽车' },
          { code: 'NVDA', market: 'US', name: '英伟达', category: '科技' },
          { code: 'MSTR', market: 'US', name: '微策略', category: '软件' },
          { code: '00700', market: 'HK', name: '腾讯控股', category: '互联网' },
          { code: '600519', market: 'CN', name: '贵州茅台', category: '白酒' },
          { code: '002415', market: 'CN', name: '分众传媒', category: '广告' }
        ]);
      }
    };
    loadStockList();
  }, []);

  // 处理股票选择
  const handleStockSelect = async (stockCode, market) => {
    if (!stockCode) return;
    
    setSelectedStock(stockCode);
    setStockData(null);
    setValuationResult(null);
    setActiveTab('input');
    
    if (dataSource === 'auto') {
      setLoading(true);
      try {
        const response = await fetch(`/api/stock/financials/${stockCode}?market=${market}`);
        if (!response.ok) {
          throw new Error('获取股票数据失败');
        }
        const data = await response.json();
        setStockData(data);
        showNotification(`成功获取 ${data.companyName} 的数据`, 'success');
        setActiveTab('data');
      } catch (error) {
        console.error('获取股票数据失败:', error);
        showNotification(error.message, 'error');
        setDataSource('manual'); // 切换到手动输入模式
      } finally {
        setLoading(false);
      }
    }
  };

  // 处理手动数据转换
  const convertManualData = () => {
    const selectedStockInfo = stockList.find(s => s.code === selectedStock);
    
    return {
      symbol: selectedStock,
      companyName: selectedStockInfo?.name || selectedStock,
      currentPrice: parseFloat(manualData.currentPrice) || 0,
      currency: selectedStock.startsWith('00') ? 'HKD' : 
                selectedStock.match(/^[0-9]+$/) ? 'CNY' : 'USD',
      dataSource: '手动输入',
      dataQuality: 'manual',
      netIncome: parseFloat(manualData.netIncome) || 0,
      totalShares: parseFloat(manualData.totalShares) || 0,
      sharesOutstanding: parseFloat(manualData.totalShares) || 0,
      operatingCashFlow: parseFloat(manualData.operatingCashFlow) || 0,
      totalAssets: parseFloat(manualData.totalAssets) || 0,
      interestBearingDebt: parseFloat(manualData.interestBearingDebt) || 0,
      capex: parseFloat(manualData.capex) || 0,
      depreciation: parseFloat(manualData.depreciation) || 0,
      lastUpdate: new Date().toISOString()
    };
  };

  // 执行估值分析
  const handleAnalyze = async () => {
    if (!selectedStock) {
      showNotification('请选择股票', 'error');
      return;
    }

    let financialDataToUse;

    if (dataSource === 'manual') {
      // 验证手动输入的必填字段
      const requiredFields = ['netIncome', 'totalShares', 'operatingCashFlow', 'totalAssets', 'currentPrice'];
      const missingFields = requiredFields.filter(field => !manualData[field]?.trim());
      
      if (missingFields.length > 0) {
        showNotification(`请填写必要字段：${missingFields.join(', ')}`, 'error');
        return;
      }
      
      financialDataToUse = convertManualData();
      setStockData(financialDataToUse);
      setActiveTab('data');
    } else {
      if (!stockData) {
        showNotification('请先获取股票数据', 'error');
        return;
      }
      financialDataToUse = stockData;
    }

    // 执行估值计算
    setLoading(true);
    try {
      const response = await fetch('/api/valuation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialData: financialDataToUse,
          parameters: valuationParams
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '估值计算失败');
      }
      
      const result = await response.json();
      setValuationResult(result);
      showNotification('估值计算完成！', 'success');
      setActiveTab('result');
    } catch (error) {
      console.error('估值计算失败:', error);
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 导出结果
  const exportResults = () => {
    if (!valuationResult || !stockData) return;
    
    const exportData = {
      基本信息: {
        股票代码: selectedStock,
        公司名称: stockData.companyName,
        数据来源: stockData.dataSource,
        分析时间: valuationResult.calculationTime
      },
      估值结果: {
        投资建议: valuationResult.recommendation,
        当前价格: valuationResult.currentPrice,
        建议买入价: valuationResult.buyPrice,
        目标卖出价: valuationResult.sellPrice,
        上涨空间: `${valuationResult.upside.toFixed(1)}%`
      },
      参数设置: valuationResult.parameters,
      计算步骤: valuationResult.calculationSteps,
      财务数据: stockData
    };
    
    console.log('估值分析结果:', exportData);
    showNotification('估值结果已导出到控制台', 'success');
  };

  // 数字格式化
  const formatNumber = (num) => {
    if (!num) return '0';
    if (Math.abs(num) >= 1e9) {
      return (num / 1e9).toFixed(1) + '亿';
    } else if (Math.abs(num) >= 1e8) {
      return (num / 1e8).toFixed(1) + '亿';
    } else if (Math.abs(num) >= 1e4) {
      return (num / 1e4).toFixed(1) + '万';
    }
    return num.toFixed(2);
  };

  const formatCurrency = (num, currency = 'CNY') => {
    const symbols = { USD: '$', HKD: 'HK$', CNY: '¥' };
    return (symbols[currency] || '¥') + (num || 0).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 通知系统 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all transform translate-x-0 ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Calculator className="text-blue-600" size={48} />
            YC专业股票估值系统
          </h1>
          <p className="text-gray-600 text-lg">基于真实财务数据的价值投资决策平台</p>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'input', label: '参数输入', icon: Settings },
              { key: 'data', label: '数据展示', icon: Database },
              { key: 'calculation', label: '计算过程', icon: Activity },
              { key: 'result', label: '估值结果', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 参数输入标签页 */}
            {activeTab === 'input' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* 股票选择 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">选择股票</h3>
                    <select
                      value={selectedStock}
                      onChange={(e) => {
                        const stock = stockList.find(s => s.code === e.target.value);
                        handleStockSelect(e.target.value, stock?.market);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择股票...</option>
                      {stockList.map(stock => (
                        <option key={stock.code} value={stock.code}>
                          {stock.code} - {stock.name} ({stock.market})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 数据源选择 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">数据来源</h3>
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="auto"
                            checked={dataSource === 'auto'}
                            onChange={(e) => setDataSource(e.target.value)}
                            className="text-blue-600"
                          />
                          <Database className="w-4 h-4 text-gray-600" />
                          自动获取（Yahoo Finance）
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="manual"
                            checked={dataSource === 'manual'}
                            onChange={(e) => setDataSource(e.target.value)}
                            className="text-blue-600"
                          />
                          <Edit3 className="w-4 h-4 text-gray-600" />
                          手动输入
                        </label>
                      </div>

                      {dataSource === 'tushare' && (
                        <div className="border-t pt-3">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setShowTokenInput(!showTokenInput)}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <Key className="w-4 h-4" />
                              {showTokenInput ? '隐藏' : '设置'} Tushare Token
                            </button>
                          </div>
                          {showTokenInput && (
                            <div className="mt-3">
                              <input
                                type="password"
                                value={tushareToken}
                                onChange={(e) => setTushareToken(e.target.value)}
                                placeholder="请输入您的Tushare Pro Token"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 手动数据输入 */}
                  {dataSource === 'manual' && selectedStock && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">财务数据输入</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'netIncome', label: '净利润（元）*', placeholder: '如：599720000000' },
                          { key: 'totalShares', label: '总股数*', placeholder: '如：1256000000' },
                          { key: 'operatingCashFlow', label: '经营现金流（元）*', placeholder: '如：650000000000' },
                          { key: 'totalAssets', label: '总资产（元）*', placeholder: '如：2500000000000' },
                          { key: 'interestBearingDebt', label: '有息负债（元）', placeholder: '如：50000000000' },
                          { key: 'capex', label: '资本开支（元）', placeholder: '如：80000000000' },
                          { key: 'depreciation', label: '折旧摊销（元）', placeholder: '如：120000000000' },
                          { key: 'currentPrice', label: '当前股价*', placeholder: '如：1650.8' }
                        ].map(field => (
                          <div key={field.key}>
                            <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                            <input
                              type="number"
                              value={manualData[field.key]}
                              onChange={(e) => setManualData({...manualData, [field.key]: e.target.value})}
                              placeholder={field.placeholder}
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-500">* 为必填项</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* 估值参数 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">估值参数</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          预期年增长率 (%)
                        </label>
                        <input
                          type="number"
                          value={valuationParams.growthRate * 100}
                          onChange={(e) => setValuationParams({...valuationParams, growthRate: e.target.value / 100})}
                          step="0.5"
                          min="-50"
                          max="100"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          合理PE倍数
                        </label>
                        <input
                          type="number"
                          value={valuationParams.reasonablePE}
                          onChange={(e) => setValuationParams({...valuationParams, reasonablePE: Number(e.target.value)})}
                          step="1"
                          min="5"
                          max="50"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          安全边际 (%)
                        </label>
                        <input
                          type="number"
                          value={valuationParams.safetyMargin * 100}
                          onChange={(e) => setValuationParams({...valuationParams, safetyMargin: e.target.value / 100})}
                          step="5"
                          min="10"
                          max="80"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* 快速预设 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-2">PE预设</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[15, 20, 25].map(pe => (
                              <button
                                key={pe}
                                onClick={() => setValuationParams({...valuationParams, reasonablePE: pe})}
                                className="p-1 text-xs border rounded hover:bg-blue-50"
                              >
                                {pe}x
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-600 mb-2">增长率预设</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[5, 10, 15].map(growth => (
                              <button
                                key={growth}
                                onClick={() => setValuationParams({...valuationParams, growthRate: growth / 100})}
                                className="p-1 text-xs border rounded hover:bg-green-50"
                              >
                                {growth}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 分析按钮 */}
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={24} />
                        计算中...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={24} />
                        开始分析
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 数据展示标签页 */}
            {activeTab === 'data' && stockData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {stockData.companyName} ({stockData.symbol})
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} />
                    数据来源: {stockData.dataSource}
                    <span className="ml-2">更新时间: {new Date(stockData.lastUpdate).toLocaleDateString()}</span>
                  </div>
                </div>

                {stockData.dataProcess && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">数据获取过程</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {Object.entries(stockData.dataProcess).map(([key, status]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="font-medium capitalize">{key}:</span>
                          <span className={status.startsWith('✅') ? 'text-green-600' : 'text-red-600'}>
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 基本信息 */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>当前股价:</span>
                        <span className="font-medium">{formatCurrency(stockData.currentPrice, stockData.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>总股数:</span>
                        <span className="font-medium">{formatNumber(stockData.totalShares || stockData.sharesOutstanding)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>市值:</span>
                        <span className="font-medium">
                          {formatNumber(stockData.currentPrice * (stockData.totalShares || stockData.sharesOutstanding))}
                        </span>
                      </div>
                      {stockData.valuation && (
                        <>
                          {stockData.valuation.trailingPE && (
                            <div className="flex justify-between">
                              <span>当前PE(TTM):</span>
                              <span className="font-medium">{stockData.valuation.trailingPE.toFixed(1)}倍</span>
                            </div>
                          )}
                          {stockData.valuation.priceToBook && (
                            <div className="flex justify-between">
                              <span>当前PB:</span>
                              <span className="font-medium">{stockData.valuation.priceToBook.toFixed(1)}倍</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 财务数据 */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">核心财务数据</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>净利润:</span>
                        <span className="font-medium">{formatNumber(stockData.netIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>经营现金流:</span>
                        <span className="font-medium">{formatNumber(stockData.operatingCashFlow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>总资产:</span>
                        <span className="font-medium">{formatNumber(stockData.totalAssets)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>有息负债:</span>
                        <span className="font-medium">{formatNumber(stockData.interestBearingDebt)}</span>
                      </div>
                      {stockData.capex && (
                        <div className="flex justify-between">
                          <span>资本开支:</span>
                          <span className="font-medium">{formatNumber(stockData.capex)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-3">
                        <span>杠杆率:</span>
                        <span className="font-medium">
                          {((stockData.interestBearingDebt / stockData.totalAssets) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 计算过程标签页 */}
            {activeTab === 'calculation' && valuationResult?.calculationSteps && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">估值计算过程</h2>
                
                {valuationResult.calculationSteps.map((step, index) => (
                  <div key={index} className="bg-white rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                        {step.step}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">{step.title}</h3>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    
                    {step.inputs && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">输入数据</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {Object.entries(step.inputs).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span>{key}:</span>
                              <span className="font-mono">
                                {typeof value === 'number' ? formatNumber(value) : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.formula && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">计算公式</h4>
                        <div className="text-sm text-blue-800 font-mono">
                          {Array.isArray(step.formula) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {step.formula.map((formula, i) => (
                                <li key={i}>{formula}</li>
                              ))}
                            </ul>
                          ) : (
                            step.formula
                          )}
                        </div>
                      </div>
                    )}
                    
                    {step.calculation && (
                      <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">计算过程</h4>
                        <div className="text-sm">
                          {typeof step.calculation === 'object' ? (
                            <div className="space-y-2">
                              {Object.entries(step.calculation).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key}:</span>
                                  <span className="font-mono text-gray-700">{value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="font-mono text-gray-700">{step.calculation}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">计算结果</h4>
                      <div className="text-sm">
                        {typeof step.result === 'object' ? (
                          <div className="space-y-2">
                            {Object.entries(step.result).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key}:</span>
                                <span className="font-semibold text-green-700">{value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="font-semibold text-green-700">{step.result}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 估值结果标签页 */}
            {activeTab === 'result' && valuationResult && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {stockData?.companyName} ({stockData?.symbol}) - 估值结果
                  </h2>
                  <button
                    onClick={exportResults}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    导出分析
                  </button>
                </div>

                {/* 投资建议核心卡片 */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`px-6 py-3 rounded-full ${
                        valuationResult.recommendationColor === 'green' ? 'bg-green-100 text-green-700' :
                        valuationResult.recommendationColor === 'red' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        <span className="font-bold text-2xl">
                          {valuationResult.recommendation}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {valuationResult.recommendationReason}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(valuationResult.currentPrice, valuationResult.currency)}
                      </div>
                      <div className="text-sm text-gray-600">当前价格</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(valuationResult.buyPrice, valuationResult.currency)}
                      </div>
                      <div className="text-sm text-gray-600">建议买入价</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(valuationResult.sellPrice, valuationResult.currency)}
                      </div>
                      <div className="text-sm text-gray-600">目标卖出价</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className={`text-2xl font-bold ${
                        valuationResult.upside > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {valuationResult.upside.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">距买入价</div>
                    </div>
                  </div>

                  {/* 风险警示 */}
                  {valuationResult.riskFactors?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="text-yellow-600" size={20} />
                        <span className="font-medium text-yellow-800">风险提示</span>
                      </div>
                      <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                        {valuationResult.riskFactors.map((risk, index) => (
                          <li key={index}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 前提验证和财务数据 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">前提验证</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {valuationResult.verification?.profitIsReal ? (
                            <CheckCircle className="text-green-500" size={20} />
                          ) : (
                            <XCircle className="text-red-500" size={20} />
                          )}
                          <span className="text-sm font-medium">利润为真</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          现金流/净利润: {valuationResult.verification?.profitIsReal ? '≥80%' : '<80%'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {valuationResult.verification?.lowCapitalConsumption ? (
                            <CheckCircle className="text-green-500" size={20} />
                          ) : (
                            <XCircle className="text-red-500" size={20} />
                          )}
                          <span className="text-sm font-medium">低资本消耗</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          资本开支适中
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {!valuationResult.isHighLeverage ? (
                            <CheckCircle className="text-green-500" size={20} />
                          ) : (
                            <AlertCircle className="text-yellow-500" size={20} />
                          )}
                          <span className="text-sm font-medium">杠杆率控制</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          {((valuationResult.verification?.leverageRatio || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 利润预测 */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      未来利润预测 (基于{(valuationResult.parameters?.growthRate * 100).toFixed(1)}%增长)
                    </h3>
                    <div className="space-y-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-600">
                          {formatNumber(stockData?.netIncome)}
                        </div>
                        <div className="text-xs text-gray-600">当前净利润</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-bold text-blue-600">
                            {formatNumber(valuationResult.futureEarnings?.year1)}
                          </div>
                          <div className="text-xs text-gray-600">第一年</div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <div className="text-sm font-bold text-indigo-600">
                            {formatNumber(valuationResult.futureEarnings?.year2)}
                          </div>
                          <div className="text-xs text-gray-600">第二年</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-sm font-bold text-purple-600">
                            {formatNumber(valuationResult.futureEarnings?.year3)}
                          </div>
                          <div className="text-xs text-gray-600">第三年</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 估值参数总结 */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">估值参数总结</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-600">
                        {(valuationResult.parameters?.growthRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-gray-600">预期增长率</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-600">
                        {valuationResult.adjustedPE?.toFixed(1)}倍
                      </div>
                      <div className="text-gray-600">调整后PE</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="font-semibold text-purple-600">
                        {(valuationResult.parameters?.safetyMargin * 100).toFixed(0)}%
                      </div>
                      <div className="text-gray-600">安全边际</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="font-semibold text-orange-600">
                        {valuationResult.riskLevel}
                      </div>
                      <div className="text-gray-600">风险等级</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 空状态 */}
            {activeTab === 'data' && !stockData && (
              <div className="text-center py-12">
                <Database className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无股票数据</h3>
                <p className="text-gray-500">请先选择股票并获取数据</p>
              </div>
            )}

            {activeTab === 'calculation' && !valuationResult && (
              <div className="text-center py-12">
                <Activity className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无计算过程</h3>
                <p className="text-gray-500">请先完成估值分析</p>
              </div>
            )}

            {activeTab === 'result' && !valuationResult && (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无估值结果</h3>
                <p className="text-gray-500">请先完成估值分析</p>
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Database size={16} />
                数据来源
              </h4>
              <ul className="text-gray-600 space-y-1 list-disc list-inside">
                <li>自动获取：Yahoo Finance API</li>
                <li>手动输入：年报/季报数据</li>
                <li>数据实时性：Yahoo Finance数据延迟15-20分钟</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calculator size={16} />
                估值方法
              </h4>
              <ul className="text-gray-600 space-y-1 list-disc list-inside">
                <li>基于DCF和PE双重估值</li>
                <li>50%安全边际保护</li>
                <li>高杠杆企业PE折价处理</li>
                <li>三年利润增长预测</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertCircle size={16} />
                风险提示
              </h4>
              <ul className="text-gray-600 space-y-1 list-disc list-inside">
                <li>估值仅供参考，不构成投资建议</li>
                <li>请结合多种分析方法</li>
                <li>注意市场情绪和宏观环境</li>
                <li>控制投资风险和仓位</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockValuationApp;