import React from 'react';
import { LogEntry, LogLevel } from '../types';

interface DebugConsoleProps {
  logs: LogEntry[];
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ logs }) => {
  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.INFO:
        return 'text-blue-300';
      case LogLevel.WARN:
        return 'text-yellow-300';
      case LogLevel.ERROR:
        return 'text-red-400';
      case LogLevel.SUCCESS:
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-lg p-4 mt-8 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">デバッグコンソール</h2>
      <div className="h-64 overflow-y-auto bg-gray-900 p-3 rounded-md text-sm font-mono">
        {logs.map(log => (
          <div key={log.id} className={`mb-1 ${getLogLevelColor(log.level)}`}>
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugConsole;