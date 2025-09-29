import backtrader as bt
import pandas as pd

class EMAStrat(bt.Strategy):
    params = dict(fast=9, slow=21)
    def __init__(self):
        self.ema_fast = bt.ind.EMA(self.data.close, period=self.p.fast)
        self.ema_slow = bt.ind.EMA(self.data.close, period=self.p.slow)
        self.crossover = bt.ind.CrossOver(self.ema_fast, self.ema_slow)
    def next(self):
        if not self.position and self.crossover[0] > 0:
            self.buy(size=1)
        elif self.position and self.crossover[0] < 0:
            self.close()

def run_backtest(csv_path):
    df = pd.read_csv(csv_path, parse_dates=True, index_col=0)
    cerebro = bt.Cerebro()
    data = bt.feeds.PandasData(dataname=df)
    cerebro.adddata(data)
    cerebro.addstrategy(EMAStrat)
    cerebro.broker.setcash(100000)
    result = cerebro.run()
    print("Final value:", cerebro.broker.getvalue())

if __name__ == "__main__":
    pass
