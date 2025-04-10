export default function SalesOverview({ stats }) {
    const { totalSales, averageSale, salesCount } = stats
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total de Ventas</h3>
          <p className="text-2xl font-bold text-blue-900">${totalSales.toFixed(2)}</p>
        </div>
  
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-1">Venta Promedio</h3>
          <p className="text-2xl font-bold text-green-900">${averageSale.toFixed(2)}</p>
        </div>
  
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Número de Ventas</h3>
          <p className="text-2xl font-bold text-purple-900">{salesCount}</p>
        </div>
      </div>
    )
  }
  