import { IconNote, IconPin } from '@aegis/ui';
import type { Note } from '@aegis/core';
import { useApp } from '../store';

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  return (
    <button type="button" className={`note-card note--${note.color}`} onClick={onClick}>
      {note.pinned && (
        <span className="note-card-pin" aria-hidden>
          <IconPin size={13} />
        </span>
      )}
      {note.title && <div className="note-card-title">{note.title}</div>}
      {note.body && <div className="note-card-body">{note.body}</div>}
      {!note.title && !note.body && <div className="note-card-body note-card-body--empty">Nota vazia</div>}
    </button>
  );
}

/** Lista de notas no estilo Keep: grade masonry, com fixadas em destaque. */
export function Notes() {
  const { vault, openNote } = useApp();
  if (!vault) return null;

  const sorted = [...vault.notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
  );
  const pinned = sorted.filter((n) => n.pinned);
  const others = sorted.filter((n) => !n.pinned);

  return (
    <div className="screen screen--scroll">
      <div className="screen-header">
        <div className="screen-title">Notas</div>
        <div className="screen-subtitle">Anotações rápidas, cifradas no seu cofre</div>
      </div>

      <div className="notes-body">
        <button type="button" className="note-new" onClick={() => openNote(null)}>
          <IconNote size={17} />
          Criar nota…
        </button>

        {pinned.length > 0 && (
          <>
            <div className="notes-label">Fixadas</div>
            <div className="notes-grid">
              {pinned.map((n) => (
                <NoteCard key={n.id} note={n} onClick={() => openNote(n.id)} />
              ))}
            </div>
          </>
        )}

        {others.length > 0 && (
          <>
            {pinned.length > 0 && <div className="notes-label">Outras</div>}
            <div className="notes-grid">
              {others.map((n) => (
                <NoteCard key={n.id} note={n} onClick={() => openNote(n.id)} />
              ))}
            </div>
          </>
        )}

        {sorted.length === 0 && (
          <div className="vault-empty">Nenhuma nota — toque em “Criar nota” para começar</div>
        )}
      </div>
    </div>
  );
}
