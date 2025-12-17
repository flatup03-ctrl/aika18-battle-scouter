import React, { useState, useRef } from 'react';
import { LogLevel } from '../types';

interface FileUploaderProps {
  onUploadAttempt: (file: File) => void;
  isUploading: boolean;
  onFileSelect: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadAttempt, isUploading, onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      onFileSelect(event.target.files[0]); // Call onFileSelect here
    } else {
      onFileSelect(null); // Call onFileSelect with null if no file is selected
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onUploadAttempt(selectedFile);
    }
  };
  
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full flex flex-col items-center space-y-4">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/*"
        disabled={isUploading}
      />
      <button
        onClick={handleSelectFileClick}
        disabled={isUploading}
        className="w-full max-w-xs px-6 py-3 text-lg font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedFile ? '動画を変更' : '動画ファイルを選択'}
      </button>

      {selectedFile && (
        <div className="text-center text-gray-400">
            <p>選択中: <span className="font-medium text-gray-300">{selectedFile.name}</span></p>
        </div>
      )}

      <button
        onClick={handleUploadClick}
        disabled={!selectedFile || isUploading}
        className="w-full max-w-xs px-6 py-4 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
      >
        {isUploading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            アップロード中...
          </div>
        ) : (
          'アップロードテストを実行'
        )}
      </button>
    </div>
  );
};

export default FileUploader;
