const express = require('express');
const router = express.Router();

// 估值计算核心函数
const calculateStockValuation = (financialData, params) => {
  const {
    growthRate = 0.1,
    reasonablePE = 20,
    safetyMargin = 0.5,
    highLeverageThreshold = 0.7
  } = params;

  // 提取财务数据
  const netIncome = financialData.netIncome || 0;
  const totalShares = financialData.totalShares || financialData.sharesOutstanding || 0;
  const operatingCashFlow = financialData.operatingCashFlow || 0;
  const totalAssets = financialData.totalAssets || 0;
  const interestBearingDebt = financialData.interestBearingDebt || 0;
  const capex = financialData.capex || 0;
  const depreciation = financialData.depreciation || 0;
  const currentPrice = financialData.currentPrice || 0;

  // 计算过程记录
  const calculationSteps = [];
  
  calculationSteps.push({
    step: 1,
    title: '基础数据验证',
    description: '检查基础财务数据的有效性',
    inputs: {
      净利润: netIncome,
      总股数: totalShares,
      经营现金流: operatingCashFlow,
      总资产: totalAssets,
      有息负债: interestBearingDebt,
      当前股价: currentPrice
    },
    formula: '数据完整性检查',
    result: netIncome > 0 && totalShares > 0 ? '✅ 数据有效' : '❌ 缺少关键数据'
  });

  // 前提验证
  const verification = {
    profitIsReal: operatingCashFlow >= netIncome * 0.8,
    profitSustainable: netIncome > 0,
    lowCapitalConsumption: capex <= depreciation * 1.2, // 稍微放宽条件
    leverageRatio: totalAssets > 0 ? interestBearingDebt / totalAssets : 0
  };

  calculationSteps.push({
    step: 2,
    title: '质量验证',
    description: '验证利润质量和财务健康度',
    inputs: {
      经营现金流: operatingCashFlow,
      净利润: netIncome,
      现金流净利润比: operatingCashFlow / netIncome,
      资本开支: capex,
      折旧摊销: depreciation,
      杠杆率: verification.leverageRatio
    },
    formulas: [
      '利润真实性 = 经营现金流 / 净利润 >= 0.8',
      '低资本消耗 = 资本开支 <= 折旧摊销 × 1.2',
      '杠杆率 = 有息负债 / 总资产'
    ],
    result: {
      利润真实: verification.profitIsReal ? '✅ 通过' : '❌ 不通过',
      低资本消耗: verification.lowCapitalConsumption ? '✅ 通过' : '❌ 不通过',
      杠杆率: verification.leverageRatio < highLeverageThreshold ? '✅ 正常' : '⚠️ 偏高'
    }
  });

  const isHighLeverage = verification.leverageRatio >= highLeverageThreshold;

  // 未来利润预测
  const futureEarnings = {
    year1: netIncome * (1 + growthRate),
    year2: netIncome * Math.pow(1 + growthRate, 2),
    year3: netIncome * Math.pow(1 + growthRate, 3)
  };

  calculationSteps.push({
    step: 3,
    title: '利润增长预测',
    description: '基于增长率预测未来三年利润',
    inputs: {
      当前净利润: netIncome,
      年增长率: `${(growthRate * 100).toFixed(1)}%`
    },
    formula: '未来利润 = 当前净利润 × (1 + 增长率)^年数',
    calculation: {
      第一年: `${netIncome.toLocaleString()} × (1 + ${growthRate}) = ${futureEarnings.year1.toLocaleString()}`,
      第二年: `${netIncome.toLocaleString()} × (1 + ${growthRate})² = ${futureEarnings.year2.toLocaleString()}`,
      第三年: `${netIncome.toLocaleString()} × (1 + ${growthRate})³ = ${futureEarnings.year3.toLocaleString()}`
    },
    result: futureEarnings
  });

  // PE调整
  const adjustedPE = isHighLeverage ? reasonablePE * 0.7 : reasonablePE;
  
  calculationSteps.push({
    step: 4,
    title: 'PE倍数调整',
    description: '根据杠杆率调整合理PE倍数',
    inputs: {
      基础PE: reasonablePE,
      杠杆率: `${(verification.leverageRatio * 100).toFixed(1)}%`,
      是否高杠杆: isHighLeverage ? '是' : '否'
    },
    formula: isHighLeverage ? 'PE调整 = 基础PE × 0.7 (高杠杆折价)' : 'PE调整 = 基础PE (无调整)',
    calculation: isHighLeverage ? 
      `${reasonablePE} × 0.7 = ${adjustedPE.toFixed(1)}` : 
      `${reasonablePE} (无调整)`,
    result: `调整后PE: ${adjustedPE.toFixed(1)}倍`
  });

  // 买入价计算
  const futureValue = futureEarnings.year3 * adjustedPE;
  const buyPrice = totalShares > 0 ? (futureValue * safetyMargin) / totalShares : 0;

  calculationSteps.push({
    step: 5,
    title: '内在价值计算',
    description: '计算基于第三年利润的内在价值',
    inputs: {
      第三年净利润: futureEarnings.year3,
      调整后PE: adjustedPE,
      安全边际: `${(safetyMargin * 100).toFixed(0)}%`,
      总股数: totalShares
    },
    formulas: [
      '第三年市值 = 第三年净利润 × 调整后PE',
      '安全价值 = 第三年市值 × 安全边际',
      '每股内在价值 = 安全价值 ÷ 总股数'
    ],
    calculation: {
      第三年市值: `${futureEarnings.year3.toLocaleString()} × ${adjustedPE.toFixed(1)} = ${futureValue.toLocaleString()}`,
      安全价值: `${futureValue.toLocaleString()} × ${safetyMargin} = ${(futureValue * safetyMargin).toLocaleString()}`,
      内在价值: `${(futureValue * safetyMargin).toLocaleString()} ÷ ${totalShares.toLocaleString()} = ${buyPrice.toFixed(2)}`
    },
    result: `买入价格: ${buyPrice.toFixed(2)}`
  });

  // 卖出价计算
  const sellOption1 = totalShares > 0 ? (netIncome * 50) / totalShares : 0;
  const sellOption2 = totalShares > 0 ? (futureEarnings.year3 * 25 * 1.5) / totalShares : 0;
  const sellPrice = Math.min(sellOption1, sellOption2);

  calculationSteps.push({
    step: 6,
    title: '卖出价格计算',
    description: '计算保守的卖出目标价',
    inputs: {
      当前净利润: netIncome,
      第三年净利润: futureEarnings.year3,
      总股数: totalShares
    },
    formulas: [
      '方案1: 当前利润 × 50倍PE ÷ 股数',
      '方案2: 第三年利润 × 25倍PE × 1.5倍 ÷ 股数',
      '卖出价 = Min(方案1, 方案2)'
    ],
    calculation: {
      方案1: `${netIncome.toLocaleString()} × 50 ÷ ${totalShares.toLocaleString()} = ${sellOption1.toFixed(2)}`,
      方案2: `${futureEarnings.year3.toLocaleString()} × 25 × 1.5 ÷ ${totalShares.toLocaleString()} = ${sellOption2.toFixed(2)}`,
      选择: `Min(${sellOption1.toFixed(2)