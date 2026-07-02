import { useApp } from './store';
import { Lock } from './screens/Lock';
import { Vault } from './screens/Vault';
import { Detail } from './screens/Detail';
import { Authenticator } from './screens/Authenticator';
import { Generator } from './screens/Generator';
import { Settings } from './screens/Settings';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';

export function App() {
  const { locked, tab, detailId } = useApp();

  return (
    <div className="app">
      <div className="app-glow" aria-hidden />
      {locked ? (
        <Lock />
      ) : (
        <div className="app-body">
          {detailId ? (
            <Detail />
          ) : (
            <>
              {tab === 'vault' && <Vault />}
              {tab === '2fa' && <Authenticator />}
              {tab === 'gen' && <Generator />}
              {tab === 'settings' && <Settings />}
              <TabBar />
            </>
          )}
        </div>
      )}
      <Toast />
    </div>
  );
}
