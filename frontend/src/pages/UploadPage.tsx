import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileAudio, ArrowRight, Mic, X, Layers, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/services/api/meetings';
import toast from 'react-hot-toast';

export const UploadPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [justQueuedCount, setJustQueuedCount] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!activeWorkspace) {
        throw new Error('No active workspace');
      }
      return meetingsApi.create({
        file,
        workspaceId: activeWorkspace.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', activeWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', activeWorkspace?.id] });
    },
  });

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const audioFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('audio/')
      );
      setFiles((prev) => [...prev, ...audioFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const audioFiles = Array.from(e.target.files).filter((file) => file.type.startsWith('audio/'));
      setFiles((prev) => [...prev, ...audioFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQueueTask = async () => {
    if (files.length === 0 || !activeWorkspace) return;

    try {
      // Upload all files
      const uploadedCount = files.length;
      for (const file of files) {
        await uploadMutation.mutateAsync(file);
      }

      setJustQueuedCount(uploadedCount);
      setFiles([]);
      toast.success(`${uploadedCount} file(s) uploaded successfully! Processing started.`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload files');
    }
  };

  if (justQueuedCount > 0) {
    return (
      <div className="flex-1 bg-slate-50 p-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Layers size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{justQueuedCount} Tasks Queued!</h2>
          <p className="text-slate-500 mb-8">
            Your files are being processed in the background. You can continue working or upload more files.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/app/tasks')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium shadow-lg shadow-primary-900/10"
            >
              Go to Task List
            </button>
            <button
              onClick={() => setJustQueuedCount(0)}
              className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 rounded-xl font-medium"
            >
              Upload More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-slate-900">Upload Audio</h2>
          <button onClick={() => navigate('/app')} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            {/* File Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                files.length > 0
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }`}
            >
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <p className="font-semibold text-slate-700 mb-1">Drag & Drop or Click to Upload</p>
              <p className="text-xs text-slate-500 mb-4">
                Supports .m4a, .mp3, .wav (Multiple files allowed)
              </p>
              <label className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer shadow-sm">
                Choose Files
                <input
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  multiple
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileAudio size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={handleQueueTask}
                disabled={uploadMutation.isPending || !activeWorkspace}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium shadow-lg shadow-primary-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>
                      {files.length > 1
                        ? `Start Batch Processing (${files.length} files)`
                        : 'Start Transcription'}
                    </span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-8 text-slate-400 text-xs flex items-center gap-2">
        <Mic size={12} />
        <span>Optimized for Cantonese/English mixed audio processing</span>
      </div>
    </div>
  );
};
