import { useState, type FormEvent } from 'react';
import { activeCategories, validateCategoryName, type Category } from '../domain/categories';
import type { AppState } from '../domain/state';
import type { PlannerAction } from '../domain/commands';
import Dialog from './Dialog';

type CategoryEditor = { kind: 'add' } | { kind: 'rename' | 'remove'; category: Category };
function CategoryForm({ editor, state, dispatch, onClose }: { editor: CategoryEditor; state: AppState; dispatch: (action: PlannerAction) => boolean; onClose: () => void }) {
  const [name, setName] = useState(editor.kind === 'add' ? '' : editor.category.name);
  const choices = activeCategories(state.categories).filter(category => editor.kind === 'add' || category.id !== editor.category.id);
  const [replacement, setReplacement] = useState(choices[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      let action: PlannerAction;
      if (editor.kind === 'remove') action = { kind: 'removeCategory', categoryId: editor.category.id, previous: editor.category.name, replacementId: replacement };
      else {
        const trimmed = validateCategoryName(state.categories, name, editor.kind === 'rename' ? editor.category.id : undefined);
        action = editor.kind === 'add' ? { kind: 'createCategory', categoryId: crypto.randomUUID(), name: trimmed } : { kind: 'renameCategory', categoryId: editor.category.id, previous: editor.category.name, name: trimmed };
      }
      if (dispatch(action)) onClose();
      else setError('This category changed. Close this dialog and review the current categories before trying again.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the category name.'); }
  }
  return <Dialog title={editor.kind === 'add' ? 'Add category' : editor.kind === 'rename' ? 'Rename category' : 'Remove category'} onClose={onClose}>
    <form className="task-form" onSubmit={submit}>
      {editor.kind === 'remove' ? <><p>Move every task in <b>{editor.category.name}</b>, including completed and repeating tasks, to another category. Your dates and earned coins stay the same.</p><label>Replacement category<select data-autofocus value={replacement} onChange={event => setReplacement(event.target.value)}>{choices.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></> : <label>Category name<input data-autofocus required maxLength={40} value={name} onChange={event => setName(event.target.value)} /></label>}
      {error && <p role="alert" className="danger-text">{error}</p>}
      <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{editor.kind === 'remove' ? 'Move tasks and remove' : 'Save category'}</button></div>
    </form>
  </Dialog>;
}
export default function CategoryManager({ state, dispatch }: { state: AppState; dispatch: (action: PlannerAction) => boolean }) {
  const [editor, setEditor] = useState<CategoryEditor | null>(null);
  const categories = activeCategories(state.categories);
  return <section className="settings-section category-manager"><div className="section-heading"><h3>Manage categories</h3><button className="secondary-button" onClick={() => setEditor({ kind: 'add' })}>Add category</button></div>
    <p>Make categories your own. General and All categories are permanent task views.</p>
    <ul className="category-list">{categories.map(category => <li key={category.id}><span>{category.name}</span><div className="settings-actions"><button className="text-button" aria-label={`Rename ${category.name}`} onClick={() => setEditor({ kind: 'rename', category })}>Rename</button><button className="text-button danger-text" disabled={categories.length === 1} aria-label={`Remove ${category.name}`} onClick={() => setEditor({ kind: 'remove', category })}>Remove</button></div></li>)}</ul>
    {categories.length === 1 && <p className="field-hint">Keep at least one category for your tasks.</p>}
    {editor && <CategoryForm editor={editor} state={state} dispatch={dispatch} onClose={() => setEditor(null)} />}
  </section>;
}
