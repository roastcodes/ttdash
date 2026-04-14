import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsage, uploadData, deleteUsage } from '@/lib/api'

/** Loads usage data from the local API with React Query caching. */
export function useUsageData() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    staleTime: 1000 * 60 * 5,
  })
}

/** Uploads usage data and refreshes the cached usage query. */
export function useUploadData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => uploadData(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

/** Deletes stored usage data and refreshes the cached usage query. */
export function useDeleteData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUsage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}
