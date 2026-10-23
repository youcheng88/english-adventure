import {StrictMode,Component} from 'react';
import type {ReactNode,ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(error:Error,info:ErrorInfo){console.error('Game error',error,info.componentStack);}render(){return this.state.failed?<main className="empty"><h1>小芽需要休息一下</h1><p>發生了意外問題，已完成並儲存的學習記錄仍會保留。</p><button onClick={()=>location.reload()}>重新載入網站</button></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
