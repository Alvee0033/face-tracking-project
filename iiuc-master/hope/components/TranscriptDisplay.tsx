import React, { useEffect, useRef } from 'react';
import { Status, TranscriptEntry } from '../types';

interface TranscriptDisplayProps {
  history: TranscriptEntry[];
  currentUserTurn: string;
  currentHopeTurn: string;
  status: Status;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ history, currentUserTurn, currentHopeTurn, status }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentUserTurn, currentHopeTurn]);

  const renderTurn = (entry: TranscriptEntry, index: number) => {
    const isHope = entry.speaker === 'Hope';
    return (
      <div key={index} className={`flex w-full ${isHope ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`flex flex-col max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isHope ? 'bg-gray-100 text-gray-800 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
          <p className="font-semibold text-sm mb-1">{entry.speaker}</p>
          <p className="text-base whitespace-pre-wrap">{entry.text}</p>
        </div>
      </div>
    );
  };
  
  const showTranscript = status !== Status.IDLE && status !== Status.ERROR;

  return (
    <div className={`flex-grow w-full overflow-y-auto p-6 transition-opacity duration-500 ${showTranscript ? 'opacity-100' : 'opacity-0'}`}>
        {history.map(renderTurn)}

        {currentUserTurn && (
          <div className="flex w-full justify-end mb-4">
            <div className="flex flex-col max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600 text-white rounded-br-none opacity-70">
              <p className="font-semibold text-sm mb-1">You</p>
              <p className="text-base whitespace-pre-wrap">{currentUserTurn}</p>
            </div>
          </div>
        )}

        {currentHopeTurn && (
          <div className="flex w-full justify-start mb-4">
            <div className="flex flex-col max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-800 rounded-bl-none opacity-70">
              <p className="font-semibold text-sm mb-1">Hope</p>
              <p className="text-base whitespace-pre-wrap">{currentHopeTurn}</p>
            </div>
          </div>
        )}

      <div ref={scrollRef} />
    </div>
  );
};
