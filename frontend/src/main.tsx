import { createRoot } from 'react-dom/client'
import { App as AntdApp } from 'antd'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <AntdApp>
    <App />
  </AntdApp>,
)
