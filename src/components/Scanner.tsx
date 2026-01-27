import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle } from 'lucide-react';

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<number>();
  const lastScanRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready before starting loop
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             requestRef.current = requestAnimationFrame(scanFrame);
          };
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setError("Unable to access camera. Please ensure permissions are granted and you are using HTTPS.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR (global) to find code
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && code.data.trim().length > 0) {
            // Debounce: reject scans within 500ms of each other
            const now = Date.now();
            if (now - lastScanRef.current < 500) {
              requestRef.current = requestAnimationFrame(scanFrame);
              return;
            }
            lastScanRef.current = now;

            // Draw a box around it for feedback
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#22c55e"; // Green
            const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
            ctx.moveTo(topLeftCorner.x, topLeftCorner.y);
            ctx.lineTo(topRightCorner.x, topRightCorner.y);
            ctx.lineTo(bottomRightCorner.x, bottomRightCorner.y);
            ctx.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
            ctx.lineTo(topLeftCorner.x, topLeftCorner.y);
            ctx.stroke();

            // Vibrate device if supported for feedback
            if (navigator.vibrate) navigator.vibrate(200);
            
            // Stop scanning and return data
            onScan(code.data);
            return; 
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
        <h2 className="text-white font-semibold text-lg drop-shadow-md">Scan QR Code</h2>
        <button 
          onClick={onClose}
          className="bg-white/20 backdrop-blur-sm p-2 rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {error ? (
           <div className="text-white text-center p-6 bg-red-900/50 rounded-lg m-4 border border-red-500/50">
             <AlertTriangle className="mx-auto mb-2 text-red-400" size={32} />
             <p>{error}</p>
           </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover" 
              playsInline 
              muted 
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full hidden" />
            
            {/* Visual Guide Overlay */}
            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                 <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-500 -mt-1 -ml-1"></div>
                 <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-500 -mt-1 -mr-1"></div>
                 <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-500 -mb-1 -ml-1"></div>
                 <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-500 -mb-1 -mr-1"></div>
                 
                 <div className="absolute inset-0 flex items-center justify-center">
                   <p className="text-white/80 text-sm font-medium animate-pulse">Align QR code</p>
                 </div>
               </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-black/80 text-white p-4 text-center text-sm">
        Point camera at a resume QR code
      </div>
    </div>
  );
};

export default Scanner;
