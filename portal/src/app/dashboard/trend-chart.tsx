'use client'

import { useRef, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface TrendChartProps {
  data: { date: string; value: number }[]
  positive?: boolean
  height?: number
}

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatValue(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return v.toLocaleString('en-US')
}

function getXLabels(data: { date: string }[]): string[] {
  if (data.length <= 6) return data.map(d => formatLabel(d.date))
  const step = Math.max(1, Math.floor(data.length / 5))
  return data.map((d, i) => {
    if (i === 0 || i === data.length - 1 || i % step === 0) return formatLabel(d.date)
    return ''
  })
}

const crosshairPlugin: Plugin<'line'> = {
  id: 'crosshair',
  afterDraw(chart) {
    const tooltip = chart.tooltip
    if (!tooltip || !tooltip.getActiveElements().length) return
    const ctx = chart.ctx
    const x = tooltip.getActiveElements()[0].element.x
    const topY = chart.scales.y.top
    const bottomY = chart.scales.y.bottom
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, topY)
    ctx.lineTo(x, bottomY)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.stroke()
    ctx.restore()
  },
}

export default function TrendChart({ data, positive = true, height = 160 }: TrendChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null)
  const lineColor = positive ? '#4abd98' : '#E24B4A'

  const xLabels = useMemo(() => getXLabels(data), [data])

  const chartData = useMemo(() => ({
    labels: data.map(d => formatLabel(d.date)),
    datasets: [
      {
        data: data.map(d => d.value),
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.45,
        fill: true,
        backgroundColor: (ctx: { chart: ChartJS }) => {
          const chart = ctx.chart
          const { ctx: canvasCtx, chartArea } = chart
          if (!chartArea) return 'transparent'
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, positive ? 'rgba(74,189,152,0.12)' : 'rgba(226,75,74,0.12)')
          gradient.addColorStop(1, positive ? 'rgba(74,189,152,0.01)' : 'rgba(226,75,74,0.01)')
          return gradient
        },
      },
    ],
  }), [data, lineColor, positive])

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          callback: function (_value: string | number, index: number) {
            return xLabels[index] || ''
          },
          maxRotation: 0,
          color: '#aeaeb2',
          font: { size: 11, family: 'Inter, sans-serif' },
          padding: 8,
        },
      },
      y: { display: false },
    },
    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: '#ffffff',
        titleColor: '#1d1d1f',
        bodyColor: '#6e6e73',
        borderColor: '#d2d2d7',
        borderWidth: 0.5,
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 14, weight: 500, family: 'Inter, sans-serif' },
        bodyFont: { size: 11, family: 'Inter, sans-serif' },
        callbacks: {
          title: (items) => formatValue(items[0].parsed.y),
          label: (item) => data[item.dataIndex]?.date
            ? new Date(data[item.dataIndex].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : '',
        },
      },
      legend: { display: false },
    },
  }), [data, xLabels])

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [])

  return (
    <div style={{ height }}>
      <Line
        ref={chartRef}
        data={chartData}
        options={options}
        plugins={[crosshairPlugin]}
      />
    </div>
  )
}
