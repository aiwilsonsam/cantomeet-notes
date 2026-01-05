import { useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { TranscriptSegment, Speaker } from '@/types';

interface TranscriptViewProps {
  segments: TranscriptSegment[];
  participants: Speaker[];
  highlightedId: string | null;
}

export const TranscriptView = ({ segments, participants, highlightedId }: TranscriptViewProps) => {
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const getSpeaker = (id: string) => participants.find((p) => p.id === id);
  
  // Create a map of speaker IDs to default names if not found in participants
  const getSpeakerName = (speakerId: string, speaker: Speaker | undefined) => {
    if (speaker?.name) {
      return speaker.name;
    }
    // Generate a default name based on speaker ID or index
    // Try to extract a number from the ID, or use a hash
    const match = speakerId.match(/\d+/);
    const index = match ? parseInt(match[0], 10) : speakerId.charCodeAt(0) % 10;
    return `Speaker ${index + 1}`;
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
    <div className="h-full overflow-y-auto p-6 bg-white border-r border-slate-200">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700">逐字稿 Transcript</h3>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Cantonese / English</span>
      </div>

      <div className="space-y-6">
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
                className={`flex gap-4 transition-colors duration-500 rounded-lg p-2 -ml-2 ${
                  isHighlighted ? 'bg-yellow-50' : ''
                }`}
              >
                {speaker?.avatar ? (
                  <img
                    src={speaker.avatar}
                    alt={speaker?.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-1"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={20} className="text-slate-500" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-sm">{getSpeakerName(seg.speakerId, speaker)}</span>
                    <span className="text-xs text-slate-400">{seg.timestamp}</span>
                  </div>
                  <div className="text-slate-700 leading-relaxed text-[15px]">{seg.text}</div>
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
      <div className="h-20"></div>
    </div>
  );
};

