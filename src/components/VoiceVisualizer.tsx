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
        // Processing state - distinctive circular pulse animation
        const time = Date.now() * 0.004;
        const rings = 4;
        
        for (let i = 0; i < rings; i++) {
          const ringProgress = (i / rings);
          const baseRadius = 30 + (i * 20);
          
          // Create a pulsing effect that's different from recording/playing
          const pulsePhase = (time + ringProgress * Math.PI) % (Math.PI * 2);
          const pulseIntensity = (Math.sin(pulsePhase) + 1) * 0.5; // 0 to 1
          const radius = baseRadius + pulseIntensity * 15;
          
          // Processing uses a distinct color pattern
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          const alpha = (0.6 - ringProgress * 0.4) * pulseIntensity;
          
          gradient.addColorStop(0, `rgba(75, 85, 99, ${alpha * 0.8})`); // gray-600
          gradient.addColorStop(0.5, `rgba(107, 114, 128, ${alpha * 0.6})`); // gray-500
          gradient.addColorStop(1, `rgba(156, 163, 175, ${alpha * 0.2})`); // gray-400
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add subtle glow
          ctx.shadowColor = '#6B7280'; // gray-500
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
          dotGradient.addColorStop(0, `rgba(75, 85, 99, ${dotAlpha})`);
          dotGradient.addColorStop(1, `rgba(75, 85, 99, 0)`);
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = dotGradient;
          ctx.fill();
        }
        
      } else if (isRecording || isPlaying) {
        // Active state - animated circular waves
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
          
          // Create gradient based on state - using gray tones for both recording and playing
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius + waveAmplitude);
          
          if (isRecording) {
            gradient.addColorStop(0, `rgba(31, 41, 55, ${0.4 - ringProgress * 0.3})`); // gray-800
            gradient.addColorStop(0.5, `rgba(55, 65, 81, ${0.3 - ringProgress * 0.2})`); // gray-700
            gradient.addColorStop(1, `rgba(75, 85, 99, ${0.1 - ringProgress * 0.1})`); // gray-600
          } else {
            // Use slightly lighter gray for playing state
            gradient.addColorStop(0, `rgba(55, 65, 81, ${0.4 - ringProgress * 0.3})`); // gray-700
            gradient.addColorStop(0.5, `rgba(75, 85, 99, ${0.3 - ringProgress * 0.2})`); // gray-600
            gradient.addColorStop(1, `rgba(107, 114, 128, ${0.1 - ringProgress * 0.1})`); // gray-500
          }
          
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add glow effect - using gray colors for both states
          ctx.shadowColor = isRecording ? '#1F2937' : '#374151'; // gray-800 or gray-700
          ctx.shadowBlur = 15 - (ringProgress * 10);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        // Central pulse
        const pulseRadius = 15 + Math.sin(time * 2) * 5;
        const pulseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        
        if (isRecording) {
          pulseGradient.addColorStop(0, 'rgba(31, 41, 55, 0.8)'); // gray-800
          pulseGradient.addColorStop(1, 'rgba(31, 41, 55, 0)');
        } else {
          // Use gray for playing state instead of red
          pulseGradient.addColorStop(0, 'rgba(55, 65, 81, 0.8)'); // gray-700
          pulseGradient.addColorStop(1, 'rgba(55, 65, 81, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = pulseGradient;
        ctx.fill();
        
      } else {
        // Idle state - gentle ambient visualization
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
          gradient.addColorStop(0, `rgba(107, 114, 128, ${opacity * 0.5})`); // gray-500
          gradient.addColorStop(0.7, `rgba(156, 163, 175, ${opacity * 0.3})`); // gray-400
          gradient.addColorStop(1, `rgba(209, 213, 219, 0)`); // gray-300
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        
        // Subtle center dot
        const dotGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 8);
        dotGradient.addColorStop(0, 'rgba(107, 114, 128, 0.3)');
        dotGradient.addColorStop(1, 'rgba(107, 114, 128, 0)');
        
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
            ? 'bg-gray-600/15 shadow-lg shadow-gray-600/30 animate-pulse'
            : isRecording 
            ? 'bg-gray-800/10 shadow-lg shadow-gray-800/20' 
            : isPlaying
            ? 'bg-gray-700/10 shadow-lg shadow-gray-700/20'
            : 'bg-gray-100/50'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isProcessing
              ? 'bg-gray-600/20 animate-pulse'
              : isRecording 
              ? 'bg-gray-800/20 animate-pulse' 
              : isPlaying
              ? 'bg-gray-700/20 animate-pulse'
              : 'bg-gray-200/50'
          } ${(isPlaying || isProcessing) ? 'pointer-events-auto cursor-pointer' : ''}`}
          onClick={(isPlaying || isProcessing) ? onClick : undefined}>
            {isPlaying ? (
              <Square className="w-6 h-6 text-gray-700 fill-current" />
            ) : isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-700 rounded-full animate-bounce mx-1" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              <Mic className={`w-8 h-8 transition-colors duration-300 ${
                isRecording 
                  ? 'text-gray-800' 
                  : 'text-gray-500'
              }`} />
            )}
          </div>
        </div>
      </div>
      
      {/* Additional glow overlay - updated styling for all states and made clickable */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-500 cursor-pointer ${
          isProcessing
            ? 'bg-gray-600/10 shadow-xl shadow-gray-600/25 animate-pulse'
            : isRecording 
            ? 'bg-gray-800/5 shadow-2xl shadow-gray-800/20' 
            : isPlaying
            ? 'bg-gray-600/5 shadow-2xl shadow-gray-600/20'
            : 'bg-gray-800/20 shadow-lg shadow-gray-800/30 hover:bg-gray-800/30 hover:shadow-xl hover:shadow-gray-800/40'
        }`}
        onClick={onClick}
      ></div>
    </div>
  );
};