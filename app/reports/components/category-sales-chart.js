"use client"

import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

export default function CategorySalesChart({ categorySales }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (categorySales.length === 0) return

    const ctx = chartRef.current.getContext("2d")

    // Destruir el gráfico anterior si existe
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    // Colores para las categorías
    const backgroundColors = [
      "rgba(255, 99, 132, 0.6)",
      "rgba(54, 162, 235, 0.6)",
      "rgba(255, 206, 86, 0.6)",
      "rgba(75, 192, 192, 0.6)",
      "rgba(153, 102, 255, 0.6)",
    ]

    // Crear nuevo gráfico
    chartInstance.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: categorySales.map((category) => category.category_name),
        datasets: [
          {
            data: categorySales.map((category) => category.total_sales),
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((color) => color.replace("0.6", "1")),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                const percentage = ((value / total) * 100).toFixed(1)
                return `${context.label}: $${value.toFixed(2)} (${percentage}%)`
              },
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
  }, [categorySales])

  if (categorySales.length === 0) {
    return <p className="text-gray-500 text-center py-4">No hay datos de categorías disponibles</p>
  }

  return (
    <div className="h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}
