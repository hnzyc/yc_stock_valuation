import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import StockValuationApp from './components/StockValuationApp';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    // 检查后端服务状态
    const checkSystemHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setSystemStatus(data);
      } catch (error) {
        console.error('系统健康检查失败:', error);
        setSystemStatus({ 
          status: 'ERROR', 
          message: '无法连接到后端服务',
          error: error.message 
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkSystemHealth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (systemStatus?.status === 'ERROR') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">系统服务异常</h1>
            <p className="text-gray-600 mb-4">{systemStatus.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="App">
          <StockValuationApp />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10B981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
          
          {/* 底部状态栏 */}
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus?.status === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>系统状态: {systemStatus?.status || 'Unknown'}</span>
              {systemStatus?.version && <span>v{systemStatus.version}</span>}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;