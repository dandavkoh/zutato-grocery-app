import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import HouseholdsPage from './HouseholdsPage'
import ShoppingListPage from './ShoppingListPage'
import ProductDetailPage from './ProductDetailPage'
import CategorySelectPage from './CategorySelectPage'
import UnitSelectPage from './UnitSelectPage'
import SearchPage from './SearchPage'

function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Header */}
        <div className="flex justify-center space-x-8 mb-8">
          <a href="https://vite.dev" target="_blank" className="hover:scale-110 transition-transform">
            <img src={viteLogo} className="h-16 w-16" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" className="hover:scale-110 transition-transform">
            <img src={reactLogo} className="h-16 w-16 animate-spin-slow" alt="React logo" />
          </a>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Vite + React + Tailwind
        </h1>
        
        {/* Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-6">
          <button 
            onClick={() => setCount((count) => count + 1)}
            className="bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Count is {count}
          </button>
          <p className="text-white mt-4 text-sm opacity-90">
            Edit <code className="bg-white/20 px-2 py-1 rounded text-xs">src/App.tsx</code> and save to test HMR
          </p>
        </div>
        
        {/* Button zur Haushalte-Seite */}
        <button
          className="w-full bg-yellow-400 text-white font-semibold py-3 rounded-xl mb-6 text-lg hover:bg-yellow-500 transition-colors"
          onClick={() => navigate('/households')}
        >
          Zu "Meine Haushalte"
        </button>
        
        {/* Footer */}
        <p className="text-gray-600 text-sm">
          Click on the Vite and React logos to learn more
        </p>
        
        {/* Tailwind Test Section */}
        <div className="mt-8 p-4 bg-green-100 rounded-lg border border-green-200">
          <h3 className="text-green-800 font-semibold mb-2">✅ Tailwind CSS Test</h3>
          <p className="text-green-700 text-sm">
            If you can see this green box with styled text, Tailwind CSS is working correctly!
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/households" element={<HouseholdsPage />} />
      <Route path="/shopping-list" element={<ShoppingListPage />} />
      <Route path="/shopping-list/search" element={<SearchPage />} />
      <Route path="/product/:name" element={<ProductDetailPage />} />
      <Route path="/product/:name/category" element={<CategorySelectPage />} />
      <Route path="/product/:name/unit" element={<UnitSelectPage />} />
    </Routes>
  )
}

export default App
