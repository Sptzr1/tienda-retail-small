"use client"

import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

export default function DailySalesChart({ dailySales }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (dailySales.length === 0) return

    const ctx = chartRef.current.getContext("2d")

    // Destruir el gráfico anterior si existe
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    // Formatear fechas para el gráfico
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })
    }

    // Crear nuevo gráfico
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: dailySales.map((day) => formatDate(day.sale_date)),
        datasets: [
          {
            label: "Ventas Diarias",
            data: dailySales.map((day) => day.total_sales),
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "rgba(75, 192, 192, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `Ventas: $${context.raw.toFixed(2)}`,
              afterLabel: (context) => {
                const day = dailySales[context.dataIndex]
                return `Transacciones: ${day.sales_count}`
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Ventas ($)",
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [dailySales])

  if (dailySales.length === 0) {
    return <p className="text-gray-500 text-center py-4">No hay datos de ventas diarias disponibles</p>
  }

  return (
    <div className="h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}
