import { createContext, useContext } from 'react';
import { initialCategories } from '../domain/categories';

export const CategoryContext = createContext(initialCategories());
export function useCategories() {
  return useContext(CategoryContext).filter(
    (category) => category.replacementId === null,
  );
}
