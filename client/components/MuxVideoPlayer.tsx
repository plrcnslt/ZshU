import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, Play, AlertCircle } from 'lucide-react';

// Load HLS.js library for HLS stream support
const loadHlsJs = async () => {
  if (typeof window !== 'undefined' && !(window as any).Hls) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    return new Promise<void>((resolve) => {
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
};

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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize HLS player when video is ready
  useEffect(() => {
    if (status !== 'ready' || !playbackId || !videoRef.current) return;

    const initHls = async () => {
      await loadHlsJs();
      const Hls = (window as any).Hls;

      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        console.log('[MuxPlayer] Initializing HLS stream:', hlsUrl);
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
        return () => hls.destroy();
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        videoRef.current.src = `https://stream.mux.com/${playbackId}.m3u8`;
      }
    };

    initHls();
  }, [status, playbackId]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkMuxStatus = async () => {
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

        // Query video_uploads table
        const { data: videoRecords, error: videoError } = await supabase
          .from('video_uploads')
          .select('playback_id, status, asset_id')
          .eq('filename', filename);

        if (videoError) {
          console.warn('[MuxPlayer] Error querying video_uploads:', videoError);
          if (isMounted) {
            setStatus('fallback');
            setErrorMsg(`Query error: ${videoError.message}`);
          }
          return;
        }

        const videoData = videoRecords?.[0];

        if (!videoData) {
          console.log('[MuxPlayer] No video_uploads record found for filename:', filename);
          if (isMounted) {
            setStatus('fallback');
            setErrorMsg('Video processing not started');
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
          console.log('[MuxPlayer] Video still processing, checking again in 3s');
          if (isMounted) {
            setStatus('loading');
            timeoutId = setTimeout(checkMuxStatus, 3000);
          }
        } else {
          console.log('[MuxPlayer] Video status:', videoData.status);
          if (isMounted) {
            setStatus('loading');
            timeoutId = setTimeout(checkMuxStatus, 2000);
          }
        }
      } catch (error) {
        console.error('[MuxPlayer] Error:', error);
        if (isMounted) {
          setStatus('fallback');
          setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    };

    checkMuxStatus();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [attachmentId]);

  // Video is ready - use Mux HLS stream with HLS.js
  if (status === 'ready' && playbackId) {
    return (
      <div className={`w-full aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
        {/*
          Video element will be populated by HLS.js or native HLS support
        */}
        <video
          ref={videoRef}
          controls={controls}
          autoPlay={autoPlay}
          className="w-full h-full object-contain"
          title={fileName}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
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
          <p className="text-xs text-gray-500">This may take a minute</p>
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
