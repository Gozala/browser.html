/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const idForIndex = (deck, index) => deck.getIn(['items', index, 'id']);

  const indexForId = (deck, id) =>
    deck.get('items').findIndex(item => item.get('id') == id);

  const indexOfSelected = deck =>
    indexForId(deck, deck.get('selected'));

  const indexOfNext = deck => {
    const from = indexOfSelected(deck);
    const isLast = from == deck.get('items').count() - 1;
    return isLast ? 0 : from + 1;
  }

  const indexOfPrevious = deck => {
    const from = indexOfSelected(deck);
    const isFirst = from == 0;
    return isFirst ? deck.get('items').count() - 1 : from - 1;
  }

  const select = (deck, id) => deck.set('selected', id);
  select.for = deck => id => select(deck, id);

  const selectByIndex = (deck, index) =>
    select(deck, idForIndex(deck, index));

  // Takes `items` and select item next to currently selected one,
  // unless it's last one in which case it selects the first item.
  // If only item is contained nothing happens.
  const selectNext = deck => selectByIndex(deck, indexOfNext(deck));
  selectNext.for = deck => () => selectNext(deck);

  // Takes `items` and selects item previous to currently selected one.
  // If selected item is first item, then last item is selected.
  const selectPrevious = deck => selectByIndex(deck, indexOfPrevious(deck));
  selectPrevious.for = deck => () => selectPrevious(deck);

  const remove = (deck, id) => {
    const targetIndex = indexForId(id);

    const isSelected = deck.get('selected') == id;
    const isLast = deck.get('items').last().get('id') == id;

    const selectIndex = !isSelected ? targetIndex :
                        isLast ? indexOfPrevious(deck) :
                        indexOfNext(deck);

    return deck.merge({selected: idForIndex(selectIndex),
                       items: deck.get('items').remove(targetIndex)});
  };
  remove.from = deck => id => remove(deck, id);


  const append = (deck, item) =>
    deck.set('items', deck.get('items').push(item));
  append.to = deck => item => append(deck, item);

  // Exports:

  exports.selectNext = selectNext;
  exports.selectPrevious = selectPrevious;
  exports.select = select;
  exports.remove = remove;
  exports.append = append;
  exports.indexOfSelected = indexOfSelected;
});
