'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCcw, VideoOff, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

interface WebcamCaptureProps {
  onCapture: (dataUri: string | null) => void;
}

export function WebcamCapture({ onCapture }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);
  
  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      
      // Set a reasonable resolution for AI processing to avoid "Unable to process image" errors
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
        // Horizontal flip for a more natural selfie capture if using user-facing camera
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Use a slightly lower quality (0.8) to reduce payload size
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUri);
        onCapture(dataUri);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    onCapture(null);
    startCamera();
  };

  return (
    <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden relative border">
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
            <Image src={capturedImage} alt="Captured" fill className="object-cover" />
        ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        )}
        <div className="absolute bottom-4 flex justify-center gap-4">
            {capturedImage ? (
            <Button onClick={handleRetake} variant="secondary">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retake
            </Button>
            ) : (
            <Button onClick={handleCapture} disabled={!stream}>
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
            </Button>
            )}
        </div>
        {!stream && !capturedImage && !error &&
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <VideoOff className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No camera stream</p>
            </div>
        }
        </>
      )}
    </div>
  );
}