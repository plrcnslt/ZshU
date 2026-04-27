import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader, Play } from 'lucide-react';

interface MuxVideoPlayerProps {
  attachmentId: string;
  b2Url: string;
  fileName?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}

export const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  attachmentId,
  b2Url,
  fileName = 'Video',
  autoPlay = false,
  controls = true,
  className = '',
}) => {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'fallback'>('loading');

  useEffect(() => {
    const checkMuxStatus = async () => {
      try {
        // Query video_uploads table to find the Mux record for this attachment
        const { data: attachmentData, error: attachError } = await supabase
          .from('attachments')
          .select('filename')
          .eq('id', attachmentId)
          .single();

        if (attachError || !attachmentData) {
          setStatus('fallback');
          return;
        }

        // Find the video_uploads record by filename
        const { data: videoData, error: videoError } = await supabase
          .from('video_uploads')
          .select('playback_id, status')
          .eq('filename', attachmentData.filename)
          .single();

        if (videoError) {
          // No video_uploads record yet - Mux processing may not have started or video is still processing
          setStatus('fallback');
          return;
        }

        if (videoData?.status === 'ready' && videoData?.playback_id) {
          setPlaybackId(videoData.playback_id);
          setStatus('ready');
        } else if (videoData?.status === 'processing') {
          // Still processing - poll again in a few seconds
          setStatus('loading');
          setTimeout(checkMuxStatus, 3000);
        } else {
          // Mux record exists but playback_id not ready yet
          setStatus('loading');
          setTimeout(checkMuxStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking Mux status:', error);
        setStatus('fallback');
      }
    };

    checkMuxStatus();
  }, [attachmentId]);

  // Mux player ready - display embedded player
  if (status === 'ready' && playbackId) {
    return (
      <div className={`w-full aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={`https://mux.com/watch/${playbackId}`}
          allow="autoplay muted"
          allowFullScreen
          className="w-full h-full border-0"
          title={fileName}
        />
      </div>
    );
  }

  // Still loading/processing
  if (status === 'loading') {
    return (
      <div className={`w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-600">Processing video...</p>
        </div>
      </div>
    );
  }

  // Error or fallback to B2 player
  if (status === 'error' || status === 'fallback') {
    return (
      <div className={`w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative group overflow-hidden ${className}`}>
        {/* Video thumbnail/poster */}
        <video
          src={b2Url}
          className="w-full h-full object-cover"
          poster={`${b2Url}?preview`}
        />
        
        {/* Play button overlay */}
        <button
          onClick={(e) => {
            e.preventDefault();
            // Clicking the play button would open the video in a new context
            window.open(b2Url, '_blank');
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors cursor-pointer"
          title="Play video from B2"
        >
          <Play className="h-16 w-16 text-white fill-white" />
        </button>

        {status === 'fallback' && (
          <div className="absolute bottom-2 right-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded">
            Playing from B2
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MuxVideoPlayer;
