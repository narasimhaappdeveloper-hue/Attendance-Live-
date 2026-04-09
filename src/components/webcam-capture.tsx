'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCcw, VideoOff, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Webcam access denied. Please enable camera permissions in your browser settings.");
      }
    } else {
        setError("Your browser does not support webcam access.");
    }
  }, []);

  useEffect(() => {
    if (!capturedImage) {
        startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, capturedImage, stream]);
  
  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const maxWidth = 640;
      const maxHeight = 480;
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUri);
        // Stop stream to save resources during preview
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
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
    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden relative border shadow-sm">
      {error && (
        <div className="p-4 text-center text-destructive-foreground bg-destructive rounded-lg flex flex-col items-center">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className='font-semibold'>Camera Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      {!error && (
        <>
        {capturedImage ? (
            <div className="relative w-full h-full">
                <Image src={capturedImage} alt="Captured" fill className="object-cover" />
                {isConfirmed && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                        <CheckCircle2 className="h-12 w-12 text-green-400 mb-2" />
                        <p className="font-bold">Photo Confirmed</p>
                    </div>
                )}
            </div>
        ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}

        <div className="absolute bottom-4 flex justify-center gap-4 w-full px-4">
            {capturedImage && !isConfirmed ? (
                <>
                    <Button onClick={handleRetake} variant="destructive" className="flex-1 max-w-[140px]">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </Button>
                    <Button onClick={handleConfirm} variant="default" className="flex-1 max-w-[140px] bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        OK
                    </Button>
                </>
            ) : capturedImage && isConfirmed ? (
                <Button onClick={handleRetake} variant="secondary" size="sm" className="opacity-90">
                    <RefreshCcw className="mr-2 h-3 w-3" />
                    Change Photo
                </Button>
            ) : (
                <Button onClick={handleCapture} disabled={!stream} className="px-8 py-6 rounded-full shadow-xl">
                    <Camera className="mr-2 h-5 w-5" />
                    Capture Photo
                </Button>
            )}
        </div>

        {!stream && !capturedImage && !error &&
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <VideoOff className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Initializing camera...</p>
            </div>
        }
        </>
      )}
    </div>
  );
}
