import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fixesApi, pullRequestsApi, reportsApi, scansApi } from '@/api'
import type { FindingFilters, ScanStatus } from '@/types/api'

const DONE: ScanStatus[] = ['completed', 'failed']

export function useCreateScan() {
  return useMutation({ mutationFn: scansApi.create })
}

export function useScan(scanId: number) {
  return useQuery({ queryKey: ['scan', scanId], queryFn: () => scansApi.get(scanId) })
}

/** 스캔이 끝날 때까지 1.5초마다 진행률을 폴링한다. */
export function useScanProgress(scanId: number) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['scan', scanId, 'progress'],
    queryFn: async () => {
      const progress = await scansApi.progress(scanId)
      if (DONE.includes(progress.status)) {
        queryClient.invalidateQueries({ queryKey: ['scan', scanId], exact: true })
      }
      return progress
    },
    refetchInterval: (query) => (query.state.data && DONE.includes(query.state.data.status) ? false : 1500),
  })
}

export function useReport(scanId: number, enabled = true) {
  return useQuery({ queryKey: ['report', scanId], queryFn: () => reportsApi.report(scanId), enabled })
}

export function useFindings(scanId: number, filters: FindingFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['findings', scanId, filters],
    queryFn: () => reportsApi.findings(scanId, filters),
    enabled,
  })
}

export function useFinding(findingId: number) {
  return useQuery({ queryKey: ['finding', findingId], queryFn: () => reportsApi.finding(findingId) })
}

export function useFixes(findingId: number) {
  return useQuery({ queryKey: ['fixes', findingId], queryFn: () => fixesApi.list(findingId) })
}

export function useRequestFix(findingId: number) {
  return useMutation({ mutationFn: () => fixesApi.request(findingId) })
}

export function usePullRequests(scanId: number) {
  return useQuery({ queryKey: ['pull-requests', scanId], queryFn: () => pullRequestsApi.list(scanId) })
}

export function useCreatePullRequest(scanId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fixIds: number[]) => pullRequestsApi.create(scanId, fixIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pull-requests', scanId] }),
  })
}
