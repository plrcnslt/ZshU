import React, { useState, useEffect, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { supabase } from '../lib/supabase';

interface MuxVideoPlayerProps {
  attachmentId: string;
  b2Url: string;
  fileName?: string;
}

export const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  attachmentId,
  b2Url,
  fileName = 'Video',
}) => {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlaybackId = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      // Get attachment filename
      const { data: attachmentData } = await supabase
        .from('attachments')
        .select('filename')
        .eq('id', attachmentId)
        .single();

      if (!attachmentData?.filename) {
        setIsLoading(false);
        return;
      }

      // Get video_uploads record
      const { data: videoRecords } = await supabase
        .from('video_uploads')
        .select('playback_id, status')
        .eq('filename', attachmentData.filename)
        .single();

      if (videoRecords?.playback_id && videoRecords.status === 'ready') {
        setPlaybackId(videoRecords.playback_id);
        setIsLoading(false);
      } else if (videoRecords?.status === 'processing' && retryCount < MAX_RETRIES) {
        // Retry after delay
        setTimeout(() => fetchPlaybackId(retryCount + 1), 1500);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
    }
  }, [attachmentId]);

  useEffect(() => {
    fetchPlaybackId();
  }, [attachmentId, fetchPlaybackId]);

  // Mux player ready
  if (playbackId) {
    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <MuxPlayer
          playbackId={playbackId}
          streamType="on-demand"
          controls
          title={fileName}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  // Loading or fallback to B2
  if (isLoading) {
    return (
      <div className="w-full aspect-video bg-gray-200 rounded-lg animate-pulse" />
    );
  }

  // B2 fallback
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={b2Url}
        controls
        className="w-full h-full object-contain"
        title={fileName}
      />
    </div>
  );
};

export default MuxVideoPlayer;
