import { useMutation } from '@tanstack/react-query';
import { uploadDocument } from '../api/documents';

export function useUploadDocument() {
  return useMutation({
    mutationFn: uploadDocument,
  });
}