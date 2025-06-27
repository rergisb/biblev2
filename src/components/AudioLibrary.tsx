import React, { useState } from 'react';
import { Music, Upload, Play, Pause, Trash2, Volume2 } from 'lucide-react';
import { AudioUploader } from './AudioUploader';

interface AudioFile {
  id: string;
  name: string;
  file: File;
  url: string;
  uploadedAt: Date;
}

interface AudioLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAudio?: (audioFile: AudioFile) => void;
}

export const AudioLibrary: React.FC<AudioLibraryProps> = ({
  isOpen,
  onClose,
  onSelectAudio
}) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const handleAudioUploaded = (file: File, url: string) => {
    const newAudioFile: AudioFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      url,
      uploadedAt: new Date()
    };

    setAudioFiles(prev => [newAudioFile, ...prev]);
    setShowUploader(false);
  };

  const handleDeleteAudio = (id: string) => {
    const audioFile = audioFiles.find(f => f.id === id);
    if (audioFile) {
      URL.revokeObjectURL(audioFile.url);
    }
    setAudioFiles(prev => prev.filter(f => f.id !== id));
    
    if (currentlyPlaying === id) {
      setCurrentlyPlaying(null);
    }
  };

  const handlePlayAudio = (id: string) => {
    const audioFile = audioFiles.find(f => f.id === id);
    if (!audioFile) return;

    // Stop currently playing audio
    if (currentlyPlaying && currentlyPlaying !== id) {
      const currentAudio = document.getElementById(`audio-${currentlyPlaying}`) as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    const audio = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (audio) {
      if (currentlyPlaying === id) {
        audio.pause();
        setCurrentlyPlaying(null);
      } else {
        audio.play();
        setCurrentlyPlaying(id);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-2xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audio Library</h2>
              <p className="text-sm text-gray-600">{audioFiles.length} audio files</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              <span className="text-gray-600">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showUploader ? (
            <div className="p-6">
              <AudioUploader
                onAudioUploaded={handleAudioUploaded}
                maxSizeMB={25}
              />
            </div>
          ) : audioFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <Volume2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 text-lg mb-2">No audio files yet</p>
                <p className="text-sm text-gray-500 mb-6">Upload your first audio file to get started</p>
                <button
                  onClick={() => setShowUploader(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200 mx-auto"
                >
                  <Upload className="w-5 h-5" />
                  Upload Audio File
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto max-h-full space-y-4">
              {audioFiles.map((audioFile) => (
                <div
                  key={audioFile.id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-4 hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {audioFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Uploaded {formatDate(audioFile.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePlayAudio(audioFile.id)}
                        className={`p-2 rounded-xl transition-all duration-200 ${
                          currentlyPlaying === audioFile.id
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={currentlyPlaying === audioFile.id ? 'Pause' : 'Play'}
                      >
                        {currentlyPlaying === audioFile.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      
                      {onSelectAudio && (
                        <button
                          onClick={() => onSelectAudio(audioFile)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors duration-200 text-xs"
                        >
                          Select
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteAudio(audioFile.id)}
                        className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hidden Audio Element */}
                  <audio
                    id={`audio-${audioFile.id}`}
                    src={audioFile.url}
                    onEnded={() => setCurrentlyPlaying(null)}
                    onPause={() => setCurrentlyPlaying(null)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};