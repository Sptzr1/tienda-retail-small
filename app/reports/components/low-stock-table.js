export default function LowStockTable({ lowStockProducts }) {
    if (lowStockProducts.length === 0) {
      return <p className="text-gray-500 text-center py-4">No hay productos con stock bajo</p>
    }
  
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lowStockProducts.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.products.name}</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.stores.name}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.quantity === 0
                        ? "bg-red-100 text-red-800"
                        : item.quantity <= item.min_stock / 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.quantity}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.min_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  