import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsage, uploadData, deleteUsage } from '@/lib/api'
export function useUsageData() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUploadData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => uploadData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

export function useDeleteData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}
