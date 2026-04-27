import React, { useState, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { supabase } from '../lib/supabase';
import { Loader, AlertCircle } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchMuxPlaybackId = async () => {
      try {
        // Get attachment details
        const { data: attachmentData, error: attachError } = await supabase
          .from('attachments')
          .select('filename')
          .eq('id', attachmentId)
          .single();

        if (attachError || !attachmentData?.filename) {
          console.warn('[MuxPlayer] Attachment not found:', attachmentId, attachError);
          if (isMounted) {
            setStatus('fallback');
            setErrorMsg('Attachment not found');
          }
          return;
        }

        const filename = attachmentData.filename;
        console.log('[MuxPlayer] Looking for video_uploads record with filename:', filename);

        // Query video_uploads table by filename
        const { data: videoRecords, error: videoError } = await supabase
          .from('video_uploads')
          .select('playback_id, status, asset_id')
          .eq('filename', filename);

        if (videoError) {
          console.warn('[MuxPlayer] Error querying video_uploads:', videoError);
          if (isMounted) {
            if (retryCount < MAX_RETRIES) {
              setRetryCount(retryCount + 1);
              timeoutId = setTimeout(fetchMuxPlaybackId, RETRY_DELAY);
            } else {
              setStatus('fallback');
              setErrorMsg(`Query error after ${MAX_RETRIES} retries`);
            }
          }
          return;
        }

        const videoData = videoRecords?.[0];

        if (!videoData) {
          console.log('[MuxPlayer] No video_uploads record found for filename:', filename);
          if (isMounted) {
            if (retryCount < MAX_RETRIES) {
              console.log(`[MuxPlayer] Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
              setRetryCount(retryCount + 1);
              timeoutId = setTimeout(fetchMuxPlaybackId, RETRY_DELAY);
            } else {
              setStatus('fallback');
              setErrorMsg('Video processing not started');
            }
          }
          return;
        }

        console.log('[MuxPlayer] Found video record:', {
          status: videoData.status,
          has_playback_id: !!videoData.playback_id,
          asset_id: videoData.asset_id,
        });

        if (videoData.status === 'ready' && videoData.playback_id) {
          console.log('[MuxPlayer] Video is ready with playback_id:', videoData.playback_id);
          if (isMounted) {
            setPlaybackId(videoData.playback_id);
            setStatus('ready');
          }
        } else if (videoData.status === 'processing') {
          console.log('[MuxPlayer] Video still processing, checking again in 2s');
          if (isMounted) {
            setStatus('loading');
            timeoutId = setTimeout(fetchMuxPlaybackId, RETRY_DELAY);
          }
        } else {
          console.log('[MuxPlayer] Unexpected video status:', videoData.status);
          if (isMounted) {
            if (retryCount < MAX_RETRIES) {
              setRetryCount(retryCount + 1);
              timeoutId = setTimeout(fetchMuxPlaybackId, RETRY_DELAY);
            } else {
              setStatus('fallback');
              setErrorMsg(`Video status: ${videoData.status}`);
            }
          }
        }
      } catch (error) {
        console.error('[MuxPlayer] Error:', error);
        if (isMounted) {
          if (retryCount < MAX_RETRIES) {
            setRetryCount(retryCount + 1);
            timeoutId = setTimeout(fetchMuxPlaybackId, RETRY_DELAY);
          } else {
            setStatus('fallback');
            setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
    };

    fetchMuxPlaybackId();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [attachmentId, retryCount]);

  // Video is ready - use Mux Player
  if (status === 'ready' && playbackId) {
    return (
      <div className={`w-full aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
        <MuxPlayer
          playbackId={playbackId}
          streamType="on-demand"
          autoPlay={autoPlay}
          controls={controls}
          title={fileName}
          style={{
            width: '100%',
            height: '100%',
          }}
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
          <p className="text-xs text-gray-500">{retryCount > 0 ? `Retry ${retryCount}/${MAX_RETRIES}` : 'This may take a minute'}</p>
        </div>
      </div>
    );
  }

  // Fallback to B2 video player
  if (status === 'error' || status === 'fallback') {
    return (
      <div className={`w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative group overflow-hidden ${className}`}>
        {/* B2 video element */}
        <video
          src={b2Url}
          controls={controls}
          autoPlay={autoPlay}
          className="w-full h-full object-contain"
          title={fileName}
          preload="metadata"
        >
          <source src={b2Url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Badge indicating fallback status */}
        {errorMsg && (
          <div className="absolute top-2 right-2 bg-yellow-600/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MuxVideoPlayer;
