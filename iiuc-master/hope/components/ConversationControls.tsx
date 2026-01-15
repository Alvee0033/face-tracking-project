import React from 'react';
import { Status } from '../types';

interface ConversationControlsProps {
  status: Status;
  onToggleConversation: () => void;
}

const MicrophoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
  </svg>
);

const StopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M6 6h12v12H6z" />
  </svg>
);

const statusTextMap: Record<Status, string> = {
  [Status.IDLE]: 'Tap the mic when you\'re ready to talk.',
  [Status.CONNECTING]: 'Connecting...',
  [Status.LISTENING]: 'I\'m listening...',
  [Status.SPEAKING]: 'Hope is speaking...',
  [Status.ERROR]: 'An error occurred. Please try again.',
};

export const ConversationControls: React.FC<ConversationControlsProps> = ({ status, onToggleConversation }) => {
  const isRecording = status === Status.LISTENING || status === Status.SPEAKING;
  const isConnecting = status === Status.CONNECTING;
  
  const buttonBaseClass = `
    rounded-full p-6 transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-4
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center shadow-lg hover:shadow-xl
  `;

  const buttonColorClass = isRecording 
    ? 'bg-red-100 text-red-600 ring-red-200 hover:bg-red-200'
    : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50';

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onClick={onToggleConversation}
        disabled={isConnecting}
        className={`${buttonBaseClass} ${buttonColorClass}`}
        aria-label={isRecording ? 'Stop conversation' : 'Start conversation'}
      >
        {isRecording ? <StopIcon /> : <MicrophoneIcon />}
      </button>
      <p className="text-gray-500 font-medium text-center min-h-[1.5rem]">{statusTextMap[status]}</p>
    </div>
  );
};