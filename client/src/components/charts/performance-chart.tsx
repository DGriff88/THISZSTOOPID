import { useEffect, useRef } from 'react';

interface PerformanceChartProps {
  data: Array<{ date: string; value: number }>;
  title?: string;
  height?: number;
}

export default function PerformanceChart({ data, title = "Performance", height = 300 }: PerformanceChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find min/max values
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = 'hsl(240, 3.7%, 15.9%)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding + (chartWidth / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw the line
    ctx.strokeStyle = 'hsl(217, 91%, 60%)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = 'hsl(217, 91%, 60%)';
    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = 'hsl(240, 5%, 64.9%)';
    ctx.font = '12px Inter';
    
    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (valueRange / 4) * (4 - i);
      const y = padding + (chartHeight / 4) * i;
      ctx.fillText(value.toFixed(0), 5, y + 4);
    }

    // X-axis labels (simplified)
    const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
    labelIndices.forEach((index) => {
      if (index < data.length) {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const date = new Date(data[index].date).toLocaleDateString();
        ctx.fillText(date, x - 30, height - 10);
      }
    });

  }, [data, height]);

  if (!data.length) {
    return (
      <div 
        className="chart-container rounded-lg flex items-center justify-center text-center text-muted-foreground"
        style={{ height }}
        data-testid="chart-empty-state"
      >
        <div>
          <div className="text-4xl mb-4">📈</div>
          <p>No performance data available</p>
          <p className="text-sm">Start trading to see your portfolio performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={chartRef}
        className="w-full chart-container rounded-lg"
        style={{ height }}
        data-testid="performance-chart"
      />
    </div>
  );
}
