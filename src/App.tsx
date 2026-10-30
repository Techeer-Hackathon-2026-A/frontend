import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { FindingDetailPage } from '@/pages/FindingDetailPage'
import { HomePage } from '@/pages/HomePage'
import { PullRequestsPage } from '@/pages/PullRequestsPage'
import { ScanPage } from '@/pages/ScanPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/scans/:scanId', element: <ScanPage /> },
      { path: '/scans/:scanId/pull-requests', element: <PullRequestsPage /> },
      { path: '/findings/:findingId', element: <FindingDetailPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
