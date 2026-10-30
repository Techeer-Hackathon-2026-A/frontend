import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout, type RouteHandle } from '@/components/Layout'
import { scanTitle } from '@/lib/scanRepos'
import { FindingDetailPage } from '@/pages/FindingDetailPage'
import { HomePage } from '@/pages/HomePage'
import { PullRequestsPage } from '@/pages/PullRequestsPage'
import { ReportPage } from '@/pages/ReportPage'
import { ScanPage } from '@/pages/ScanPage'

const scanCrumb = (id?: string) => ({ label: scanTitle(Number(id)), to: `/scans/${id}/report` })

const router = createBrowserRouter([
  // 스캔 화면은 연출 프로토타입이 화면 전체를 쓴다
  { path: '/scans/:scanId', element: <ScanPage /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/scans/:scanId/report',
        element: <ReportPage />,
        handle: { crumbs: (p) => [scanCrumb(p.scanId), { label: '보고서' }] } satisfies RouteHandle,
      },
      {
        path: '/scans/:scanId/pull-requests',
        element: <PullRequestsPage />,
        handle: { crumbs: (p) => [scanCrumb(p.scanId), { label: 'PR' }] } satisfies RouteHandle,
      },
      {
        path: '/findings/:findingId',
        element: <FindingDetailPage />,
        handle: { crumbs: (p) => [{ label: `취약점 #${p.findingId}` }] } satisfies RouteHandle,
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
