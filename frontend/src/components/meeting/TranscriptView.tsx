import { useEffect, useRef } from 'react';
import { Copy } from 'lucide-react';
import { TranscriptSegment, Speaker } from '@/types';
import toast from 'react-hot-toast';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  participants: Speaker[];
  highlightedId: string | null;
  transcriptContent?: string | null;
}

export const TranscriptView = ({ segments, participants, highlightedId, transcriptContent }: TranscriptViewProps) => {
  const handleCopyTranscript = async () => {
    const text = transcriptContent || '';
    if (!text) {
      toast.error('暂无转录内容可复制');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制转录内容');
    } catch {
      toast.error('复制失败');
    }
  };
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const getSpeaker = (id: string) => participants.find((p) => p.id === id);

  const getSpeakerName = (speakerId: string, speaker: Speaker | undefined) => {
    if (speaker?.name && speaker.name !== 'Unknown' && !/^Speaker\s+(?:\d+|\w+)$/.test(speaker.name)) {
      return speaker.name;
    }
    return 'Speaker';
  };

  const getAvatarUrl = (speakerId: string, speaker: Speaker | undefined) => {
    const name = getSpeakerName(speakerId, speaker);
    if (speaker?.avatar && speaker.avatar.startsWith('http')) return speaker.avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=64748b&color=fff&size=64`;
  };

  // Auto-scroll when highlightedId changes
  useEffect(() => {
    if (highlightedId && scrollRefs.current[highlightedId]) {
      scrollRefs.current[highlightedId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedId]);

  return (
    <div className="h-full overflow-y-auto p-4 bg-white border-r border-slate-200">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">逐字稿 Transcript</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyTranscript}
            disabled={!transcriptContent}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="复制转录全文"
          >
            <Copy size={14} />
          </button>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Cantonese / English</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {segments.length > 0 ? (
          segments.map((seg) => {
            const speaker = getSpeaker(seg.speakerId);
            const isHighlighted = seg.id === highlightedId;

            return (
              <div
                key={seg.id}
                ref={(el) => {
                  scrollRefs.current[seg.id] = el;
                }}
                className={`flex gap-2.5 transition-colors duration-500 rounded-md py-1.5 px-1.5 -mx-1.5 ${
                  isHighlighted ? 'bg-yellow-50' : ''
                }`}
              >
                <img
                  src={getAvatarUrl(seg.speakerId, speaker)}
                  alt={getSpeakerName(seg.speakerId, speaker)}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getSpeakerName(seg.speakerId, speaker))}&background=64748b&color=fff`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-slate-900 text-xs">{getSpeakerName(seg.speakerId, speaker)}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{seg.timestamp}</span>
                  </div>
                  <div className="text-slate-700 leading-snug text-[14px]">{seg.text}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p>No transcript available yet.</p>
            <p className="text-sm mt-2">Transcript will appear here once processing is complete.</p>
          </div>
        )}
      </div>

      {/* Spacer for bottom scrolling */}
      <div className="h-8"></div>
    </div>
  );
};

