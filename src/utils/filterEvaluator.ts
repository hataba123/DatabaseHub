import { FilterCondition } from '@/types/table';

export const evaluateCondition = (item: Record<string, any>, condition: FilterCondition): boolean => {
  const { field, operator, value, value2 } = condition;
  const itemVal = item[field];

  if (itemVal === undefined || itemVal === null) {
    if (operator === 'isEmpty') return true;
    if (operator === 'isNotEmpty') return false;
    return false;
  }

  const strItemVal = String(itemVal).toLowerCase();
  const strTargetVal = String(value ?? '').toLowerCase();

  switch (operator) {
    // String operators
    case 'equals':
      return strItemVal === strTargetVal;
    case 'notEquals':
      return strItemVal !== strTargetVal;
    case 'contains':
      return strItemVal.includes(strTargetVal);
    case 'startsWith':
      return strItemVal.startsWith(strTargetVal);
    case 'endsWith':
      return strItemVal.endsWith(strTargetVal);
    case 'isEmpty':
      return strItemVal.trim() === '';
    case 'isNotEmpty':
      return strItemVal.trim() !== '';

    // Number operators
    case 'eq':
      return Number(itemVal) === Number(value);
    case 'neq':
      return Number(itemVal) !== Number(value);
    case 'gt':
      return Number(itemVal) > Number(value);
    case 'gte':
      return Number(itemVal) >= Number(value);
    case 'lt':
      return Number(itemVal) < Number(value);
    case 'lte':
      return Number(itemVal) <= Number(value);
    case 'between':
      return (
        Number(itemVal) >= Number(value) &&
        Number(itemVal) <= Number(value2 ?? value)
      );

    // Boolean operators
    case 'isTrue':
      return itemVal === true || strItemVal === 'true' || itemVal === 1;
    case 'isFalse':
      return itemVal === false || strItemVal === 'false' || itemVal === 0;

    // Date operators
    case 'dateEquals':
      return strItemVal.startsWith(String(value ?? '').substring(0, 10));
    case 'dateBefore':
      return new Date(itemVal).getTime() < new Date(value).getTime();
    case 'dateAfter':
      return new Date(itemVal).getTime() > new Date(value).getTime();
    case 'dateBetween':
      return (
        new Date(itemVal).getTime() >= new Date(value).getTime() &&
        new Date(itemVal).getTime() <= new Date(value2 ?? value).getTime()
      );

    default:
      return true;
  }
};

export const applyFilters = <T extends Record<string, any>>(
  items: T[],
  filters?: FilterCondition[]
): T[] => {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) =>
    filters.every((condition) => evaluateCondition(item, condition))
  );
};
