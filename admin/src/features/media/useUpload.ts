import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentService, type MediaItemDto } from '@/sdk';

/** Uploads files one after the other; returns the stored images. */
export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const out: MediaItemDto[] = [];
      for (const file of files) out.push(await ContentService.contentControllerUpload({ formData: { file, alt: '' } }));
      return out;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['media'] }),
  });
}
