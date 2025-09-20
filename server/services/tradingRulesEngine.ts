import { 
  DailySession, 
  WeeklyPaycheck, 
  RuleViolation, 
  OptionTrade,
  insertDailySessionSchema,
  insertWeeklyPaycheckSchema,
  insertRuleViolationSchema,
  insertOptionTradeSchema
} from '../../shared/schema.js';
import AITradingAnalyst from './aiTradingAnalyst.js';

/**
 * PIRATETRADER Rules Engine
 * Implements core trading rules and compliance checking
 */
export default class TradingRulesEngine {
  private storage: any;
  private aiAnalyst: AITradingAnalyst;

  constructor(storage: any, schwabService: any) {
    this.storage = storage;
    this.aiAnalyst = new AITradingAnalyst(schwabService);
  }

  /**
   * RULE ONE: Check for stray legs before allowing new spread
   */
  async validateRuleOne(userId: string, symbol: string): Promise<{ valid: boolean; message?: string; violations?: any[] }> {
    const activeTrades = await this.storage.getActiveOptionTrades(userId, symbol);
    const strayLegs = activeTrades.filter((trade: any) => trade.hasStrayLegs && !trade.legsClosed);
    
    if (strayLegs.length > 0) {
      const violation = {
        userId,
        violationType: 'stray_leg_detected',
        severity: 'critical',
        description: `RULE ONE violation: Stray legs detected for ${symbol}. Must close stray legs before opening new spread.`,
        ruleReference: 'RULE ONE',
        detectedValue: `${strayLegs.length} stray legs`,
        allowedValue: '0 stray legs'
      };
      
      await this.storage.createRuleViolation(violation);
      
      return {
        valid: false,
        message: `❌ RULE ONE VIOLATION: Close ${strayLegs.length} stray leg(s) for ${symbol} before opening new spread`,
        violations: strayLegs
      };
    }

    return { valid: true };
  }

  /**
   * Walk Rule: Check if daily limits are reached (+$200 or 3 reds)
   */
  async validateWalkRule(userId: string): Promise<{ valid: boolean; message?: string; shouldStop?: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const session = await this.storage.getDailySession(userId, today);
    
    if (!session) {
      return { valid: true };
    }

    // Check if walk rule already triggered today
    if (session.walkRuleTriggered) {
      return {
        valid: false,
        shouldStop: true,
        message: `🚶 WALK RULE: Already triggered today (${session.walkRuleReason}). No more trades allowed.`
      };
    }

    // Check +$200 profit threshold
    const dailyPnl = parseFloat(session.dailyPnl || '0');
    if (dailyPnl >= 200) {
      await this.triggerWalkRule(userId, session.id, '+$200 profit target reached');
      return {
        valid: false,
        shouldStop: true,
        message: '🎯 WALK RULE: $200 daily profit reached! Stop trading for today.'
      };
    }

    // Check 3 consecutive red trades
    if (session.redTrades >= 3) {
      await this.triggerWalkRule(userId, session.id, '3 consecutive losses');
      return {
        valid: false,
        shouldStop: true,
        message: '🔴 WALK RULE: 3 consecutive losses. Stop trading for today.'
      };
    }

    return { valid: true };
  }

  /**
   * Validate trading window (06:30-07:30 PT and 12:00-13:00 PT)
   */
  validateTradingWindow(): { valid: boolean; session?: string; message?: string } {
    const now = new Date();
    const ptHour = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"})).getHours();
    const ptMinute = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"})).getMinutes();
    const currentTime = ptHour + ptMinute / 60;

    // First hour: 06:30-07:30 PT
    if (currentTime >= 6.5 && currentTime <= 7.5) {
      return { valid: true, session: 'first_hour' };
    }

    // Last hour: 12:00-13:00 PT  
    if (currentTime >= 12.0 && currentTime <= 13.0) {
      return { valid: true, session: 'last_hour' };
    }

    return {
      valid: false,
      message: '⏰ Outside trading windows. Allowed: 06:30-07:30 PT (First Hour) or 12:00-13:00 PT (Last Hour)'
    };
  }

  /**
   * Validate risk per trade ($40-80 max)
   */
  validateRiskPerTrade(riskAmount: number): { valid: boolean; message?: string } {
    if (riskAmount < 40 || riskAmount > 80) {
      return {
        valid: false,
        message: `💰 Risk validation failed: $${riskAmount} is outside $40-80 range per PIRATETRADER rules`
      };
    }
    return { valid: true };
  }

  /**
   * Validate daily loss limit (-$240 max)
   */
  async validateDailyLossLimit(userId: string, newRisk: number): Promise<{ valid: boolean; message?: string }> {
    const today = new Date().toISOString().split('T')[0];
    const session = await this.storage.getDailySession(userId, today);
    
    const currentRisk = parseFloat(session?.totalRiskToday || '0');
    const totalRisk = currentRisk + newRisk;
    
    if (totalRisk > 240) {
      return {
        valid: false,
        message: `🚫 Daily loss limit: Adding $${newRisk} would exceed -$240 limit (current: -$${currentRisk})`
      };
    }

    return { valid: true };
  }

  /**
   * Validate option type (only spreads allowed)
   */
  validateOptionType(optionType: string): { valid: boolean; message?: string } {
    const allowedTypes = ['call_debit_spread', 'put_debit_spread', 'call_credit_spread', 'put_credit_spread'];
    
    if (!allowedTypes.includes(optionType)) {
      return {
        valid: false,
        message: `❌ Invalid option type: ${optionType}. Only spreads allowed (no naked options)`
      };
    }

    return { valid: true };
  }

  /**
   * Four Gates validation with AI integration
   */
  async validateFourGates(symbol: string, setupData: any): Promise<{ valid: boolean; gates: any; message?: string }> {
    const gates = {
      catalyst: false,
      alignment: false,
      momentum: false,
      profitMath: false
    };

    try {
      // Gate 1: Catalyst + Freshness
      if (setupData.catalystAge <= 4 && setupData.rvol >= 1.5) {
        gates.catalyst = true;
      }

      // Gate 2 & 3: Get AI analysis for alignment and momentum
      const sentiment = await this.aiAnalyst.analyzeMarketSentiment(symbol);
      if (!sentiment.error) {
        // Alignment: Check if sentiment supports the trade direction
        if (sentiment.sentiment !== 'neutral' && sentiment.confidence > 0.6) {
          gates.alignment = true;
        }
        
        // Momentum: High confidence indicates good momentum signals
        if (sentiment.confidence > 0.7) {
          gates.momentum = true;
        }
      }

      // Gate 4: Profit Math
      const riskReward = setupData.maxProfit / setupData.maxRisk;
      if (setupData.maxRisk <= 80 && riskReward >= 1.0) {
        gates.profitMath = true;
      }

      const passedGates = Object.values(gates).filter(Boolean).length;
      const valid = passedGates >= 3; // Need at least 3 of 4 gates

      return {
        valid,
        gates,
        message: valid ? `✅ Four Gates passed (${passedGates}/4)` : `⚠️ Four Gates failed (${passedGates}/4) - need at least 3`
      };

    } catch (error) {
      console.error('Four Gates validation error:', error);
      return {
        valid: false,
        gates,
        message: '❌ Four Gates validation failed due to analysis error'
      };
    }
  }

  /**
   * Complete trade validation pipeline
   */
  async validateTrade(userId: string, tradeData: any): Promise<{ valid: boolean; messages: string[]; violations: any[] }> {
    const messages: string[] = [];
    const violations: any[] = [];

    // RULE ONE check
    const ruleOneResult = await this.validateRuleOne(userId, tradeData.symbol);
    if (!ruleOneResult.valid) {
      messages.push(ruleOneResult.message!);
      violations.push(...(ruleOneResult.violations || []));
    }

    // Walk rule check
    const walkRuleResult = await this.validateWalkRule(userId);
    if (!walkRuleResult.valid) {
      messages.push(walkRuleResult.message!);
      return { valid: false, messages, violations }; // Stop immediately if walk rule triggered
    }

    // Trading window check
    const windowResult = this.validateTradingWindow();
    if (!windowResult.valid) {
      messages.push(windowResult.message!);
    }

    // Risk validation
    const riskResult = this.validateRiskPerTrade(tradeData.maxRisk);
    if (!riskResult.valid) {
      messages.push(riskResult.message!);
    }

    // Daily loss limit
    const lossLimitResult = await this.validateDailyLossLimit(userId, tradeData.maxRisk);
    if (!lossLimitResult.valid) {
      messages.push(lossLimitResult.message!);
    }

    // Option type validation
    const optionTypeResult = this.validateOptionType(tradeData.optionType);
    if (!optionTypeResult.valid) {
      messages.push(optionTypeResult.message!);
    }

    // Four Gates validation
    const fourGatesResult = await this.validateFourGates(tradeData.symbol, tradeData);
    messages.push(fourGatesResult.message!);
    if (!fourGatesResult.valid) {
      violations.push({
        type: 'four_gates_failed',
        gates: fourGatesResult.gates,
        passed: Object.values(fourGatesResult.gates).filter(Boolean).length
      });
    }

    const allValid = violations.length === 0 && messages.filter(m => m.includes('❌') || m.includes('🚫') || m.includes('⚠️')).length === 0;

    return {
      valid: allValid,
      messages,
      violations
    };
  }

  /**
   * Trigger walk rule and update session
   */
  private async triggerWalkRule(userId: string, sessionId: string, reason: string): Promise<void> {
    await this.storage.updateDailySession(sessionId, {
      walkRuleTriggered: true,
      walkRuleReason: reason,
      updatedAt: new Date()
    });

    // Create violation record
    await this.storage.createRuleViolation({
      userId,
      sessionId,
      violationType: 'walk_rule_exceeded',
      severity: 'critical',
      description: `Walk rule triggered: ${reason}`,
      ruleReference: 'Walk Rule',
      detectedValue: reason,
      allowedValue: 'Daily limit not exceeded'
    });
  }

  /**
   * Update daily session with trade result
   */
  async updateSessionWithTrade(userId: string, tradeResult: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let session = await this.storage.getDailySession(userId, today);
    
    if (!session) {
      // Create new daily session
      session = await this.storage.createDailySession({
        userId,
        sessionDate: new Date(today),
        dailyPnl: '0',
        tradeCount: 0,
        redTrades: 0,
        totalRiskToday: '0'
      });
    }

    const currentPnl = parseFloat(session.dailyPnl || '0');
    const currentRisk = parseFloat(session.totalRiskToday || '0');
    const tradePnl = parseFloat(tradeResult.pnl || '0');
    const tradeRisk = parseFloat(tradeResult.maxRisk || '0');

    // Update consecutive red trades counter
    let newRedTrades = session.redTrades || 0;
    if (tradePnl < 0) {
      newRedTrades += 1;
    } else if (tradePnl > 0) {
      newRedTrades = 0; // Reset on winning trade
    }

    // Update session
    await this.storage.updateDailySession(session.id, {
      dailyPnl: (currentPnl + tradePnl).toString(),
      tradeCount: (session.tradeCount || 0) + 1,
      redTrades: newRedTrades,
      totalRiskToday: (currentRisk + tradeRisk).toString(),
      updatedAt: new Date()
    });
  }

  /**
   * Get current compliance status
   */
  async getComplianceStatus(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const session = await this.storage.getDailySession(userId, today);
    const activeViolations = await this.storage.getActiveViolations(userId);
    const activeTrades = await this.storage.getActiveOptionTrades(userId);

    const currentWeek = this.getWeekStart(new Date());
    const weeklyPaycheck = await this.storage.getWeeklyPaycheck(userId, currentWeek);

    return {
      daily: {
        pnl: parseFloat(session?.dailyPnl || '0'),
        tradeCount: session?.tradeCount || 0,
        redTrades: session?.redTrades || 0,
        walkRuleTriggered: session?.walkRuleTriggered || false,
        walkRuleReason: session?.walkRuleReason,
        totalRisk: parseFloat(session?.totalRiskToday || '0'),
        remainingRisk: 240 - parseFloat(session?.totalRiskToday || '0'),
        gtcOrdersCancelled: session?.gtcOrdersCancelled || false
      },
      weekly: {
        goal: parseFloat(weeklyPaycheck?.baselineGoal || '300'),
        stretchGoal: parseFloat(weeklyPaycheck?.stretchGoal || '750'),
        actual: parseFloat(weeklyPaycheck?.actualPnl || '0'),
        totalTrades: weeklyPaycheck?.totalTrades || 0,
        winRate: weeklyPaycheck?.totalTrades ? 
          ((weeklyPaycheck?.winningTrades || 0) / weeklyPaycheck.totalTrades * 100).toFixed(1) : '0'
      },
      violations: activeViolations,
      activeTrades: activeTrades.length,
      strayLegs: activeTrades.filter((t: any) => t.hasStrayLegs && !t.legsClosed).length
    };
  }

  /**
   * Get Monday of current week
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Check if GTC orders need to be cancelled (nightly reminder)
   */
  async checkGTCCancellation(userId: string): Promise<{ needsCancellation: boolean; message?: string }> {
    const today = new Date().toISOString().split('T')[0];
    const session = await this.storage.getDailySession(userId, today);
    
    if (!session?.gtcOrdersCancelled && (session?.gtcOrdersActive || 0) > 0) {
      return {
        needsCancellation: true,
        message: `🔄 CANCEL ALL GTC NIGHTLY: You have ${session.gtcOrdersActive} active GTC orders that need cancellation`
      };
    }

    return { needsCancellation: false };
  }
}