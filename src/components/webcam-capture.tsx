'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCcw, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface WebcamCaptureProps {
  onCapture: (dataUri: string | null) => void;
}

export function WebcamCapture({ onCapture }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Webcam access denied. Please enable camera permissions.');
      }
    } else {
      setError('Your browser does not support webcam access.');
    }
  }, []);

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, capturedImage]);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      
      // Auto resize photo to save storage space (480px width is perfect for AI and small file size)
      const targetWidth = 480;
      const originalWidth = videoRef.current.videoWidth || 640;
      const originalHeight = videoRef.current.videoHeight || 480;
      const targetHeight = (originalHeight / originalWidth) * targetWidth;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
        // Compressed with 0.5 quality to significantly lower file size under 30KB
        const dataUri = canvas.toDataURL('image/jpeg', 0.5);
        setCapturedImage(dataUri);

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsConfirmed(false);
    onCapture(null);
    startCamera();
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="w-full aspect-video bg-black rounded-xl flex items-center justify-center overflow-hidden relative border-4 border-white shadow-2xl">
      {error && (
        <div className="p-6 text-center text-white bg-destructive/90 backdrop-blur-md rounded-lg flex flex-col items-center max-w-xs mx-auto">
          <AlertTriangle className="h-10 w-10 mb-3" />
          <p className="font-bold text-lg">Camera Error</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      )}

      {!error && (
        <>
          {capturedImage ? (
            <div className="relative w-full h-full flex flex-col">
              <div className="relative flex-1 w-full bg-muted overflow-hidden">
                <Image
                  src={capturedImage}
                  alt="Captured Preview"
                  fill
                  className="object-cover"
                  priority
                />
                {isConfirmed && (
                  <div className="absolute inset-0 bg-green-600/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-300">
                    <div className="bg-white p-3 rounded-full mb-3 shadow-xl">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <p className="font-bold text-xl drop-shadow-md">Photo Confirmed!</p>
                  </div>
                )}
              </div>

              {!isConfirmed && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6 z-20">
                  <Button
                    onClick={handleRetake}
                    variant="destructive"
                    className="h-14 flex-1 max-w-[160px] text-lg rounded-full shadow-2xl border-2 border-white/20"
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Delete
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="h-14 flex-1 max-w-[160px] text-lg rounded-full bg-green-600 hover:bg-green-700 shadow-2xl border-2 border-white/20"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    OK
                  </Button>
                </div>
              )}

              {isConfirmed && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                  <Button
                    onClick={handleRetake}
                    variant="outline"
                    className="bg-white/90 backdrop-blur-md text-primary hover:bg-white rounded-full px-6 shadow-xl"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Retake Photo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                <Button
                  onClick={handleCapture}
                  disabled={!stream}
                  className="h-20 w-20 rounded-full bg-white text-primary hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.5)] border-4 border-primary transition-transform active:scale-90"
                >
                  <Camera className="h-10 w-10" />
                </Button>
              </div>

              {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                  <p className="text-white font-medium">Initializing Camera...</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
