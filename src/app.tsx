import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppHeader } from '@/components/app-header'
import { RedirectIfAuthed, RequireAuth } from '@/components/auth-guard'
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
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppHeader />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/compare/:id" element={<ComparePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
