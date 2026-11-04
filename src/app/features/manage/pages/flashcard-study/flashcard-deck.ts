import {
  FlashcardCategory,
  ListFlashcardsQuery,
  ResetFlashcardsRequest,
} from '../../../../core/api/flashcards/flashcards.models';

export interface StudyDeck {
  title: string;
  kicker: string;
  listQuery: ListFlashcardsQuery;
  resetBody: ResetFlashcardsRequest;
  /** Direct-card decks have no direct-only reset; the body clears the whole category. */
  resetsWholeCategory: boolean;
  resetLabel: string;
  resetConfirm: string;
  newCardParams: { categoryId: string; subcategoryId?: string };
}

const WHOLE_CATEGORY_CONFIRM =
  'ამ კატეგორიის ცნობილი ბარათები, ქვეკატეგორიების ჩათვლით, თქვენთვის უცნობი გახდება. ბარათები არ იშლება.';

/**
 * The deck named by the study-page query. `null` when the id is not in the tree
 * (an empty card list is a different case and is not decided here).
 * A `subcategoryId` wins over `categoryId`.
 */
export function findStudyDeck(
  categories: readonly FlashcardCategory[],
  params: { categoryId?: string | null; subcategoryId?: string | null; direct: boolean },
): StudyDeck | null {
  const subcategoryId = params.subcategoryId || undefined;
  if (subcategoryId) {
    for (const category of categories) {
      const subcategory = category.subcategories.find((item) => item.id === subcategoryId);
      if (!subcategory) {
        continue;
      }
      return {
        title: subcategory.name,
        kicker: category.name,
        listQuery: { subcategoryId: subcategory.id },
        resetBody: { subcategoryId: subcategory.id },
        resetsWholeCategory: false,
        resetLabel: 'ქვეკატეგორიის განულება',
        resetConfirm:
          'ამ ქვეკატეგორიის ცნობილი ბარათები თქვენთვის უცნობი გახდება. ბარათები არ იშლება.',
        newCardParams: { categoryId: category.id, subcategoryId: subcategory.id },
      };
    }
    return null;
  }

  const categoryId = params.categoryId || undefined;
  const category = categoryId ? categories.find((item) => item.id === categoryId) : undefined;
  if (!category || !categoryId) {
    return null;
  }
  if (params.direct) {
    return {
      title: category.name,
      kicker: 'ბარათები ამ კატეგორიაში',
      listQuery: { categoryId, direct: true },
      resetBody: { categoryId },
      resetsWholeCategory: true,
      resetLabel: 'მთელი კატეგორიის განულება (ქვეკატეგორიებით)',
      resetConfirm: WHOLE_CATEGORY_CONFIRM,
      newCardParams: { categoryId },
    };
  }
  return {
    title: category.name,
    kicker: 'ყველა ბარათი',
    listQuery: { categoryId },
    resetBody: { categoryId },
    resetsWholeCategory: true,
    resetLabel: 'დასტის განულება',
    resetConfirm: WHOLE_CATEGORY_CONFIRM,
    newCardParams: { categoryId },
  };
}
