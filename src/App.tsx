import React, { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import DebugConsole from './components/DebugConsole';
import PostUploadInfo from './components/PostUploadInfo';
import { LogEntry, LogLevel } from './types';

const App: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      level: LogLevel.INFO,
      message: 'デバッガーの準備ができました。動画ファイルを選択し、「アップロードを試行」ボタンを押してください。',
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [postUploadStatus, setPostUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [postUploadPayload, setPostUploadPayload] = useState<object>({});
  const [postUploadError, setPostUploadError] = useState<string | undefined>(undefined);

  const addLog = useCallback((level: LogLevel, message: string) => {
    setLogs(prevLogs => [
      ...prevLogs,
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ]);
  }, []);

  const handleUploadAttempt = async (file: File) => {
    setIsUploading(true);
    setPostUploadStatus('idle');
    addLog(LogLevel.INFO, `ファイル「${file.name}」(${Math.round(file.size / 1024)} KB) のアップロードを開始します。`);
    
    // Firebase Storageのバケット名は通常 <project-id>.appspot.com です
    const bucketName = 'aikaapp-584fa.appspot.com';
    const objectName = `uploads/${Date.now()}-${file.name}`;
    const uploadUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
    
    addLog(LogLevel.INFO, `Firebase Storageの正しいバケット名は「${bucketName}」であると想定しています。`);
    addLog(LogLevel.INFO, `Step 1: GCSへ直接アップロードを試行します。
宛先URL: ${uploadUrl}`);

    try {
      // シンプルなPUTリクエストでCORSプリフライトリクエストをトリガーします
      // ここでCORSエラーが発生することが期待されます
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`アップロードはサーバーに到達しましたが、エラーが返されました。 Status: ${response.status}. Body: ${errorText}`);
      }

      addLog(LogLevel.SUCCESS, `Step 1: GCSへのアップロードに成功しました！これは予期せぬ結果です。CORS設定が正しい可能性があります。`);
      
      // --- Step 2: Simulate API call ---
       const payload = {
          userId: "simulated-user-id",
          videoUrl: uploadUrl,
          timestamp: new Date().toISOString(),
       };
       setPostUploadPayload(payload);
       setPostUploadStatus('loading');
       addLog(LogLevel.INFO, `Step 2: サーバーへのAPI呼び出しをシミュレートします...`);

       await new Promise(res => setTimeout(res, 1500));
       
       setPostUploadStatus('success');
       addLog(LogLevel.SUCCESS, `Step 2: API呼び出し成功！`);

    } catch (error: any) {
      addLog(LogLevel.ERROR, 'GCSへのアップロードリクエストが失敗しました。ブラウザの開発者コンソールにもCORS関連のエラーが表示されているか確認してください。');
      
      let errorMessage = '不明なエラーです。';
      if (error instanceof Error) {
        errorMessage = `エラータイプ: ${error.name}\nメッセージ: ${error.message}\n\n[解説]\n"${error.message}" というメッセージは、ブラウザがCORSポリシー違反を検知し、リクエスト自体をブロックした場合に典型的に表示されます。これがGCSの門番が怒っている証拠です。`;
      } else {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = String(error);
        }
      }
      addLog(LogLevel.ERROR, `[キャッチされたエラーの詳細]\n${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-2xl text-center mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          GCS CORS デバッガー
        </h1>
        <p className="text-gray-400">
          LINEアプリ内ブラウザからのGCSへの直接アップロードをシミュレートし、CORSエラーをコンソールに表示します。
        </p>
      </div>

      <FileUploader onUploadAttempt={handleUploadAttempt} isUploading={isUploading} onFileSelect={setSelectedFile} />

      {postUploadStatus !== 'idle' && (
        <PostUploadInfo 
          status={postUploadStatus} 
          payload={postUploadPayload} 
          errorDetails={postUploadError}
        />
      )}

      <DebugConsole logs={logs} />
    </div>
  );
};

export default App;
