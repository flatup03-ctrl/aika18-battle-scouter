import React from 'react';

interface PostUploadInfoProps {
  payload: object;
  status: 'loading' | 'success' | 'error';
  errorDetails?: string;
}

const StatusIndicator: React.FC<{ status: PostUploadInfoProps['status'] }> = ({ status }) => {
  if (status === 'loading') {
    return (
      <div className="flex items-center text-blue-400">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>API呼び出し中...</span>
      </div>
    );
  }
  if (status === 'success') {
    return <div className="text-green-500 font-bold">✓ 成功</div>;
  }
  if (status === 'error') {
    return <div className="text-red-500 font-bold">✗ 失敗</div>;
  }
  return null;
};

const PostUploadInfo: React.FC<PostUploadInfoProps> = ({ payload, status, errorDetails }) => {
  return (
    <div className="w-full max-w-2xl mt-8 text-left bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-gray-200">Step 2: スプレッドシートAPIへの連携</h2>
      <p className="text-gray-400 mb-4">GCSへのアップロード成功後、以下のデータをサーバーの `\/api\/spreadsheet` へ送信しています。`page.tsx` でも同様のデータ構造を送信してください。</p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-1">API呼び出しステータス:</label>
        <StatusIndicator status={status} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">送信ペイロード (JSON):</label>
        <pre className="bg-black bg-opacity-50 text-white p-4 rounded-md text-xs overflow-x-auto">
          <code>
            {JSON.stringify(payload, null, 2)}
          </code>
        </pre>
      </div>
      
      {status === 'error' && errorDetails && (
         <div>
          <label className="block text-sm font-medium text-red-400 mt-4 mb-1">エラー詳細:</label>
          <pre className="bg-red-900 bg-opacity-30 text-red-300 p-4 rounded-md text-xs overflow-x-auto">
            <code>
              {errorDetails}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default PostUploadInfo;