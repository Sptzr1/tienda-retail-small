"use client"

import { useState } from "react"
import SalesReport from "./sales-report"

export default function ReportsManager({
  profile,
  stores,
  storeId,
  monthlySales,
  topProducts,
  lowStockProducts,
  dailySales,
}) {
  const [activeTab, setActiveTab] = useState("sales")

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("sales")}
            className={`py-4 px-1 text-sm font-medium border-b-2 ${
              activeTab === "sales"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reporte de Ventas
          </button>
        </nav>
      </div>

      {activeTab === "sales" && <SalesReport profile={profile} stores={stores} storeId={storeId} />}
    </div>
  )
}
