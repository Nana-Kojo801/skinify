import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { RedirectIfAuthed, RequireAuth } from '@/components/auth-guard'

// Route-level code splitting: each page is its own chunk, loaded on first visit.
const LoginPage = lazy(() => import('@/pages/login/login-page').then((m) => ({ default: m.LoginPage })))
const SsoCallbackPage = lazy(() => import('@/pages/login/sso-callback-page').then((m) => ({ default: m.SsoCallbackPage })))
const UnsubscribePage = lazy(() => import('@/pages/unsubscribe/unsubscribe-page').then((m) => ({ default: m.UnsubscribePage })))
const HomePage = lazy(() => import('@/pages/home/home-page').then((m) => ({ default: m.HomePage })))
const ScanPage = lazy(() => import('@/pages/scan/scan-page').then((m) => ({ default: m.ScanPage })))
const ProductFormPage = lazy(() => import('@/pages/product-form/product-form-page').then((m) => ({ default: m.ProductFormPage })))
const ProductDetailPage = lazy(() => import('@/pages/product-detail/product-detail-page').then((m) => ({ default: m.ProductDetailPage })))
const ComparePage = lazy(() => import('@/pages/compare/compare-page').then((m) => ({ default: m.ComparePage })))
const ReportPage = lazy(() => import('@/pages/report/report-page').then((m) => ({ default: m.ReportPage })))
const SettingsPage = lazy(() => import('@/pages/settings/settings-page').then((m) => ({ default: m.SettingsPage })))

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route
            path="/login"
            element={
              <Suspense fallback={null}>
                <LoginPage />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="/sso-callback"
          element={
            <Suspense fallback={null}>
              <SsoCallbackPage />
            </Suspense>
          }
        />
        <Route
          path="/unsubscribe"
          element={
            <Suspense fallback={null}>
              <UnsubscribePage />
            </Suspense>
          }
        />
        <Route element={<RequireAuth />}>
          <Route
            path="/report"
            element={
              <Suspense fallback={null}>
                <ReportPage />
              </Suspense>
            }
          />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
            <Route path="/compare/:id" element={<ComparePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

