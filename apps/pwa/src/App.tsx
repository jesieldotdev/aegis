import { useApp } from './store';
import { Onboarding } from './screens/Onboarding';
import { Lock } from './screens/Lock';
import { Vault } from './screens/Vault';
import { Detail } from './screens/Detail';
import { EditItem } from './screens/EditItem';
import { AddToken } from './screens/AddToken';
import { EditToken } from './screens/EditToken';
import { MasterPassword } from './screens/MasterPassword';
import { Authenticator } from './screens/Authenticator';
import { Notes } from './screens/Notes';
import { NoteEdit } from './screens/NoteEdit';
import { Generator } from './screens/Generator';
import { Settings } from './screens/Settings';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';

export function App() {
  const { phase, tab, detailId, editingId, editingNoteId, addingToken, editingTokenId, passwordScreen } = useApp();

  return (
    <div className="app">
      <div className="app-glow" aria-hidden />
      {phase === 'onboarding' && <Onboarding />}
      {phase === 'locked' && <Lock />}
      {phase === 'unlocked' && (
        <div className="app-body">
          {passwordScreen ? (
            <MasterPassword key={passwordScreen} />
          ) : editingId !== undefined ? (
            <EditItem />
          ) : editingNoteId !== undefined ? (
            <NoteEdit />
          ) : editingTokenId ? (
            <EditToken key={editingTokenId} />
          ) : addingToken ? (
            <AddToken />
          ) : detailId ? (
            <Detail />
          ) : (
            <>
              {tab === 'vault' && <Vault />}
              {tab === '2fa' && <Authenticator />}
              {tab === 'notes' && <Notes />}
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
