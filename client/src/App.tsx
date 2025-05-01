import React, { useState } from 'react';
import { MainLayout } from './components/layout/main-layout';
import StreamingChatApp from './StreamingChatApp';
import './components/StreamingChat/StreamingApp.css';
import './components/StreamingChat/AppToggle.css';

export function App(): React.ReactElement {
  const [useStreamingInterface, setUseStreamingInterface] = useState(false);
  
  const toggleInterface = () => {
    setUseStreamingInterface(prev => !prev);
  };

  return (
    <div className="app-container">
      <div className="interface-toggle">
        <button onClick={toggleInterface} className="toggle-button">
          {useStreamingInterface ? '切换到标准界面' : '切换到流式思考界面'}
        </button>
      </div>
      
      {useStreamingInterface ? (
        <StreamingChatApp />
      ) : (
        <MainLayout />
      )}
    </div>
  );
}

export default App;