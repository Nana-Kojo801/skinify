import { BrowserRouter, Route, Routes } from 'react-router'
import { ComparePage } from '@/pages/compare/compare-page'
import { HomePage } from '@/pages/home/home-page'
import { LoginPage } from '@/pages/login/login-page'
import { ProductDetailPage } from '@/pages/product-detail/product-detail-page'
import { ScanPage } from '@/pages/scan/scan-page'
import { SettingsPage } from '@/pages/settings/settings-page'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/compare/:id" element={<ComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
