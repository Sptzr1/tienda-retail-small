"use client"

export default function CategoryTabs({ categories, selectedCategory, setSelectedCategory }) {
  return (
    <div className="bg-white shadow-sm border-b overflow-x-auto">
      <div className="flex space-x-1 p-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
            selectedCategory === null ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Todos
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
              selectedCategory === category.id ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}

