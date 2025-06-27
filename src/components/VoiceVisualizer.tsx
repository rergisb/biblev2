import React, { useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface VoiceVisualizerProps {
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing?: boolean;
  audioLevel?: number;
  onClick?: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isRecording,
  isPlaying,
  isProcessing = false,
  audioLevel = 0,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);
      
      if (isProcessing) {
        // Processing state - distinctive circular pulse animation with red tones
        const time = Date.now() * 0.004;
        const rings = 4;
        
        for (let i = 0; i < rings; i++) {
          const ringProgress = (i / rings);
          const baseRadius = 30 + (i * 20);
          
          // Create a pulsing effect that's different from recording/playing
          const pulsePhase = (time + ringProgress * Math.PI) % (Math.PI * 2);
          const pulseIntensity = (Math.sin(pulsePhase) + 1) * 0.5; // 0 to 1
          const radius = baseRadius + pulseIntensity * 15;
          
          // Processing uses red color pattern
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          const alpha = (0.6 - ringProgress * 0.4) * pulseIntensity;
          
          gradient.addColorStop(0, `rgba(185, 28, 28, ${alpha * 0.8})`); // red-700
          gradient.addColorStop(0.5, `rgba(220, 38, 38, ${alpha * 0.6})`); // red-600
          gradient.addColorStop(1, `rgba(248, 113, 113, ${alpha * 0.2})`); // red-400
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add subtle glow
          ctx.shadowColor = '#DC2626'; // red-600
          ctx.shadowBlur = 10 - (ringProgress * 5);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        // Central processing indicator - rotating dots
        const dotCount = 8;
        const dotRadius = 40;
        const rotationSpeed = time * 2;
        
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * Math.PI * 2 + rotationSpeed;
          const dotX = centerX + Math.cos(angle) * dotRadius;
          const dotY = centerY + Math.sin(angle) * dotRadius;
          
          const dotSize = 3 + Math.sin(time * 3 + i) * 2;
          const dotAlpha = 0.4 + Math.sin(time * 2 + i * 0.5) * 0.3;
          
          const dotGradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotSize);
          dotGradient.addColorStop(0, `rgba(185, 28, 28, ${dotAlpha})`);
          dotGradient.addColorStop(1, `rgba(185, 28, 28, 0)`);
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = dotGradient;
          ctx.fill();
        }
        
      } else if (isRecording || isPlaying) {
        // Active state - animated circular waves with red tones
        const time = Date.now() * 0.003;
        const rings = 5;
        
        for (let i = 0; i < rings; i++) {
          const ringProgress = (i / rings);
          const baseRadius = 40 + (i * 25);
          const waveAmplitude = (audioLevel * 20 + 5) * (1 - ringProgress * 0.3);
          
          // Create wave effect
          const points = 64;
          ctx.beginPath();
          
          for (let j = 0; j <= points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const wave1 = Math.sin(angle * 3 + time + ringProgress * 2) * waveAmplitude * 0.3;
            const wave2 = Math.sin(angle * 5 - time * 1.5 + ringProgress * 3) * waveAmplitude * 0.2;
            const wave3 = Math.sin(angle * 7 + time * 0.8 + ringProgress * 4) * waveAmplitude * 0.1;
            
            const radius = baseRadius + wave1 + wave2 + wave3;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (j === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.closePath();
          
          // Create gradient based on state - using red tones for both recording and playing
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius + waveAmplitude);
          
          if (isRecording) {
            gradient.addColorStop(0, `rgba(153, 27, 27, ${0.4 - ringProgress * 0.3})`); // red-800
            gradient.addColorStop(0.5, `rgba(185, 28, 28, ${0.3 - ringProgress * 0.2})`); // red-700
            gradient.addColorStop(1, `rgba(220, 38, 38, ${0.1 - ringProgress * 0.1})`); // red-600
          } else {
            // Use slightly lighter red for playing state
            gradient.addColorStop(0, `rgba(185, 28, 28, ${0.4 - ringProgress * 0.3})`); // red-700
            gradient.addColorStop(0.5, `rgba(220, 38, 38, ${0.3 - ringProgress * 0.2})`); // red-600
            gradient.addColorStop(1, `rgba(248, 113, 113, ${0.1 - ringProgress * 0.1})`); // red-400
          }
          
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add glow effect - using red colors for both states
          ctx.shadowColor = isRecording ? '#991B1B' : '#DC2626'; // red-800 or red-600
          ctx.shadowBlur = 15 - (ringProgress * 10);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        // Central pulse
        const pulseRadius = 15 + Math.sin(time * 2) * 5;
        const pulseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        
        if (isRecording) {
          pulseGradient.addColorStop(0, 'rgba(153, 27, 27, 0.8)'); // red-800
          pulseGradient.addColorStop(1, 'rgba(153, 27, 27, 0)');
        } else {
          // Use red for playing state
          pulseGradient.addColorStop(0, 'rgba(185, 28, 28, 0.8)'); // red-700
          pulseGradient.addColorStop(1, 'rgba(185, 28, 28, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = pulseGradient;
        ctx.fill();
        
      } else {
        // Idle state - gentle ambient visualization with subtle red tones
        const time = Date.now() * 0.001;
        const rings = 3;
        
        for (let i = 0; i < rings; i++) {
          const ringProgress = (i / rings);
          const baseRadius = 60 + (i * 30);
          const opacity = 0.1 - (ringProgress * 0.05);
          
          // Gentle breathing effect
          const breathe = Math.sin(time + ringProgress * 2) * 0.1 + 0.9;
          const radius = baseRadius * breathe;
          
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, `rgba(248, 113, 113, ${opacity * 0.5})`); // red-400
          gradient.addColorStop(0.7, `rgba(252, 165, 165, ${opacity * 0.3})`); // red-300
          gradient.addColorStop(1, `rgba(254, 202, 202, 0)`); // red-200
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        
        // Subtle center dot
        const dotGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 8);
        dotGradient.addColorStop(0, 'rgba(248, 113, 113, 0.3)');
        dotGradient.addColorStop(1, 'rgba(248, 113, 113, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = dotGradient;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPlaying, isProcessing, audioLevel]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-72 h-72 rounded-full"
        style={{ filter: 'blur(0.5px)' }}
      />
      
      {/* Central Status Indicator with Microphone Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
          isProcessing
            ? 'bg-red-600/15 shadow-lg shadow-red-600/30 animate-pulse'
            : isRecording 
            ? 'bg-red-800/10 shadow-lg shadow-red-800/20' 
            : isPlaying
            ? 'bg-red-700/10 shadow-lg shadow-red-700/20'
            : 'bg-red-100/50'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
            isProcessing
              ? 'bg-red-800 border-white animate-pulse'
              : isRecording 
              ? 'bg-red-800 border-white animate-pulse' 
              : isPlaying
              ? 'bg-red-600 border-red-300 animate-pulse'
              : 'bg-red-800 border-white'
          } ${(isPlaying || isProcessing) ? 'pointer-events-auto cursor-pointer' : ''}`}
          onClick={(isPlaying || isProcessing) ? onClick : undefined}>
            {isPlaying ? (
              <Square className="w-6 h-6 text-red-100 fill-current" />
            ) : isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce mx-1" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </div>
        </div>
      </div>
      
      {/* Additional glow overlay - updated styling for all states and made clickable */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-500 cursor-pointer ${
          isProcessing
            ? 'bg-red-600/10 shadow-xl shadow-red-600/25 animate-pulse'
            : isRecording 
            ? 'bg-red-800/5 shadow-2xl shadow-red-800/20' 
            : isPlaying
            ? 'bg-red-600/5 shadow-2xl shadow-red-600/20'
            : 'bg-red-800/20 shadow-lg shadow-red-800/30 hover:bg-red-800/30 hover:shadow-xl hover:shadow-red-800/40'
        }`}
        onClick={onClick}
      ></div>
    </div>
  );
};