const express = require('express');
const axios = require('axios');
const yahooFinance = require('yahooFinance2').default;
const router = express.Router();

// 股票代码映射和转换
const getYahooSymbol = (code, market) => {
  const codeUpper = code.toUpperCase();
  
  // 美股直接使用
  if (market === 'US' || ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'MSTR'].includes(codeUpper)) {
    return codeUpper;
  }
  
  // 港股处理
  if (market === 'HK' || code.startsWith('00')) {
    // 移除前导零并加上.HK后缀
    const numericCode = parseInt(code, 10).toString();
    return `${numericCode.padStart(4, '0')}.HK`;
  }
  
  // A股处理
  if (market === 'CN' || code.match(/^[036]\d{5}$/)) {
    if (code.startsWith('00') || code.startsWith('30')) {
      return `${code}.SZ`; // 深圳
    } else if (code.startsWith('60')) {
      return `${code}.SS`; // 上海
    }
  }
  
  return code;
};

// 获取股票基本信息和实时价格
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'auto' } = req.query;
    
    console.log(`📊 获取股票报价: ${symbol} (市场: ${market})`);
    
    const yahooSymbol = getYahooSymbol(symbol, market);
    
    // 获取实时报价
    const quote = await yahooFinance.quote(yahooSymbol);
    
    const result = {
      symbol: symbol,
      yahooSymbol: yahooSymbol,
      companyName: quote.displayName || quote.shortName || quote.longName || symbol,
      currentPrice: quote.regularMarketPrice || quote.price || 0,
      currency: quote.currency || 'USD',
      market: quote.market || market,
      marketCap: quote.marketCap || 0,
      sharesOutstanding: quote.sharesOutstanding || 0,
      lastUpdate: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      dataSource: 'Yahoo Finance',
      rawData: {
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        sharesOutstanding: quote.sharesOutstanding,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        priceToBook: quote.priceToBook,
        pegRatio: quote.pegRatio,
        dividendYield: quote.dividendYield
      }
    };
    
    console.log(`✅ 成功获取 ${symbol} 报价数据`);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ 获取股票报价失败 ${req.params.symbol}:`, error.message);
    res.status(500).json({
      error: '获取股票报价失败',
      message: error.message,
      symbol: req.params.symbol,
      suggestion: '请检查股票代码是否正确，或稍后重试'
    });
  }
});

// 获取详细的财务数据
router.get('/financials/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { market = 'auto' } = req.query;
    
    console.log(`📈 获取财务数据: ${symbol} (市场: ${market})`);
    
    const yahooSymbol = getYahooSymbol(symbol, market);
    
    // 同时获取多个数据源
    const [quote, financials, balanceSheet, cashFlow] = await Promise.allSettled([
      yahooFinance.quote(yahooSymbol),
      yahooFinance.fundamentals(yahooSymbol, { modules: ['incomeStatementHistory', 'incomeStatementHistoryQuarterly'] }),
      yahooFinance.fundamentals(yahooSymbol, { modules: ['balanceSheetHistory', 'balanceSheetHistoryQuarterly'] }),
      yahooFinance.fundamentals(yahooSymbol, { modules: ['cashflowStatementHistory', 'cashflowStatementHistoryQuarterly'] })
    ]);
    
    if (quote.status === 'rejected') {
      throw new Error(`无法获取股票 ${symbol} 的基本信息`);
    }
    
    const quoteData = quote.value;
    let processedData = {
      symbol: symbol,
      yahooSymbol: yahooSymbol,
      companyName: quoteData.displayName || quoteData.shortName || quoteData.longName || symbol,
      currentPrice: quoteData.regularMarketPrice || 0,
      currency: quoteData.currency || 'USD',
      market: quoteData.market || market,
      dataSource: 'Yahoo Finance',
      lastUpdate: new Date().toISOString(),
      dataQuality: 'partial' // 默认为部分数据
    };

    // 处理财务数据
    if (financials.status === 'fulfilled' && financials.value.incomeStatementHistory) {
      const latestIncome = financials.value.incomeStatementHistory.incomeStatementHistory?.[0];
      if (latestIncome) {
        processedData.financials = {
          netIncome: latestIncome.netIncome || 0,
          totalRevenue: latestIncome.totalRevenue || 0,
          operatingIncome: latestIncome.operatingIncome || 0,
          grossProfit: latestIncome.grossProfit || 0,
          reportDate: latestIncome.endDate ? new Date(latestIncome.endDate).toISOString() : null
        };
      }
    }

    // 处理资产负债表数据
    if (balanceSheet.status === 'fulfilled' && balanceSheet.value.balanceSheetHistory) {
      const latestBalance = balanceSheet.value.balanceSheetHistory.balanceSheetHistory?.[0];
      if (latestBalance) {
        processedData.balanceSheet = {
          totalAssets: latestBalance.totalAssets || 0,
          totalLiab: latestBalance.totalLiab || 0,
          totalStockholderEquity: latestBalance.totalStockholderEquity || 0,
          shortLongTermDebt: (latestBalance.shortLongTermDebt || 0) + (latestBalance.longTermDebt || 0),
          cash: latestBalance.cash || 0,
          reportDate: latestBalance.endDate ? new Date(latestBalance.endDate).toISOString() : null
        };
      }
    }

    // 处理现金流数据
    if (cashFlow.status === 'fulfilled' && cashFlow.value.cashflowStatementHistory) {
      const latestCashFlow = cashFlow.value.cashflowStatementHistory.cashflowStatementHistory?.[0];
      if (latestCashFlow) {
        processedData.cashFlow = {
          totalCashFromOperatingActivities: latestCashFlow.totalCashFromOperatingActivities || 0,
          capitalExpenditures: Math.abs(latestCashFlow.capitalExpenditures || 0),
          totalCashFromInvestingActivities: latestCashFlow.totalCashFromInvestingActivities || 0,
          totalCashFromFinancingActivities: latestCashFlow.totalCashFromFinancingActivities || 0,
          reportDate: latestCashFlow.endDate ? new Date(latestCashFlow.endDate).toISOString() : null
        };
      }
    }

    // 股本信息
    processedData.shares = {
      sharesOutstanding: quoteData.sharesOutstanding || 0,
      floatShares: quoteData.floatShares || quoteData.sharesOutstanding || 0
    };

    // 估值指标
    processedData.valuation = {
      trailingPE: quoteData.trailingPE || null,
      forwardPE: quoteData.forwardPE || null,
      priceToBook: quoteData.priceToBook || null,
      marketCap: quoteData.marketCap || 0,
      enterpriseValue: quoteData.enterpriseValue || null
    };

    // 数据完整性评估
    const hasFinancials = !!processedData.financials;
    const hasBalance = !!processedData.balanceSheet;
    const hasCashFlow = !!processedData.cashFlow;
    
    if (hasFinancials && hasBalance && hasCashFlow) {
      processedData.dataQuality = 'complete';
    } else if (hasFinancials || hasBalance || hasCashFlow) {
      processedData.dataQuality = 'partial';
    } else {
      processedData.dataQuality = 'basic';
    }

    // 数据获取过程记录
    processedData.dataProcess = {
      quote: quote.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${quote.reason?.message}`,
      financials: financials.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${financials.reason?.message}`,
      balanceSheet: balanceSheet.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${balanceSheet.reason?.message}`,
      cashFlow: cashFlow.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${cashFlow.reason?.message}`
    };

    console.log(`✅ 财务数据获取完成 ${symbol}, 质量: ${processedData.dataQuality}`);
    res.json(processedData);
    
  } catch (error) {
    console.error(`❌ 获取财务数据失败 ${req.params.symbol}:`, error.message);
    res.status(500).json({
      error: '获取财务数据失败',
      message: error.message,
      symbol: req.params.symbol,
      suggestion: '请检查股票代码是否正确，部分股票可能需要手动输入财务数据'
    });
  }
});

// Tushare数据获取（备用）
router.get('/tushare/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        error: 'Tushare token is required',
        message: '请提供有效的Tushare Pro token'
      });
    }
    
    console.log(`📊 尝试从Tushare获取数据: ${symbol}`);
    
    // 转换股票代码为Tushare格式
    let tsCode = symbol;
    if (symbol.startsWith('00') && symbol.length === 5) {
      tsCode = symbol + '.SZ'; // 深圳
    } else if (symbol.startsWith('60') && symbol.length === 6) {
      tsCode = symbol + '.SH'; // 上海  
    } else if (symbol === '00700') {
      tsCode = '00700.HK'; // 港股
    }
    
    // 调用Tushare API
    const response = await axios.post('http://api.tushare.pro', {
      api_name: 'daily_basic',
      token: token,
      params: {
        ts_code: tsCode,
        trade_date: new Date().toISOString().slice(0, 10).replace(/-/g, '')
      }
    });
    
    if (response.data.code !== 0) {
      throw new Error(response.data.msg || 'Tushare API调用失败');
    }
    
    // 处理返回的数据...
    res.json({
      symbol: symbol,
      tsCode: tsCode,
      dataSource: 'Tushare Pro',
      data: response.data.data,
      message: 'Tushare数据获取成功'
    });
    
  } catch (error) {
    console.error(`❌ Tushare数据获取失败 ${req.params.symbol}:`, error.message);
    res.status(500).json({
      error: 'Tushare数据获取失败',
      message: error.message,
      symbol: req.params.symbol
    });
  }
});

// 获取股票列表
router.get('/list', async (req, res) => {
  try {
    const stockList = [
      // 美股
      { code: 'AAPL', market: 'US', name: '苹果公司', category: '科技' },
      { code: 'MSFT', market: 'US', name: '微软', category: '科技' },
      { code: 'GOOGL', market: 'US', name: '谷歌', category: '科技' },
      { code: 'TSLA', market: 'US', name: '特斯拉', category: '汽车' },
      { code: 'NVDA', market: 'US', name: '英伟达', category: '科技' },
      { code: 'MSTR', market: 'US', name: '微策略', category: '软件' },
      { code: 'META', market: 'US', name: 'Meta', category: '科技' },
      { code: 'AMZN', market: 'US', name: '亚马逊', category: '电商' },
      
      // 港股
      { code: '00700', market: 'HK', name: '腾讯控股', category: '互联网' },
      { code: '09988', market: 'HK', name: '阿里巴巴-SW', category: '电商' },
      { code: '03690', market: 'HK', name: '美团-W', category: '本地服务' },
      { code: '01024', market: 'HK', name: '快手-W', category: '社交媒体' },
      
      // A股
      { code: '600519', market: 'CN', name: '贵州茅台', category: '白酒' },
      { code: '000858', market: 'CN', name: '五粮液', category: '白酒' },
      { code: '002415', market: 'CN', name: '分众传媒', category: '广告' },
      { code: '000001', market: 'CN', name: '平安银行', category: '银行' },
      { code: '600036', market: 'CN', name: '招商银行', category: '银行' }
    ];
    
    res.json({
      success: true,
      data: stockList,
      count: stockList.length
    });
    
  } catch (error) {
    console.error('获取股票列表失败:', error);
    res.status(500).json({
      error: '获取股票列表失败',
      message: error.message
    });
  }
});

module.exports = router;