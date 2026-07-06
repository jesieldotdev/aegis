import { useRef, useState } from 'react';
import { IconChevronLeft, IconPin, IconTrash } from '@aegis/ui';
import { NOTE_COLORS, type NoteColor } from '@aegis/core';
import { useApp } from '../store';

/**
 * Editor de nota no estilo Keep: sem botão "salvar" — grava ao voltar.
 * Uma nota nova sem título nem texto é descartada.
 */
export function NoteEdit() {
  const { vault, editingNoteId, closeNote, saveNote, deleteNote } = useApp();
  const existing = editingNoteId ? vault?.notes.find((n) => n.id === editingNoteId) : undefined;

  const idRef = useRef(existing?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [color, setColor] = useState<NoteColor>(existing?.color ?? 'default');
  const [pinned, setPinned] = useState(existing?.pinned ?? false);

  const commit = () => {
    const t = title.trim();
    const b = body.replace(/\s+$/, '');
    if (!t && !b) {
      if (existing) deleteNote(existing.id); // esvaziou uma nota existente
      closeNote();
      return;
    }
    const unchanged =
      existing &&
      existing.title === t &&
      existing.body === b &&
      existing.color === color &&
      existing.pinned === pinned;
    if (!unchanged) {
      saveNote({ id: idRef.current, title: t, body: b, color, pinned, updatedAt: existing?.updatedAt ?? 0 });
    }
    closeNote();
  };

  const remove = () => {
    if (existing) {
      if (window.confirm('Excluir esta nota?')) deleteNote(existing.id);
    } else {
      closeNote();
    }
  };

  return (
    <div className={`screen screen--scroll screen--slide note-edit note--${color}`}>
      <div className="detail-nav">
        <button type="button" className="icon-btn" onClick={commit} aria-label="Voltar e salvar">
          <IconChevronLeft size={19} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className={`icon-btn${pinned ? ' icon-btn--active' : ''}`}
          onClick={() => setPinned((p) => !p)}
          aria-label={pinned ? 'Desafixar' : 'Fixar no topo'}
          title={pinned ? 'Desafixar' : 'Fixar no topo'}
        >
          <IconPin size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={remove} aria-label="Excluir nota" title="Excluir">
          <IconTrash size={18} />
        </button>
      </div>

      <div className="note-edit-body-wrap">
        <input
          className="note-edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
        />
        <textarea
          className="note-edit-text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Criar uma nota…"
          rows={8}
          autoFocus={!existing}
        />
      </div>

      <div className="note-colors">
        {NOTE_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={`note-swatch note--${c}${color === c ? ' note-swatch--active' : ''}`}
            onClick={() => setColor(c)}
            aria-label={`Cor ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
